import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SmartProvidersDto } from './dto/smart-providers.dto';

@Injectable()
export class SearchMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all approved services
   */
  async getAllApprovedServices() {
    const services = await this.prisma.services.findMany({
      where: {
        status: 'approved',
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
      },
      orderBy: [{ is_popular: 'desc' }, { name: 'asc' }],
    });

    return {
      services,
      total: services.length,
    };
  }

  /**
   * Search services with filters
   */
  async searchServices(filters: {
    query?: string;
    category?: string;
    zipcode?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const { query, category, zipcode, minPrice, maxPrice, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {
      status: 'approved', // Only approved services
    };

    // Search by name (partial match, case-insensitive)
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const total = await this.prisma.services.count({ where });

    // Log search (especially for analytics and tracking failed searches)
    if (query && query.length > 0) {
      // Log asynchronously to not block the response
      this.logSearch(query, zipcode).catch((err) => {
        // Silent fail - don't block search if logging fails
        console.error('Search logging failed:', err);
      });
    }

    const services = await this.prisma.services.findMany({
      where,
      include: {
        provider_services: {
          where: {
            is_active: true,
            provider: {
              status: 'active',
            },
          },
          include: {
            provider: {
              select: {
                min_price: true,
                max_price: true,
                service_areas: zipcode
                  ? {
                      where: {
                        zipcode: zipcode,
                      },
                    }
                  : true,
              },
            },
          },
        },
      },
      skip: (page - 1) * finalLimit,
      take: finalLimit,
      orderBy: [{ is_popular: 'desc' }, { name: 'asc' }],
    });

    // Filter services that have providers in zipcode (if zipcode provided)
    let filteredServices = services;
    if (zipcode) {
      filteredServices = services.filter(
        (service) =>
          service.provider_services.some(
            (ps) => ps.provider.service_areas && ps.provider.service_areas.length > 0,
          ),
      );
    }

    // Filter by price range if provided
    if (minPrice !== undefined || maxPrice !== undefined) {
      filteredServices = filteredServices.filter((service) => {
        const providers = service.provider_services;
        return providers.some((ps) => {
          const providerMinPrice = ps.provider.min_price
            ? Number(ps.provider.min_price)
            : 0;
          const providerMaxPrice = ps.provider.max_price
            ? Number(ps.provider.max_price)
            : Infinity;

          const matchesMin = minPrice === undefined || providerMaxPrice >= minPrice;
          const matchesMax = maxPrice === undefined || providerMinPrice <= maxPrice;

          return matchesMin && matchesMax;
        });
      });
    }

    return {
      data: filteredServices.map((service) => {
        const providers = service.provider_services;
        const prices = providers
          .map((ps) => ({
            min: ps.provider.min_price ? Number(ps.provider.min_price) : 0,
            max: ps.provider.max_price ? Number(ps.provider.max_price) : 0,
          }))
          .filter((p) => p.min > 0 || p.max > 0);

        const minServicePrice = prices.length > 0 ? Math.min(...prices.map((p) => p.min)) : 0;
        const maxServicePrice = prices.length > 0 ? Math.max(...prices.map((p) => p.max)) : 0;

        return {
          id: service.id,
          name: service.name,
          category: service.category,
          description: service.description,
          questionsJson: service.questions_json,
          isPopular: service.is_popular,
          availableProviders: providers.length,
          priceRange: {
            min: minServicePrice,
            max: maxServicePrice,
          },
        };
      }),
      pagination: {
        total: filteredServices.length,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(filteredServices.length / finalLimit),
      },
    };
  }

  /**
   * Smart Search - Get best matching providers (3 filters: service, zipcode, budget)
   * Returns top 5 providers sorted by rating, then total jobs
   */
  async getSmartProviders(dto: SmartProvidersDto) {
    const { serviceId, zipcode, budget } = dto;

    const service = await this.prisma.services.findUnique({
      where: { id: serviceId },
    });

    if (!service || service.status !== 'approved') {
      throw new NotFoundException('Service not found or not available');
    }

    const providerServices = await this.prisma.provider_services.findMany({
      where: {
        service_id: serviceId,
        is_active: true,
        provider: {
          status: 'active',
          service_areas: {
            some: { zipcode },
          },
        },
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
            service_areas: true,
          },
        },
      },
    });

    // Filter by budget: min_price <= budget (include if min_price is null)
    const filtered = providerServices.filter((ps) => {
      const minPrice = ps.provider.min_price ? Number(ps.provider.min_price) : 0;
      return minPrice <= budget;
    });

    const providers = filtered.map((ps) => ({
      id: ps.provider.id,
      businessName: ps.provider.business_name,
      ownerName: `${ps.provider.user.first_name} ${ps.provider.user.last_name}`,
      rating: Number(ps.provider.rating),
      totalJobs: ps.provider.total_jobs,
      minPrice: ps.provider.min_price ? Number(ps.provider.min_price) : null,
      maxPrice: ps.provider.max_price ? Number(ps.provider.max_price) : null,
      serviceAreas: ps.provider.service_areas.map((area) => area.zipcode),
    }));

    // Sort by rating DESC, then totalJobs DESC
    providers.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.totalJobs - a.totalJobs;
    });

    const topN = 5;
    const topProviders = providers.slice(0, topN);

    return {
      success: true,
      providers: topProviders,
      totalMatches: providers.length,
      message: `Found ${providers.length} matches, showing top ${Math.min(topN, providers.length)}`,
    };
  }

  /**
   * Get providers for a specific service
   */
  async getProvidersForService(
    serviceId: number,
    zipcode?: string,
    sortBy: string = 'rating',
  ) {
    const service = await this.prisma.services.findUnique({
      where: { id: serviceId },
    });

    if (!service || service.status !== 'approved') {
      throw new NotFoundException('Service not found or not available');
    }

    const where: any = {
      service_id: serviceId,
      is_active: true,
      provider: {
        status: 'active',
      },
    };

    // Zipcode filter
    if (zipcode) {
      where.provider = {
        ...where.provider,
        service_areas: {
          some: {
            zipcode: zipcode,
          },
        },
      };
    }

    const providerServices = await this.prisma.provider_services.findMany({
      where,
      include: {
        provider: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                phone_number: true,
              },
            },
            service_areas: true,
          },
        },
      },
    });

    const providers = providerServices.map((ps) => ({
      id: ps.provider.id,
      businessName: ps.provider.business_name,
      ownerName: `${ps.provider.user.first_name} ${ps.provider.user.last_name}`,
      rating: Number(ps.provider.rating),
      totalJobs: ps.provider.total_jobs,
      minPrice: ps.provider.min_price ? Number(ps.provider.min_price) : null,
      maxPrice: ps.provider.max_price ? Number(ps.provider.max_price) : null,
      location: ps.provider.location,
      serviceAreas: ps.provider.service_areas.map((area) => area.zipcode),
      experience: ps.provider.experience,
    }));

    // Sort providers
    if (sortBy === 'rating') {
      providers.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price') {
      providers.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    }

    return {
      service: {
        id: service.id,
        name: service.name,
        category: service.category,
        description: service.description,
        questionsJson: service.questions_json,
      },
      providers,
    };
  }

  /**
   * Log search queries for analytics
   * Tracks both successful and failed searches
   */
  private async logSearch(query: string, zipcode?: string) {
    // Check if there are any matching services
    const matchingServices = await this.prisma.services.findMany({
      where: {
        status: 'approved',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 1, // Just check if any exist
    });

    // If no results, this is a "failed search" - just track it for analytics
    // NOTE: Notifications removed - too spammy. Use requestNewService API instead for explicit requests.
    if (matchingServices.length === 0) {
      // TODO: Track failed search frequency in database
      // Could notify LSM/Admin after X searches of same term in Y days
      // For now, just silent tracking
    }

    // Log successful searches too (for analytics)
    if (matchingServices.length > 0) {
      // Log to service_search_logs table
      for (const service of matchingServices) {
        await this.prisma.service_search_logs.create({
          data: {
            service_id: service.id,
            region: zipcode || 'unknown',
            zipcode: zipcode,
            searched_at: new Date(),
          },
        });
      }
    }
  }
}
