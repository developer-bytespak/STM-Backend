import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLsmDto } from './dto/create-lsm.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { BanProviderDto } from './dto/ban-provider.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get LSM-approved service requests pending admin approval
   */
  async getPendingServiceRequests() {
    const requests = await this.prisma.service_requests.findMany({
      where: {
        lsm_approved: true,
        admin_approved: false,
        final_status: 'pending',
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
            local_service_manager: {
              include: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { lsm_reviewed_at: 'desc' },
    });

    return requests.map((req) => ({
      id: req.id,
      serviceName: req.service_name,
      category: req.category,
      description: req.description,
      questions_json: req.questions_json,
      region: req.region,
      provider: {
        id: req.provider.id,
        businessName: req.provider.business_name,
        user: req.provider.user,
      },
      lsm: {
        name: `${req.provider.local_service_manager.user.first_name} ${req.provider.local_service_manager.user.last_name}`,
        region: req.provider.local_service_manager.region,
      },
      lsm_reviewed_at: req.lsm_reviewed_at,
      created_at: req.created_at,
    }));
  }

  /**
   * Approve service request and create the service
   */
  async approveServiceRequest(userId: number, requestId: number) {
    const request = await this.prisma.service_requests.findUnique({
      where: { id: requestId },
      include: {
        provider: {
          include: { user: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    if (!request.lsm_approved) {
      throw new BadRequestException('LSM must approve first');
    }

    if (request.admin_approved) {
      throw new BadRequestException('Request already approved by admin');
    }

    // Check if service with same name/category already exists
    const existingService = await this.prisma.services.findFirst({
      where: {
        name: { equals: request.service_name, mode: 'insensitive' },
        category: { equals: request.category, mode: 'insensitive' },
      },
    });

    if (existingService) {
      throw new ConflictException(
        'Service with this name and category already exists',
      );
    }

    // Create service and link provider in transaction
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create service
      const newService = await tx.services.create({
        data: {
          name: request.service_name,
          category: request.category,
          description: request.description,
          questions_json: request.questions_json,
          status: 'approved',
        },
      });

      // 2. Link provider to service
      await tx.provider_services.create({
        data: {
          provider_id: request.provider_id,
          service_id: newService.id,
          is_active: true,
        },
      });

      // 3. Update service request
      await tx.service_requests.update({
        where: { id: requestId },
        data: {
          admin_approved: true,
          admin_reviewed_by: userId,
          admin_reviewed_at: new Date(),
          final_status: 'approved',
          created_service_id: newService.id,
          reviewed: true,
        },
      });

      // 4. Notify provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: request.provider.user_id,
          type: 'system',
          title: 'Service Request Approved',
          message: `Your request for "${request.service_name}" has been approved! You can now receive bookings for this service.`,
        },
      });

      return {
        service: {
          id: newService.id,
          name: newService.name,
          category: newService.category,
        },
        message: 'Service created and provider linked successfully',
      };
    });
  }

  /**
   * Reject service request
   */
  async rejectServiceRequest(userId: number, requestId: number, reason: string) {
    const request = await this.prisma.service_requests.findUnique({
      where: { id: requestId },
      include: {
        provider: { include: { user: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    // Update request
    const updated = await this.prisma.service_requests.update({
      where: { id: requestId },
      data: {
        final_status: 'rejected',
        admin_reviewed_by: userId,
        admin_reviewed_at: new Date(),
        admin_rejection_reason: reason,
        reviewed: true,
      },
    });

    // Notify provider
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'service_provider',
        recipient_id: request.provider.user_id,
        type: 'system',
        title: 'Service Request Rejected',
        message: `Your request for "${request.service_name}" was rejected by admin. Reason: ${reason}`,
      },
    });

    return {
      id: updated.id,
      status: 'rejected',
      reason,
      message: 'Service request rejected',
    };
  }

  /**
   * Get all services
   */
  async getAllServices() {
    const services = await this.prisma.services.findMany({
      include: {
        _count: {
          select: {
            provider_services: {
              where: {
                is_active: true,
                provider: { status: 'active' },
              },
            },
            jobs: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      description: service.description,
      status: service.status,
      is_popular: service.is_popular,
      activeProviders: service._count.provider_services,
      totalJobs: service._count.jobs,
      created_at: service.created_at,
    }));
  }

  /**
   * Update a service
   */
  async updateService(serviceId: number, dto: UpdateServiceDto) {
    const service = await this.prisma.services.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const updated = await this.prisma.services.update({
      where: { id: serviceId },
      data: dto,
    });

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      description: updated.description,
      is_popular: updated.is_popular,
      updated_at: updated.updated_at,
      message: 'Service updated successfully',
    };
  }

  /**
   * Delete a service (soft delete - set status to rejected)
   */
  async deleteService(serviceId: number) {
    const service = await this.prisma.services.findUnique({
      where: { id: serviceId },
      include: {
        provider_services: true,
        jobs: { where: { status: { in: ['new', 'in_progress'] } } },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if there are active jobs
    if (service.jobs.length > 0) {
      throw new BadRequestException(
        'Cannot delete service with active jobs. Please wait for jobs to complete.',
      );
    }

    // Soft delete - set status to rejected and deactivate provider links
    await this.prisma.$transaction(async (tx) => {
      // Deactivate all provider links
      await tx.provider_services.updateMany({
        where: { service_id: serviceId },
        data: { is_active: false },
      });

      // Update service status
      await tx.services.update({
        where: { id: serviceId },
        data: { status: 'rejected' },
      });
    });

    return {
      id: serviceId,
      message: 'Service deactivated successfully',
    };
  }

  /**
   * Create a new LSM
   */
  async createLsm(dto: CreateLsmDto) {
    // Check if email already exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if LSM already exists for this region
    const existingLsm = await this.prisma.local_service_managers.findFirst({
      where: { region: dto.region },
    });

    if (existingLsm) {
      throw new ConflictException(`LSM already exists for region: ${dto.region}`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user and LSM in transaction
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          first_name: dto.firstName,
          last_name: dto.lastName,
          phone_number: dto.phoneNumber,
          role: 'local_service_manager',
        },
      });

      const lsm = await tx.local_service_managers.create({
        data: {
          user_id: user.id,
          region: dto.region,
          status: 'active',
        },
      });

      return {
        id: lsm.id,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        region: lsm.region,
        status: lsm.status,
        message: 'LSM created successfully',
      };
    });
  }

  /**
   * Ban a service provider (admin final approval)
   */
  async banProvider(userId: number, providerId: number, dto: BanProviderDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        jobs: { where: { status: { in: ['new', 'in_progress'] } } },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.status === 'banned') {
      throw new BadRequestException('Provider is already banned');
    }

    // Check if there are active jobs
    if (provider.jobs.length > 0) {
      throw new BadRequestException(
        `Cannot ban provider with ${provider.jobs.length} active jobs. Please wait for jobs to complete.`,
      );
    }

    // Ban provider
    const updated = await this.prisma.service_providers.update({
      where: { id: providerId },
      data: {
        status: 'banned',
        rejection_reason: dto.reason,
      },
    });

    // Notify provider
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'service_provider',
        recipient_id: provider.user_id,
        type: 'system',
        title: 'Account Suspended',
        message: `Your account has been suspended. Reason: ${dto.reason}`,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      reason: dto.reason,
      message: 'Provider banned successfully',
    };
  }

  /**
   * Unban a service provider
   */
  async unbanProvider(providerId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.status !== 'banned') {
      throw new BadRequestException('Provider is not banned');
    }

    // Unban provider
    const updated = await this.prisma.service_providers.update({
      where: { id: providerId },
      data: {
        status: 'active',
        rejection_reason: null,
      },
    });

    // Notify provider
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'service_provider',
        recipient_id: provider.user_id,
        type: 'system',
        title: 'Account Reactivated',
        message: 'Your account has been reactivated. You can now receive jobs again.',
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      message: 'Provider unbanned successfully',
    };
  }
}
