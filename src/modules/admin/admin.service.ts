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
}
