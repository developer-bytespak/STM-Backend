import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLsmDto } from './dto/create-lsm.dto';
import { UpdateLsmDto } from './dto/update-lsm.dto';
import { ReplaceLsmDto } from './dto/replace-lsm.dto';
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
   * Get all LSMs
   */
  async getAllLsms() {
    const lsms = await this.prisma.local_service_managers.findMany({
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            created_at: true,
            last_login: true,
          },
        },
        _count: {
          select: {
            service_providers: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return lsms.map((lsm) => ({
      id: lsm.id,
      name: `${lsm.user.first_name} ${lsm.user.last_name}`,
      email: lsm.user.email,
      phoneNumber: lsm.user.phone_number,
      region: lsm.region,
      status: lsm.status,
      providerCount: lsm._count.service_providers,
      closedDealsCount: lsm.closed_deals_count || 0,
      earnings: lsm.earnings ? Number(lsm.earnings) : 0,
      lastLogin: lsm.user.last_login,
      createdAt: lsm.created_at,
    }));
  }

  /**
   * Get LSM by ID with detailed stats
   */
  async getLsmById(lsmId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { id: lsmId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            created_at: true,
            last_login: true,
          },
        },
        service_providers: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
            _count: {
              select: {
                jobs: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 10, // Latest 10 providers
        },
      },
    });

    if (!lsm) {
      throw new NotFoundException('LSM not found');
    }

    // Get additional statistics
    const totalJobs = await this.prisma.jobs.count({
      where: {
        service_provider: {
          lsm_id: lsmId,
        },
      },
    });

    const serviceRequestsReviewed = await this.prisma.service_requests.count({
      where: {
        lsm_reviewed_by: lsm.user_id,
      },
    });

    const documentsVerified = await this.prisma.provider_documents.count({
      where: {
        verified_by: lsm.user_id,
        status: 'verified',
      },
    });

    return {
      id: lsm.id,
      name: `${lsm.user.first_name} ${lsm.user.last_name}`,
      email: lsm.user.email,
      phoneNumber: lsm.user.phone_number,
      region: lsm.region,
      status: lsm.status,
      providerCount: lsm.service_providers.length,
      totalJobs,
      closedDealsCount: lsm.closed_deals_count || 0,
      earnings: lsm.earnings ? Number(lsm.earnings) : 0,
      serviceRequestsReviewed,
      documentsVerified,
      lastLogin: lsm.user.last_login,
      createdAt: lsm.created_at,
      updatedAt: lsm.updated_at,
      providers: lsm.service_providers.map((provider) => ({
        id: provider.id,
        businessName: provider.business_name,
        status: provider.status,
        rating: Number(provider.rating),
        totalJobs: provider._count.jobs,
        user: provider.user,
      })),
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
   * Replace LSM - Creates new LSM, reassigns providers, handles old LSM
   * This is a streamlined API for LSM replacement
   */
  async replaceLsm(oldLsmId: number, dto: ReplaceLsmDto) {
    // Find old LSM
    const oldLsm = await this.prisma.local_service_managers.findUnique({
      where: { id: oldLsmId },
      include: {
        user: true,
        service_providers: {
          where: { status: { in: ['active', 'pending'] } },
          include: {
            user: true,
          },
        },
      },
    });

    if (!oldLsm) {
      throw new NotFoundException('LSM not found');
    }

    // Validate new LSM email doesn't exist
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.newLsmEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // If reassigning old LSM, validate new region
    if (dto.oldLsmAction === 'reassign') {
      if (!dto.newRegionForOldLsm) {
        throw new BadRequestException(
          'newRegionForOldLsm is required when oldLsmAction is "reassign"',
        );
      }

      // Check if new region already has an LSM
      const existingLsmInNewRegion =
        await this.prisma.local_service_managers.findFirst({
          where: { region: dto.newRegionForOldLsm },
        });

      if (existingLsmInNewRegion) {
        throw new ConflictException(
          `Region "${dto.newRegionForOldLsm}" already has an LSM`,
        );
      }
    }

    // Hash password for new LSM
    const hashedPassword = await bcrypt.hash(dto.newLsmPassword, 12);

    // Execute replacement in transaction
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create new LSM user
      const newUser = await tx.users.create({
        data: {
          email: dto.newLsmEmail,
          password: hashedPassword,
          first_name: dto.newLsmFirstName,
          last_name: dto.newLsmLastName,
          phone_number: dto.newLsmPhoneNumber,
          role: 'local_service_manager',
        },
      });

      // 2. Create new LSM profile (same region as old LSM)
      const newLsm = await tx.local_service_managers.create({
        data: {
          user_id: newUser.id,
          region: oldLsm.region,
          status: 'active',
        },
      });

      // 3. Reassign ALL providers from old LSM to new LSM
      const reassignedCount = await tx.service_providers.updateMany({
        where: { lsm_id: oldLsmId },
        data: { lsm_id: newLsm.id },
      });

      // 4. Notify all reassigned providers about LSM change
      for (const provider of oldLsm.service_providers) {
        await tx.notifications.create({
          data: {
            recipient_type: 'service_provider',
            recipient_id: provider.user_id,
            type: 'system',
            title: 'LSM Changed',
            message: `Your Local Service Manager has been changed from ${oldLsm.user.first_name} ${oldLsm.user.last_name} to ${dto.newLsmFirstName} ${dto.newLsmLastName}. Your new LSM contact: ${dto.newLsmEmail}`,
          },
        });
      }

      // 5. Handle old LSM based on action
      let oldLsmResult: any = {};

      if (dto.oldLsmAction === 'delete' || dto.oldLsmAction === 'deactivate') {
        // Deactivate old LSM
        const updatedOldLsm = await tx.local_service_managers.update({
          where: { id: oldLsmId },
          data: {
            status: 'inactive',
          },
        });

        // Notify old LSM
        await tx.notifications.create({
          data: {
            recipient_type: 'local_service_manager',
            recipient_id: oldLsm.user_id,
            type: 'system',
            title: 'Account Deactivated',
            message: `Your LSM account has been deactivated. A new LSM has been appointed for ${oldLsm.region} region.`,
          },
        });

        oldLsmResult = {
          action: 'deactivated',
          status: updatedOldLsm.status,
        };
      } else if (dto.oldLsmAction === 'reassign') {
        // Reassign old LSM to new region
        const updatedOldLsm = await tx.local_service_managers.update({
          where: { id: oldLsmId },
          data: {
            region: dto.newRegionForOldLsm,
            status: 'active', // Keep active in new region
          },
        });

        // Notify old LSM about reassignment
        await tx.notifications.create({
          data: {
            recipient_type: 'local_service_manager',
            recipient_id: oldLsm.user_id,
            type: 'system',
            title: 'Region Reassignment',
            message: `You have been reassigned from ${oldLsm.region} to ${dto.newRegionForOldLsm} region. Your account remains active.`,
          },
        });

        oldLsmResult = {
          action: 'reassigned',
          newRegion: updatedOldLsm.region,
          status: updatedOldLsm.status,
        };
      }

      return {
        message: 'LSM replaced successfully',
        newLsm: {
          id: newLsm.id,
          name: `${dto.newLsmFirstName} ${dto.newLsmLastName}`,
          email: dto.newLsmEmail,
          region: newLsm.region,
          status: newLsm.status,
        },
        oldLsm: {
          id: oldLsmId,
          name: `${oldLsm.user.first_name} ${oldLsm.user.last_name}`,
          ...oldLsmResult,
        },
        providersReassigned: reassignedCount.count,
        notificationsSent: oldLsm.service_providers.length,
      };
    });
  }

  /**
   * Update LSM information
   */
  async updateLsm(lsmId: number, dto: UpdateLsmDto) {
    // Find LSM
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { id: lsmId },
      include: { user: true },
    });

    if (!lsm) {
      throw new NotFoundException('LSM not found');
    }

    // If changing region, check if another LSM exists in that region
    if (dto.region && dto.region !== lsm.region) {
      // Check if target region already has an LSM
      const existingLsmInTargetRegion = await this.prisma.local_service_managers.findFirst({
        where: {
          region: dto.region,
          id: { not: lsmId }, // Exclude current LSM
          status: 'active',
        },
      });

      if (existingLsmInTargetRegion) {
        throw new ConflictException(
          `Another LSM already exists for region: ${dto.region}`,
        );
      }

      // Check if current region will have another LSM after this one leaves
      const otherLsmInCurrentRegion = await this.prisma.local_service_managers.findFirst({
        where: {
          region: lsm.region,
          id: { not: lsmId },
          status: 'active',
        },
      });

      if (!otherLsmInCurrentRegion) {
        throw new BadRequestException(
          `Cannot change region. "${lsm.region}" will have no LSM after this change. Please create a replacement LSM for "${lsm.region}" first, or use the Replace LSM API.`,
        );
      }
    }

    // If changing email, check if email is available
    if (dto.email && dto.email !== lsm.user.email) {
      const existingUser = await this.prisma.users.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Prepare user update data
    const userUpdateData: any = {};
    if (dto.firstName) userUpdateData.first_name = dto.firstName;
    if (dto.lastName) userUpdateData.last_name = dto.lastName;
    if (dto.email) userUpdateData.email = dto.email;
    if (dto.phoneNumber) userUpdateData.phone_number = dto.phoneNumber;
    if (dto.password) {
      userUpdateData.password = await bcrypt.hash(dto.password, 12);
    }

    // Prepare LSM update data
    const lsmUpdateData: any = {};
    if (dto.region) lsmUpdateData.region = dto.region;
    if (dto.status) lsmUpdateData.status = dto.status;

    // Update in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Update user info if provided
      if (Object.keys(userUpdateData).length > 0) {
        await tx.users.update({
          where: { id: lsm.user_id },
          data: userUpdateData,
        });
      }

      // Update LSM info if provided
      if (Object.keys(lsmUpdateData).length > 0) {
        await tx.local_service_managers.update({
          where: { id: lsmId },
          data: lsmUpdateData,
        });
      }

      // Fetch updated LSM and user info
      const updatedLsm = await tx.local_service_managers.findUnique({
        where: { id: lsmId },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone_number: true,
            },
          },
        },
      });

      return {
        id: updatedLsm.id,
        user: {
          id: updatedLsm.user.id,
          firstName: updatedLsm.user.first_name,
          lastName: updatedLsm.user.last_name,
          email: updatedLsm.user.email,
          phoneNumber: updatedLsm.user.phone_number,
        },
        region: updatedLsm.region,
        status: updatedLsm.status,
        message: 'LSM updated successfully',
      };
    });
  }

  /**
   * Deactivate/Delete LSM
   * Rules:
   * 1. Cannot delete if LSM is the only one managing their region
   * 2. Admin must first appoint another LSM to the region
   * 3. Then can reassign old LSM to another region OR delete
   * 4. Ensures only 1 LSM per region at all times
   */
  async deleteLsm(lsmId: number) {
    // Find LSM
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { id: lsmId },
      include: {
        service_providers: {
          where: {
            status: { in: ['active', 'pending'] },
          },
        },
      },
    });

    if (!lsm) {
      throw new NotFoundException('LSM not found');
    }

    // RULE 1: Check if this is the only LSM for the region
    if (lsm.region) {
      const otherLsmInRegion = await this.prisma.local_service_managers.findFirst(
        {
          where: {
            region: lsm.region,
            id: { not: lsmId },
            status: 'active',
          },
        },
      );

      if (!otherLsmInRegion) {
        throw new BadRequestException(
          `Cannot delete LSM for region "${lsm.region}". This is the only LSM managing this region.\n\nOptions:\n1. Create a new LSM for "${lsm.region}" region first\n2. Reassign this LSM to another region using PUT /admin/lsms/${lsmId}`,
        );
      }
    }

    // RULE 2: Check if LSM still has active or pending providers
    if (lsm.service_providers.length > 0) {
      throw new BadRequestException(
        `Cannot delete LSM with ${lsm.service_providers.length} active/pending providers. Please reassign these providers to another LSM first.`,
      );
    }

    // Soft delete - set status to inactive
    const updated = await this.prisma.local_service_managers.update({
      where: { id: lsmId },
      data: {
        status: 'inactive',
      },
    });

    // Notify LSM
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'local_service_manager',
        recipient_id: lsm.user_id,
        type: 'system',
        title: 'Account Deactivated',
        message: 'Your LSM account has been deactivated by an administrator.',
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      region: lsm.region,
      message: 'LSM deactivated successfully',
    };
  }

  /**
   * Get all providers with filters and pagination
   */
  async getAllProviders(filters: {
    search?: string;
    region?: string;
    status?: string;
    minRating?: number;
    maxRating?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search,
      region,
      status,
      minRating,
      maxRating,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    // Build where clause
    const where: any = {};

    // Search by business name, user name, or email
    if (search) {
      where.OR = [
        { business_name: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Filter by region (through LSM)
    if (region) {
      where.local_service_manager = {
        region: { contains: region, mode: 'insensitive' },
      };
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by rating range
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    // Get total count for pagination
    const total = await this.prisma.service_providers.count({ where });

    // Get providers with pagination
    const providers = await this.prisma.service_providers.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            last_login: true,
            created_at: true,
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
        _count: {
          select: {
            jobs: true,
            provider_services: { where: { is_active: true } },
            documents: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: providers.map((provider) => ({
        id: provider.id,
        businessName: provider.business_name,
        owner: {
          id: provider.user.id,
          name: `${provider.user.first_name} ${provider.user.last_name}`,
          email: provider.user.email,
          phoneNumber: provider.user.phone_number,
        },
        status: provider.status,
        rating: Number(provider.rating),
        location: provider.location,
        zipcode: provider.zipcode,
        experience: provider.experience,
        tier: provider.tier,
        totalJobs: provider._count.jobs,
        activeServices: provider._count.provider_services,
        documentsCount: provider._count.documents,
        lsm: {
          id: provider.local_service_manager.id,
          name: `${provider.local_service_manager.user.first_name} ${provider.local_service_manager.user.last_name}`,
          region: provider.local_service_manager.region,
        },
        earnings: Number(provider.earning),
        warnings: provider.warnings,
        lastLogin: provider.user.last_login,
        createdAt: provider.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get provider by ID with detailed information
   */
  async getProviderById(providerId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            last_login: true,
            created_at: true,
            is_email_verified: true,
          },
        },
        local_service_manager: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        provider_services: {
          where: { is_active: true },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            file_name: true,
            description: true,
            status: true,
            verified_at: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
        jobs: {
          select: {
            id: true,
            status: true,
            price: true,
            created_at: true,
            completed_at: true,
            service: {
              select: {
                name: true,
                category: true,
              },
            },
            customer: {
              select: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 20, // Latest 20 jobs
        },
        feedbacks: {
          select: {
            id: true,
            rating: true,
            feedback: true,
            created_at: true,
            customer: {
              select: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 10, // Latest 10 reviews
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Calculate statistics
    const completedJobs = provider.jobs.filter(
      (job) => job.status === 'completed',
    ).length;
    const cancelledJobs = provider.jobs.filter(
      (job) => job.status === 'cancelled',
    ).length;
    const activeJobs = provider.jobs.filter((job) =>
      ['new', 'in_progress'].includes(job.status),
    ).length;

    const totalRevenue = provider.jobs
      .filter((job) => job.status === 'completed')
      .reduce((sum, job) => sum + Number(job.price), 0);

    const averageJobValue =
      completedJobs > 0 ? totalRevenue / completedJobs : 0;

    const averageRating =
      provider.feedbacks.length > 0
        ? provider.feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
          provider.feedbacks.length
        : 0;

    return {
      id: provider.id,
      businessName: provider.business_name,
      owner: {
        id: provider.user.id,
        name: `${provider.user.first_name} ${provider.user.last_name}`,
        email: provider.user.email,
        phoneNumber: provider.user.phone_number,
        isEmailVerified: provider.user.is_email_verified,
        lastLogin: provider.user.last_login,
        joinedAt: provider.user.created_at,
      },
      status: provider.status,
      rating: Number(provider.rating),
      location: provider.location,
      zipcode: provider.zipcode,
      experience: provider.experience,
      experienceLevel: provider.experience_level,
      description: provider.description,
      tier: provider.tier,
      minPrice: provider.min_price ? Number(provider.min_price) : null,
      maxPrice: provider.max_price ? Number(provider.max_price) : null,
      earnings: Number(provider.earning),
      warnings: provider.warnings,
      rejectionReason: provider.rejection_reason,
      approvedAt: provider.approved_at,
      createdAt: provider.created_at,
      updatedAt: provider.updated_at,
      lsm: {
        id: provider.local_service_manager.id,
        name: `${provider.local_service_manager.user.first_name} ${provider.local_service_manager.user.last_name}`,
        email: provider.local_service_manager.user.email,
        region: provider.local_service_manager.region,
      },
      statistics: {
        totalJobs: provider.jobs.length,
        completedJobs,
        cancelledJobs,
        activeJobs,
        totalRevenue,
        averageJobValue,
        averageRating,
        totalReviews: provider.feedbacks.length,
      },
      services: provider.provider_services.map((ps) => ({
        id: ps.service.id,
        name: ps.service.name,
        category: ps.service.category,
        addedAt: ps.created_at,
      })),
      documents: provider.documents.map((doc) => ({
        id: doc.id,
        fileName: doc.file_name,
        description: doc.description,
        status: doc.status,
        verifiedAt: doc.verified_at,
        uploadedAt: doc.created_at,
      })),
      recentJobs: provider.jobs.map((job) => ({
        id: job.id,
        status: job.status,
        service: job.service.name,
        category: job.service.category,
        price: Number(job.price),
        customer: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        createdAt: job.created_at,
        completedAt: job.completed_at,
      })),
      recentReviews: provider.feedbacks.map((feedback) => ({
        id: feedback.id,
        rating: feedback.rating,
        feedback: feedback.feedback,
        customer: `${feedback.customer.user.first_name} ${feedback.customer.user.last_name}`,
        createdAt: feedback.created_at,
      })),
    };
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

    // Cannot ban pending providers - they should be rejected via document rejection instead
    if (provider.status === 'pending') {
      throw new BadRequestException(
        'Cannot ban pending providers. Please reject their documents to prevent activation, or wait until they are active/inactive.',
      );
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

  // ==================== DASHBOARD ====================

  /**
   * Get admin dashboard overview with all key statistics
   */
  async getDashboard() {
    // Execute all queries in parallel for better performance
    const [
      lsmStats,
      providerStats,
      customerCount,
      jobStats,
      revenue,
      pendingServiceRequests,
      pendingDisputes,
      recentActivity,
      topRegions,
    ] = await Promise.all([
      // 1. LSM Statistics
      this.prisma.local_service_managers.groupBy({
        by: ['status'],
        _count: true,
      }),

      // 2. Provider Statistics
      this.prisma.service_providers.groupBy({
        by: ['status'],
        _count: true,
      }),

      // 3. Total Customers
      this.prisma.customers.count(),

      // 4. Job Statistics
      this.prisma.jobs.groupBy({
        by: ['status'],
        _count: true,
      }),

      // 5. Total Revenue (paid jobs)
      this.prisma.jobs.aggregate({
        where: { status: 'paid' },
        _sum: { price: true },
      }),

      // 6. Pending Service Requests
      this.prisma.service_requests.count({
        where: {
          lsm_approved: true,
          admin_approved: false,
          final_status: 'pending',
        },
      }),

      // 7. Pending Disputes
      this.prisma.disputes.count({
        where: { status: 'pending' },
      }),

      // 8. Recent Activity (last 24 hours)
      this.getRecentActivity(),

      // 9. Top 5 Regions
      this.getTopRegions(),
    ]);

    // Process LSM stats
    const lsmCounts = { active: 0, inactive: 0 };
    lsmStats.forEach((stat) => {
      lsmCounts[stat.status] = stat._count;
    });

    // Process Provider stats
    const providerCounts = { pending: 0, active: 0, inactive: 0, banned: 0 };
    providerStats.forEach((stat) => {
      providerCounts[stat.status] = stat._count;
    });

    // Process Job stats
    const jobCounts = {
      new: 0,
      in_progress: 0,
      completed: 0,
      paid: 0,
      cancelled: 0,
      rejected_by_sp: 0,
    };
    jobStats.forEach((stat) => {
      jobCounts[stat.status] = stat._count;
    });

    const totalLSMs = lsmCounts.active + lsmCounts.inactive;
    const totalProviders =
      providerCounts.pending +
      providerCounts.active +
      providerCounts.inactive +
      providerCounts.banned;
    const totalJobs = Object.values(jobCounts).reduce((sum, count) => sum + count, 0);

    return {
      summary: {
        totalLSMs,
        totalProviders,
        totalCustomers: customerCount,
        totalJobs,
        totalRevenue: revenue._sum.price ? Number(revenue._sum.price) : 0,
      },
      lsms: lsmCounts,
      providers: providerCounts,
      jobs: jobCounts,
      pendingActions: {
        serviceRequests: pendingServiceRequests,
        disputes: pendingDisputes,
      },
      recentActivity,
      topRegions,
    };
  }

  /**
   * Get recent activity statistics (last 24 hours)
   */
  private async getRecentActivity() {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [newJobs, completedJobs, newProviders, newCustomers] =
      await Promise.all([
        this.prisma.jobs.count({
          where: { created_at: { gte: last24Hours } },
        }),
        this.prisma.jobs.count({
          where: {
            status: 'completed',
            completed_at: { gte: last24Hours },
          },
        }),
        this.prisma.service_providers.count({
          where: { created_at: { gte: last24Hours } },
        }),
        this.prisma.customers.count({
          where: { created_at: { gte: last24Hours } },
        }),
      ]);

    return {
      newJobs24h: newJobs,
      completedJobs24h: completedJobs,
      newProviders24h: newProviders,
      newCustomers24h: newCustomers,
    };
  }

  /**
   * Get top 5 regions by job count
   */
  private async getTopRegions() {
    const lsms = await this.prisma.local_service_managers.findMany({
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
        service_providers: {
          include: {
            jobs: {
              where: { status: 'paid' },
              select: { price: true },
            },
          },
        },
      },
    });

    const regions = lsms.map((lsm) => {
      const providersCount = lsm.service_providers.length;
      const jobsCount = lsm.service_providers.reduce(
        (sum, provider) => sum + provider.jobs.length,
        0,
      );
      const revenue = lsm.service_providers.reduce(
        (sum, provider) =>
          sum +
          provider.jobs.reduce((jobSum, job) => jobSum + Number(job.price), 0),
        0,
      );

      return {
        region: lsm.region,
        lsmName: `${lsm.user.first_name} ${lsm.user.last_name}`,
        providersCount,
        jobsCount,
        revenue,
      };
    });

    // Sort by revenue and return top 5
    return regions.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }

  // ==================== CUSTOMER MANAGEMENT ====================

  /**
   * Get all customers with filters
   */
  async getAllCustomers(filters: {
    search?: string;
    region?: string;
    minJobs?: number;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      region,
      minJobs,
      status,
      page = 1,
      limit = 20,
    } = filters;

    // Enforce max limit
    const finalLimit = Math.min(limit, 100);

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (region) {
      where.region = { contains: region, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await this.prisma.customers.count({ where });

    // Get customers with pagination
    const customers = await this.prisma.customers.findMany({
      where,
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            created_at: true,
          },
        },
        jobs: {
          select: {
            id: true,
            status: true,
            price: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    // Process and calculate stats for each customer
    let data = customers.map((customer) => {
      const totalJobs = customer.jobs.length;
      const completedJobs = customer.jobs.filter(
        (job) => job.status === 'completed' || job.status === 'paid',
      ).length;
      const activeJobs = customer.jobs.filter((job) =>
        ['new', 'in_progress'].includes(job.status),
      ).length;
      const totalSpent = customer.jobs
        .filter((job) => job.status === 'paid')
        .reduce((sum, job) => sum + Number(job.price), 0);
      const averageJobValue = completedJobs > 0 ? totalSpent / completedJobs : 0;
      const lastJob = customer.jobs.sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime(),
      )[0];

      return {
        id: customer.id,
        name: `${customer.user.first_name} ${customer.user.last_name}`,
        email: customer.user.email,
        phone: customer.user.phone_number,
        region: customer.region,
        zipcode: customer.zipcode || 'N/A',
        status: customer.status,
        totalJobs,
        completedJobs,
        activeJobs,
        totalSpent,
        averageJobValue: Number(averageJobValue.toFixed(2)),
        lastJobDate: lastJob ? lastJob.created_at : null,
        joinedAt: customer.user.created_at,
      };
    });

    // Filter by minJobs if provided (in-memory filter)
    if (minJobs !== undefined) {
      data = data.filter((customer) => customer.totalJobs >= minJobs);
    }

    return {
      data,
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  /**
   * Get customer by ID with detailed information
   */
  async getCustomerById(customerId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { id: customerId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            created_at: true,
            last_login: true,
            is_email_verified: true,
          },
        },
        jobs: {
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
            service_provider: {
              select: {
                business_name: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 20, // Recent 20 jobs
        },
        feedbacks: {
          select: {
            id: true,
            rating: true,
            feedback: true,
            created_at: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Calculate statistics
    const totalJobs = customer.jobs.length;
    const completedJobs = customer.jobs.filter(
      (job) => job.status === 'completed' || job.status === 'paid',
    ).length;
    const cancelledJobs = customer.jobs.filter(
      (job) => job.status === 'cancelled',
    ).length;
    const activeJobs = customer.jobs.filter((job) =>
      ['new', 'in_progress'].includes(job.status),
    ).length;
    const totalSpent = customer.jobs
      .filter((job) => job.status === 'paid')
      .reduce((sum, job) => sum + Number(job.price), 0);
    const averageJobValue = completedJobs > 0 ? totalSpent / completedJobs : 0;

    return {
      customer: {
        id: customer.id,
        name: `${customer.user.first_name} ${customer.user.last_name}`,
        email: customer.user.email,
        phone: customer.user.phone_number,
        region: customer.region,
        zipcode: customer.zipcode || 'N/A',
        address: customer.address,
        status: customer.status,
        banReason: customer.ban_reason,
        bannedAt: customer.banned_at,
        joinedAt: customer.user.created_at,
        lastLogin: customer.user.last_login,
        isEmailVerified: customer.user.is_email_verified,
      },
      statistics: {
        totalJobs,
        completedJobs,
        cancelledJobs,
        activeJobs,
        totalSpent,
        averageJobValue: Number(averageJobValue.toFixed(2)),
        feedbackGiven: customer.feedbacks.length,
      },
      recentJobs: customer.jobs.map((job) => ({
        id: job.id,
        service: job.service.name,
        category: job.service.category,
        provider: job.service_provider.business_name ||
          `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`,
        status: job.status,
        price: Number(job.price),
        createdAt: job.created_at,
        completedAt: job.completed_at,
      })),
      paymentHistory: customer.jobs
        .filter((job) => job.status === 'paid' || job.status === 'completed')
        .map((job) => ({
          jobId: job.id,
          service: job.service.name,
          amount: Number(job.price),
          paidAt: job.paid_at,
          status: job.status,
        })),
    };
  }

  /**
   * Ban a customer - cancel active jobs and notify all parties
   */
  async banCustomer(customerId: number, reason: string) {
    // 1. Find customer with active jobs
    const customer = await this.prisma.customers.findUnique({
      where: { id: customerId },
      include: {
        user: true,
        jobs: {
          where: {
            status: { in: ['new', 'in_progress'] },
          },
          include: {
            service_provider: {
              include: { user: true },
            },
            service: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.status === 'banned') {
      throw new BadRequestException('Customer is already banned');
    }

    // 2. Transaction: Ban + Cancel Jobs + Notify
    return await this.prisma.$transaction(async (tx) => {
      // a. Ban customer
      await tx.customers.update({
        where: { id: customerId },
        data: {
          status: 'banned',
          ban_reason: reason,
          banned_at: new Date(),
        },
      });

      let jobsCancelled = 0;
      const cancelledJobDetails: string[] = [];

      // b. Cancel all active jobs
      if (customer.jobs.length > 0) {
        await tx.jobs.updateMany({
          where: {
            customer_id: customerId,
            status: { in: ['new', 'in_progress'] },
          },
          data: {
            status: 'cancelled',
            rejection_reason: 'Customer account banned',
          },
        });

        jobsCancelled = customer.jobs.length;

        // c. Notify each affected provider
        for (const job of customer.jobs) {
          cancelledJobDetails.push(
            `#${job.id} (${job.service.name})`,
          );

          await tx.notifications.create({
            data: {
              recipient_type: 'service_provider',
              recipient_id: job.service_provider.user_id,
              type: 'system',
              title: 'Job Cancelled',
              message: `Job #${job.id} (${job.service.name}) has been cancelled because the customer account was suspended.`,
            },
          });
        }
      }

      // d. Notify customer
      await tx.notifications.create({
        data: {
          recipient_type: 'customer',
          recipient_id: customer.user_id,
          type: 'system',
          title: 'Account Suspended',
          message: `Your account has been suspended. Reason: ${reason}. All active bookings have been cancelled.`,
        },
      });

      const message =
        jobsCancelled > 0
          ? `Customer banned successfully. ${jobsCancelled} active job(s) cancelled: ${cancelledJobDetails.join(', ')}. ${jobsCancelled} provider(s) notified.`
          : 'Customer banned successfully. No active jobs to cancel.';

      return {
        id: customer.id,
        status: 'banned',
        reason,
        jobsCancelled,
        cancelledJobs: cancelledJobDetails,
        message,
      };
    });
  }

  /**
   * Unban a customer - reactivate account
   */
  async unbanCustomer(customerId: number) {
    // 1. Find customer
    const customer = await this.prisma.customers.findUnique({
      where: { id: customerId },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.status !== 'banned') {
      throw new BadRequestException('Customer is not banned');
    }

    // 2. Unban customer (keep cancelled jobs as history)
    await this.prisma.customers.update({
      where: { id: customerId },
      data: {
        status: 'active',
        ban_reason: null,
        banned_at: null,
      },
    });

    // 3. Notify customer
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'customer',
        recipient_id: customer.user_id,
        type: 'system',
        title: 'Account Reactivated',
        message:
          'Your account has been reactivated. You can now create new bookings.',
      },
    });

    return {
      id: customer.id,
      status: 'active',
      message:
        'Customer unbanned successfully. Previous cancelled jobs remain as history.',
    };
  }

  // ==================== DISPUTES MANAGEMENT ====================

  /**
   * Get all disputes with filters
   */
  async getAllDisputes(filters: {
    status?: string;
    region?: string;
    raisedBy?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      region,
      raisedBy,
      page = 1,
      limit = 20,
    } = filters;

    // Enforce max limit
    const finalLimit = Math.min(limit, 100);

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (raisedBy) {
      where.raised_by_type = raisedBy;
    }

    // Region filter requires join through job -> provider -> lsm
    if (region) {
      where.job = {
        service_provider: {
          local_service_manager: {
            region: { contains: region, mode: 'insensitive' },
          },
        },
      };
    }

    // Get total count
    const total = await this.prisma.disputes.count({ where });

    // Get disputes with pagination
    const disputes = await this.prisma.disputes.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            price: true,
            service: {
              select: {
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
            service_provider: {
              select: {
                id: true,
                business_name: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
                local_service_manager: {
                  select: {
                    id: true,
                    region: true,
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
        },
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }], // pending first, then by date
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    return {
      data: disputes.map((dispute) => ({
        id: dispute.id,
        job: {
          id: dispute.job.id,
          service: dispute.job.service.name,
          price: Number(dispute.job.price),
        },
        customer: {
          id: dispute.job.customer.id,
          name: `${dispute.job.customer.user.first_name} ${dispute.job.customer.user.last_name}`,
        },
        provider: {
          id: dispute.job.service_provider.id,
          businessName:
            dispute.job.service_provider.business_name ||
            `${dispute.job.service_provider.user.first_name} ${dispute.job.service_provider.user.last_name}`,
        },
        raisedBy: dispute.raised_by_type,
        status: dispute.status,
        region: dispute.job.service_provider.local_service_manager.region,
        lsm: {
          id: dispute.job.service_provider.local_service_manager.id,
          name: `${dispute.job.service_provider.local_service_manager.user.first_name} ${dispute.job.service_provider.local_service_manager.user.last_name}`,
        },
        resolvedBy: dispute.resolved_by,
        createdAt: dispute.created_at,
        resolvedAt: dispute.resolved_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  /**
   * Get dispute by ID with full details and chat history
   */
  async getDisputeById(disputeId: number) {
    const dispute = await this.prisma.disputes.findUnique({
      where: { id: disputeId },
      include: {
        job: {
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
            customer: {
              select: {
                id: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                  },
                },
              },
            },
            service_provider: {
              select: {
                id: true,
                business_name: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                  },
                },
                local_service_manager: {
                  select: {
                    id: true,
                    region: true,
                    user: {
                      select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            chats: {
              include: {
                messages: {
                  orderBy: { created_at: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Get chat history
    const chat = dispute.job.chats[0]; // Should be only one chat per job
    const chatHistory = chat
      ? chat.messages.map((msg) => ({
          id: msg.id,
          senderType: msg.sender_type,
          message: msg.message,
          messageType: msg.message_type,
          createdAt: msg.created_at,
        }))
      : [];

    return {
      dispute: {
        id: dispute.id,
        status: dispute.status,
        raisedBy: dispute.raised_by_type,
        resolvedBy: dispute.resolved_by,
        createdAt: dispute.created_at,
        resolvedAt: dispute.resolved_at,
      },
      job: {
        id: dispute.job.id,
        service: dispute.job.service.name,
        category: dispute.job.service.category,
        price: Number(dispute.job.price),
        status: dispute.job.status,
        scheduledAt: dispute.job.scheduled_at,
        completedAt: dispute.job.completed_at,
        answersJson: dispute.job.answers_json, // Include dynamic form answers
      },
      customer: {
        id: dispute.job.customer.id,
        name: `${dispute.job.customer.user.first_name} ${dispute.job.customer.user.last_name}`,
        email: dispute.job.customer.user.email,
        phone: dispute.job.customer.user.phone_number,
      },
      provider: {
        id: dispute.job.service_provider.id,
        businessName:
          dispute.job.service_provider.business_name ||
          `${dispute.job.service_provider.user.first_name} ${dispute.job.service_provider.user.last_name}`,
        ownerName: `${dispute.job.service_provider.user.first_name} ${dispute.job.service_provider.user.last_name}`,
        email: dispute.job.service_provider.user.email,
        phone: dispute.job.service_provider.user.phone_number,
      },
      lsm: {
        id: dispute.job.service_provider.local_service_manager.id,
        name: `${dispute.job.service_provider.local_service_manager.user.first_name} ${dispute.job.service_provider.local_service_manager.user.last_name}`,
        region: dispute.job.service_provider.local_service_manager.region,
        email: dispute.job.service_provider.local_service_manager.user.email,
      },
      chatHistory,
    };
  }

  // ==================== JOBS MONITORING ====================

  /**
   * Get all jobs with comprehensive filters
   */
  async getAllJobs(filters: {
    status?: string;
    region?: string;
    service?: string;
    customerId?: number;
    providerId?: number;
    minPrice?: number;
    maxPrice?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      region,
      service,
      customerId,
      providerId,
      minPrice,
      maxPrice,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = filters;

    // Enforce max limit
    const finalLimit = Math.min(limit, 100);

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customer_id = customerId;
    }

    if (providerId) {
      where.provider_id = providerId;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Date range filter
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) {
        where.created_at.gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        where.created_at.lte = endDate;
      }
    }

    // Service filter (name or category)
    if (service) {
      where.service = {
        OR: [
          { name: { contains: service, mode: 'insensitive' } },
          { category: { contains: service, mode: 'insensitive' } },
        ],
      };
    }

    // Region filter
    if (region) {
      where.service_provider = {
        local_service_manager: {
          region: { contains: region, mode: 'insensitive' },
        },
      };
    }

    // Get total count
    const total = await this.prisma.jobs.count({ where });

    // Get jobs with pagination
    const jobs = await this.prisma.jobs.findMany({
      where,
      include: {
        service: {
          select: {
            name: true,
            category: true,
          },
        },
        customer: {
          select: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        service_provider: {
          select: {
            business_name: true,
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
            local_service_manager: {
              select: {
                region: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    // Calculate summary
    const totalValue = jobs.reduce((sum, job) => sum + Number(job.price), 0);

    return {
      data: jobs.map((job) => ({
        id: job.id,
        service: job.service.name,
        category: job.service.category,
        customer: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        provider:
          job.service_provider.business_name ||
          `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`,
        status: job.status,
        price: Number(job.price),
        region: job.service_provider.local_service_manager.region,
        scheduledAt: job.scheduled_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
      summary: {
        totalJobs: total,
        totalValue,
      },
    };
  }

  // ==================== BAN REQUESTS ====================

  /**
   * Get all ban requests from LSMs
   */
  async getBanRequests(filters: {
    status?: string;
    region?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, region, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (region) {
      where.provider = {
        local_service_manager: {
          region: { contains: region, mode: 'insensitive' },
        },
      };
    }

    const total = await this.prisma.ban_requests.count({ where });

    const banRequests = await this.prisma.ban_requests.findMany({
      where,
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
            jobs: {
              where: {
                status: { in: ['new', 'in_progress'] },
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }], // pending first
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    return {
      data: banRequests.map((request) => ({
        id: request.id,
        provider: {
          id: request.provider.id,
          businessName: request.provider.business_name,
          ownerName: `${request.provider.user.first_name} ${request.provider.user.last_name}`,
          email: request.provider.user.email,
          status: request.provider.status,
          activeJobs: request.provider.jobs.length,
        },
        requestedBy: {
          lsmUserId: request.requested_by_lsm,
          lsmName: `${request.provider.local_service_manager.user.first_name} ${request.provider.local_service_manager.user.last_name}`,
          region: request.provider.local_service_manager.region,
        },
        reason: request.reason,
        status: request.status,
        adminNotes: request.admin_notes,
        reviewedBy: request.admin_reviewed_by,
        reviewedAt: request.admin_reviewed_at,
        createdAt: request.created_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  /**
   * Approve LSM ban request and ban the provider
   */
  async approveBanRequest(adminUserId: number, requestId: number, adminNotes?: string) {
    const banRequest = await this.prisma.ban_requests.findUnique({
      where: { id: requestId },
      include: {
        provider: {
          include: {
            user: true,
            jobs: {
              where: {
                status: { in: ['new', 'in_progress'] },
              },
            },
            local_service_manager: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!banRequest) {
      throw new NotFoundException('Ban request not found');
    }

    if (banRequest.status !== 'pending') {
      throw new BadRequestException('Ban request already reviewed');
    }

    const provider = banRequest.provider;

    if (provider.status === 'banned') {
      throw new BadRequestException('Provider is already banned');
    }

    // Check active jobs
    if (provider.jobs.length > 0) {
      throw new BadRequestException(
        `Cannot ban provider with ${provider.jobs.length} active jobs. Please wait for jobs to complete or contact LSM to cancel them.`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update ban request
      await tx.ban_requests.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          admin_reviewed_by: adminUserId,
          admin_reviewed_at: new Date(),
          admin_notes: adminNotes || 'Ban request approved',
        },
      });

      // 2. Ban provider
      await tx.service_providers.update({
        where: { id: provider.id },
        data: {
          status: 'banned',
          rejection_reason: banRequest.reason,
        },
      });

      // 3. Notify provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: provider.user_id,
          type: 'system',
          title: 'Account Banned',
          message: `Your account has been banned. Reason: ${banRequest.reason}`,
        },
      });

      // 4. Notify LSM who requested
      await tx.notifications.create({
        data: {
          recipient_type: 'local_service_manager',
          recipient_id: banRequest.requested_by_lsm,
          type: 'system',
          title: 'Ban Request Approved',
          message: `Your ban request for provider "${provider.business_name}" has been approved by admin.`,
        },
      });

      return {
        id: banRequest.id,
        providerId: provider.id,
        status: 'approved',
        message: 'Ban request approved. Provider has been banned.',
      };
    });
  }

  /**
   * Reject LSM ban request
   */
  async rejectBanRequest(adminUserId: number, requestId: number, adminNotes: string) {
    const banRequest = await this.prisma.ban_requests.findUnique({
      where: { id: requestId },
      include: {
        provider: {
          include: {
            local_service_manager: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!banRequest) {
      throw new NotFoundException('Ban request not found');
    }

    if (banRequest.status !== 'pending') {
      throw new BadRequestException('Ban request already reviewed');
    }

    await this.prisma.ban_requests.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        admin_reviewed_by: adminUserId,
        admin_reviewed_at: new Date(),
        admin_notes: adminNotes,
      },
    });

    // Notify LSM
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'local_service_manager',
        recipient_id: banRequest.requested_by_lsm,
        type: 'system',
        title: 'Ban Request Rejected',
        message: `Your ban request for provider "${banRequest.provider.business_name}" was rejected by admin. Notes: ${adminNotes}`,
      },
    });

    return {
      id: banRequest.id,
      status: 'rejected',
      adminNotes,
      message: 'Ban request rejected. LSM has been notified.',
    };
  }

  // ==================== REGIONAL REPORTS ====================

  /**
   * Get regional performance statistics
   */
  async getRegionalReports() {
    const lsms = await this.prisma.local_service_managers.findMany({
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        service_providers: {
          include: {
            jobs: {
              select: {
                status: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { region: 'asc' },
    });

    const regions = await Promise.all(
      lsms.map(async (lsm) => {
        const providers = lsm.service_providers;

        // Provider counts by status
        const totalProviders = providers.length;
        const activeProviders = providers.filter(
          (p) => p.status === 'active',
        ).length;
        const pendingProviders = providers.filter(
          (p) => p.status === 'pending',
        ).length;
        const bannedProviders = providers.filter(
          (p) => p.status === 'banned',
        ).length;

        // Job statistics
        const allJobs = providers.flatMap((p) => p.jobs);
        const totalJobs = allJobs.length;
        const completedJobs = allJobs.filter(
          (j) => j.status === 'completed' || j.status === 'paid',
        ).length;
        const activeJobs = allJobs.filter((j) =>
          ['new', 'in_progress'].includes(j.status),
        ).length;

        // Revenue
        const totalRevenue = allJobs
          .filter((j) => j.status === 'paid')
          .reduce((sum, job) => sum + Number(job.price), 0);

        // Pending disputes in this region
        const pendingDisputes = await this.prisma.disputes.count({
          where: {
            status: 'pending',
            job: {
              service_provider: {
                lsm_id: lsm.id,
              },
            },
          },
        });

        // Average provider rating
        const averageProviderRating =
          providers.length > 0
            ? providers.reduce((sum, p) => sum + Number(p.rating), 0) /
              providers.length
            : 0;

        return {
          region: lsm.region,
          lsm: {
            id: lsm.id,
            name: `${lsm.user.first_name} ${lsm.user.last_name}`,
            email: lsm.user.email,
            status: lsm.status,
          },
          stats: {
            totalProviders,
            activeProviders,
            pendingProviders,
            bannedProviders,
            totalJobs,
            completedJobs,
            activeJobs,
            totalRevenue,
            pendingDisputes,
            averageProviderRating: Number(averageProviderRating.toFixed(2)),
          },
        };
      }),
    );

    // Sort by revenue (highest first)
    return {
      regions: regions.sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue),
    };
  }

  // ==================== PLATFORM SETTINGS ====================

  /**
   * Get platform settings
   */
  async getSettings() {
    const settings = await this.prisma.platform_settings.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!settings) {
      // Return default values if no settings exist yet
      return {
        responseDeadlineMinutes: 60,
        warningThreshold: 3,
        popularityThreshold: 10,
        cancellationFeePercentage: 25,
        defaultInPersonVisitCost: 50.0,
        updatedAt: new Date(),
        message: 'Using default settings. No settings record found in database.',
      };
    }

    return {
      id: settings.id,
      responseDeadlineMinutes: settings.response_deadline_mins,
      warningThreshold: settings.warning_threshold,
      popularityThreshold: settings.popularity_threshold,
      cancellationFeePercentage: Number(settings.cancellation_fee_percentage),
      defaultInPersonVisitCost: Number(settings.default_in_person_visit_cost),
      updatedBy: settings.updated_by,
      updatedAt: settings.updated_at,
      createdAt: settings.created_at,
    };
  }

  /**
   * Update platform settings
   */
  async updateSettings(adminUserId: number, dto: any) {
    // Get current settings (if any)
    const currentSettings = await this.prisma.platform_settings.findFirst({
      orderBy: { id: 'desc' },
    });

    // Prepare update data (only include fields that were provided)
    const updateData: any = {
      updated_by: adminUserId,
    };

    if (dto.responseDeadlineMinutes !== undefined) {
      updateData.response_deadline_mins = dto.responseDeadlineMinutes;
    } else if (currentSettings) {
      updateData.response_deadline_mins = currentSettings.response_deadline_mins;
    }

    if (dto.warningThreshold !== undefined) {
      updateData.warning_threshold = dto.warningThreshold;
    } else if (currentSettings) {
      updateData.warning_threshold = currentSettings.warning_threshold;
    }

    if (dto.popularityThreshold !== undefined) {
      updateData.popularity_threshold = dto.popularityThreshold;
    } else if (currentSettings) {
      updateData.popularity_threshold = currentSettings.popularity_threshold;
    }

    if (dto.cancellationFeePercentage !== undefined) {
      updateData.cancellation_fee_percentage = dto.cancellationFeePercentage;
    } else if (currentSettings) {
      updateData.cancellation_fee_percentage = currentSettings.cancellation_fee_percentage;
    }

    if (dto.defaultInPersonVisitCost !== undefined) {
      updateData.default_in_person_visit_cost = dto.defaultInPersonVisitCost;
    } else if (currentSettings) {
      updateData.default_in_person_visit_cost = currentSettings.default_in_person_visit_cost;
    }

    // Create new settings record (versioned history approach)
    const settings = await this.prisma.platform_settings.create({
      data: {
        response_deadline_mins: updateData.response_deadline_mins || 60,
        warning_threshold: updateData.warning_threshold || 3,
        popularity_threshold: updateData.popularity_threshold || 10,
        cancellation_fee_percentage: updateData.cancellation_fee_percentage || 25,
        default_in_person_visit_cost: updateData.default_in_person_visit_cost || 50.0,
        updated_by: adminUserId,
      },
    });

    return {
      message: 'Settings updated successfully',
      settings: {
        id: settings.id,
        responseDeadlineMinutes: settings.response_deadline_mins,
        warningThreshold: settings.warning_threshold,
        popularityThreshold: settings.popularity_threshold,
        cancellationFeePercentage: Number(settings.cancellation_fee_percentage),
        defaultInPersonVisitCost: Number(settings.default_in_person_visit_cost),
        updatedBy: settings.updated_by,
        updatedAt: settings.updated_at,
      },
    };
  }
}
