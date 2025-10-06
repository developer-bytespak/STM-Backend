import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderManagementDto } from './dto/provider-management.dto';
import { ProviderFiltersDto } from './dto/provider-filters.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { Role, ProviderStatus, ApprovalStatus } from '@prisma/client';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async create(createProviderDto: CreateProviderDto): Promise<ProviderResponseDto> {
    try {
      // Check if user with email already exists
      const existingUser = await this.prisma.users.findUnique({
        where: { email: createProviderDto.email }
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Verify LSM exists
      const lsm = await this.prisma.local_service_managers.findUnique({
        where: { id: createProviderDto.lsm_id }
      });

      if (!lsm) {
        throw new BadRequestException('Local Service Manager not found');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createProviderDto.password, 10);

      // Create user and provider in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create user
        const user = await prisma.users.create({
          data: {
            first_name: createProviderDto.first_name,
            last_name: createProviderDto.last_name,
            email: createProviderDto.email,
            phone_number: createProviderDto.phone_number,
            role: Role.service_provider,
            password: hashedPassword,
            profile_picture: createProviderDto.profile_picture,
          }
        });

        // Create provider
        const provider = await prisma.service_providers.create({
          data: {
            user_id: user.id,
            experience: createProviderDto.experience,
            description: createProviderDto.description,
            location: createProviderDto.location,
            lsm_id: createProviderDto.lsm_id,
            tier: createProviderDto.tier || 'Bronze',
            status: createProviderDto.status || ProviderStatus.active,
            is_active: createProviderDto.is_active !== undefined ? createProviderDto.is_active : true,
          },
          include: {
            user: true,
            local_service_manager: {
              include: {
                user: true
              }
            },
          }
        });

        return provider;
      });

      return this.transformToResponseDto(result);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create provider');
    }
  }

  async findAll(filters: ProviderFiltersDto): Promise<{ data: ProviderResponseDto[]; total: number; page: number; limit: number }> {
    const {
      search,
      email,
      phone_number,
      location,
      tier,
      status,
      is_active,
      lsm_id,
      is_email_verified,
      min_rating,
      max_rating,
      min_experience,
      max_experience,
      min_total_jobs,
      max_total_jobs,
      min_earnings,
      max_earnings,
      created_from,
      created_to,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      user: {
        role: Role.service_provider,
      }
    };

    // Search filter
    if (search) {
      where.user.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
      where.OR = [
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Email filter
    if (email) {
      where.user.email = email;
    }

    // Phone number filter
    if (phone_number) {
      where.user.phone_number = phone_number;
    }

    // Location filter
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Provider-specific filters
    if (tier) {
      where.tier = tier;
    }

    if (status) {
      where.status = status;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (lsm_id) {
      where.lsm_id = lsm_id;
    }

    // Email verification filter
    if (is_email_verified !== undefined) {
      where.user.is_email_verified = is_email_verified;
    }

    // Rating filters
    if (min_rating !== undefined || max_rating !== undefined) {
      where.rating = {};
      if (min_rating !== undefined) {
        where.rating.gte = min_rating;
      }
      if (max_rating !== undefined) {
        where.rating.lte = max_rating;
      }
    }

    // Experience filters
    if (min_experience !== undefined || max_experience !== undefined) {
      where.experience = {};
      if (min_experience !== undefined) {
        where.experience.gte = min_experience;
      }
      if (max_experience !== undefined) {
        where.experience.lte = max_experience;
      }
    }

    // Job count filters
    if (min_total_jobs !== undefined || max_total_jobs !== undefined) {
      where.total_jobs = {};
      if (min_total_jobs !== undefined) {
        where.total_jobs.gte = min_total_jobs;
      }
      if (max_total_jobs !== undefined) {
        where.total_jobs.lte = max_total_jobs;
      }
    }

    // Earnings filters
    if (min_earnings !== undefined || max_earnings !== undefined) {
      where.earning = {};
      if (min_earnings !== undefined) {
        where.earning.gte = min_earnings;
      }
      if (max_earnings !== undefined) {
        where.earning.lte = max_earnings;
      }
    }

    // Date range filter
    if (created_from || created_to) {
      where.user.created_at = {};
      if (created_from) {
        where.user.created_at.gte = new Date(created_from);
      }
      if (created_to) {
        where.user.created_at.lte = new Date(created_to);
      }
    }

    // Build orderBy clause
    let orderBy: any = {};
    if (sort_by === 'first_name' || sort_by === 'last_name' || sort_by === 'email') {
      orderBy = { user: { [sort_by]: sort_order } };
    } else if (sort_by === 'rating' || sort_by === 'experience' || sort_by === 'total_jobs' || sort_by === 'earnings') {
      orderBy = { [sort_by]: sort_order };
    } else {
      orderBy = { user: { [sort_by]: sort_order } };
    }

    try {
      const [providers, total] = await Promise.all([
        this.prisma.service_providers.findMany({
          where,
          include: {
            user: true,
            local_service_manager: {
              include: {
                user: true
              }
            },
          },
          skip,
          take: limit,
          orderBy,
        }),
        this.prisma.service_providers.count({ where })
      ]);

      const transformedProviders = providers.map(provider => this.transformToResponseDto(provider));

      return {
        data: transformedProviders,
        total,
        page,
        limit
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch providers');
    }
  }

  async findOne(id: number): Promise<ProviderResponseDto> {
    try {
      const provider = await this.prisma.service_providers.findUnique({
        where: { id },
        include: {
          user: true,
          local_service_manager: {
            include: {
              user: true
            }
          },
        }
      });

      if (!provider) {
        throw new NotFoundException(`Provider with ID ${id} not found`);
      }

      return this.transformToResponseDto(provider);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch provider');
    }
  }

  async findByUserId(userId: number): Promise<ProviderResponseDto> {
    try {
      const provider = await this.prisma.service_providers.findUnique({
        where: { user_id: userId },
        include: {
          user: true,
          local_service_manager: {
            include: {
              user: true
            }
          },
        }
      });

      if (!provider) {
        throw new NotFoundException(`Provider with user ID ${userId} not found`);
      }

      return this.transformToResponseDto(provider);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch provider');
    }
  }

  async update(id: number, updateProviderDto: UpdateProviderDto): Promise<ProviderResponseDto> {
    try {
      // Check if provider exists
      const existingProvider = await this.prisma.service_providers.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!existingProvider) {
        throw new NotFoundException(`Provider with ID ${id} not found`);
      }

      // Check if email is being updated and if it already exists
      if (updateProviderDto.email && updateProviderDto.email !== existingProvider.user.email) {
        const emailExists = await this.prisma.users.findUnique({
          where: { email: updateProviderDto.email }
        });

        if (emailExists) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Verify LSM exists if being updated
      if (updateProviderDto.lsm_id) {
        const lsm = await this.prisma.local_service_managers.findUnique({
          where: { id: updateProviderDto.lsm_id }
        });

        if (!lsm) {
          throw new BadRequestException('Local Service Manager not found');
        }
      }

      // Prepare update data
      const userUpdateData: any = {};
      const providerUpdateData: any = {};

      if (updateProviderDto.first_name) userUpdateData.first_name = updateProviderDto.first_name;
      if (updateProviderDto.last_name) userUpdateData.last_name = updateProviderDto.last_name;
      if (updateProviderDto.email) userUpdateData.email = updateProviderDto.email;
      if (updateProviderDto.phone_number) userUpdateData.phone_number = updateProviderDto.phone_number;
      if (updateProviderDto.profile_picture) userUpdateData.profile_picture = updateProviderDto.profile_picture;

      if (updateProviderDto.password) {
        userUpdateData.password = await bcrypt.hash(updateProviderDto.password, 10);
      }

      if (updateProviderDto.experience !== undefined) providerUpdateData.experience = updateProviderDto.experience;
      if (updateProviderDto.description !== undefined) providerUpdateData.description = updateProviderDto.description;
      if (updateProviderDto.location) providerUpdateData.location = updateProviderDto.location;
      if (updateProviderDto.lsm_id) providerUpdateData.lsm_id = updateProviderDto.lsm_id;
      if (updateProviderDto.tier) providerUpdateData.tier = updateProviderDto.tier;
      if (updateProviderDto.status) providerUpdateData.status = updateProviderDto.status;
      if (updateProviderDto.is_active !== undefined) providerUpdateData.is_active = updateProviderDto.is_active;

      // Update in transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        if (Object.keys(userUpdateData).length > 0) {
          await prisma.users.update({
            where: { id: existingProvider.user_id },
            data: userUpdateData
          });
        }

        if (Object.keys(providerUpdateData).length > 0) {
          await prisma.service_providers.update({
            where: { id },
            data: providerUpdateData
          });
        }

        return prisma.service_providers.findUnique({
          where: { id },
          include: {
            user: true,
            local_service_manager: {
              include: {
                user: true
              }
            },
          }
        });
      });

      return this.transformToResponseDto(result!);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update provider');
    }
  }

  async updateManagement(id: number, managementDto: ProviderManagementDto): Promise<ProviderResponseDto> {
    try {
      const provider = await this.prisma.service_providers.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!provider) {
        throw new NotFoundException(`Provider with ID ${id} not found`);
      }

      // Verify LSM exists if being updated
      if (managementDto.lsm_id) {
        const lsm = await this.prisma.local_service_managers.findUnique({
          where: { id: managementDto.lsm_id }
        });

        if (!lsm) {
          throw new BadRequestException('Local Service Manager not found');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (managementDto.status !== undefined) updateData.status = managementDto.status;
      if (managementDto.tier !== undefined) updateData.tier = managementDto.tier;
      if (managementDto.lsm_id !== undefined) updateData.lsm_id = managementDto.lsm_id;

      const result = await this.prisma.service_providers.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          local_service_manager: {
            include: {
              user: true
            }
          },
        }
      });

      return this.transformToResponseDto(result);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update provider management');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const provider = await this.prisma.service_providers.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!provider) {
        throw new NotFoundException(`Provider with ID ${id} not found`);
      }

      // Delete provider and user in transaction
      await this.prisma.$transaction(async (prisma) => {
        await prisma.service_providers.delete({
          where: { id }
        });

        await prisma.users.delete({
          where: { id: provider.user_id }
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete provider');
    }
  }

  async createService(providerId: number, createServiceDto: CreateServiceDto): Promise<any> {
    try {
      const provider = await this.prisma.service_providers.findUnique({
        where: { id: providerId }
      });

      if (!provider) {
        throw new NotFoundException(`Provider with ID ${providerId} not found`);
      }

      // Create service with pending approval
        const service = await this.prisma.services.create({
        data: {
          name: createServiceDto.name,
          description: createServiceDto.description,
            category: 'General',
          // services model no longer has created_by; keeping minimal fields
          status: ApprovalStatus.pending, // Requires LSM approval
        }
      });

      // If provider wants to offer this service, add to provider_services
      if (createServiceDto.min_price !== undefined || createServiceDto.max_price !== undefined) {
        await this.prisma.provider_services.create({
          data: {
            provider_id: providerId,
            service_id: service.id,
            // pricing fields removed from schema
          }
        });
      }

      return {
        service,
        message: 'Service created successfully and submitted for LSM approval'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create service');
    }
  }

  async getProviderServices(providerId: number): Promise<any> {
    try {
      const provider = await this.prisma.service_providers.findUnique({
        where: { id: providerId },
        include: {
          provider_services: {
            include: {
              service: true
            }
          }
        }
      });

      if (!provider) {
        throw new NotFoundException(`Provider with ID ${providerId} not found`);
      }

      return {
        available_services: provider.provider_services,
        total_available: provider.provider_services.length
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch provider services');
    }
  }

  async getProviderStats(): Promise<any> {
    try {
      const [
        totalProviders,
        activeProviders,
        inactiveProviders,
        bannedProviders,
        providersByTier,
        providersByLSM,
        averageRating,
        averageExperience,
        totalEarnings,
        averageJobsPerProvider,
        recentProviders,
        topPerformers,
        newServicesCreated
      ] = await Promise.all([
        this.prisma.service_providers.count(),
        this.prisma.service_providers.count({ where: { is_active: true } }),
        this.prisma.service_providers.count({ where: { is_active: false } }),
        this.prisma.service_providers.count({ where: { status: ProviderStatus.banned } }),
        this.prisma.service_providers.groupBy({
          by: ['tier'],
          _count: true
        }),
        this.prisma.service_providers.groupBy({
          by: ['lsm_id'],
          _count: true
        }),
        this.prisma.service_providers.aggregate({
          _avg: { rating: true }
        }),
        this.prisma.service_providers.aggregate({
          _avg: { experience: true }
        }),
        this.prisma.service_providers.aggregate({
          _sum: { earning: true }
        }),
        this.prisma.service_providers.aggregate({
          _avg: { total_jobs: true }
        }),
        this.prisma.service_providers.count({
          where: {
            user: {
              created_at: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            }
          }
        }),
        this.prisma.service_providers.findMany({
          include: {
            user: true,
            local_service_manager: {
              include: { user: true }
            }
          },
          orderBy: { rating: 'desc' },
          take: 5
        }),
        this.prisma.services.count({
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        })
      ]);

      return {
        total_providers: totalProviders,
        active_providers: activeProviders,
        inactive_providers: inactiveProviders,
        banned_providers: bannedProviders,
        tier_breakdown: providersByTier.reduce((acc, item) => {
          acc[item.tier] = item._count;
          return acc;
        }, {}),
        lsm_distribution: providersByLSM,
        average_rating: averageRating._avg.rating || 0,
        average_experience: averageExperience._avg.experience || 0,
        total_earnings: totalEarnings._sum.earning || 0,
        average_jobs_per_provider: averageJobsPerProvider._avg.total_jobs || 0,
        recent_providers: recentProviders,
        top_performers: topPerformers.map(p => this.transformToResponseDto(p)),
        new_services_created: newServicesCreated
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch provider statistics');
    }
  }

  private transformToResponseDto(provider: any): ProviderResponseDto {
    const response = plainToClass(ProviderResponseDto, {
      id: provider.id,
      experience: provider.experience,
      description: provider.description,
      rating: provider.rating,
      tier: provider.tier,
      location: provider.location,
      is_active: provider.is_active,
      status: provider.status,
      earning: provider.earning,
      total_jobs: provider.total_jobs,
      user: provider.user,
      local_service_manager: provider.local_service_manager,
    }, { excludeExtraneousValues: true });

    return response;
  }
}
