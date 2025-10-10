import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchProvidersDto } from './dto/search-providers.dto';

@Injectable()
export class HomepageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search for service categories and granular services
   * Returns both matching categories and specific services
   */
  async searchServices(query: string) {
    const lowerQuery = query.toLowerCase();

    // 1. Find matching categories (DISTINCT)
    const categoryMatches = await this.prisma.services.findMany({
      where: {
        category: {
          contains: query,
          mode: 'insensitive',
        },
        status: 'approved',
      },
      select: {
        category: true,
        id: true,
        description: true,
      },
      distinct: ['category'],
    });

    // 2. Find matching service names
    const serviceMatches = await this.prisma.services.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
        status: 'approved',
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
      },
    });

    // 3. Combine results
    const results = [];

    // Add categories
    for (const cat of categoryMatches) {
      results.push({
        type: 'category',
        category: cat.category,
        id: cat.id,
        description: cat.description,
      });
    }

    // Add services
    for (const svc of serviceMatches) {
      results.push({
        type: 'service',
        category: svc.category,
        name: svc.name,
        id: svc.id,
        description: svc.description,
      });
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * Get all services under a specific category
   */
  async getServicesByCategory(category: string) {
    const services = await this.prisma.services.findMany({
      where: {
        category: {
          equals: category,
          mode: 'insensitive',
        },
        status: 'approved',
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (services.length === 0) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: `No services found for category: ${category}`,
        },
      });
    }

    return {
      success: true,
      data: {
        category,
        services,
      },
    };
  }

  /**
   * Search for locations (ZIP codes) dynamically from provider service areas
   * Falls back to static test data if no provider areas exist
   */
  async searchLocations(query: string, limit: number = 10) {
    const finalLimit = Math.min(limit, 50); // Max 50 results

    // Query provider_service_areas for unique ZIP codes
    const areas = await this.prisma.provider_service_areas.findMany({
      where: {
        zipcode: {
          startsWith: query, // ZIP codes start with query
        },
      },
      select: {
        zipcode: true, // Can be "75001" or "75001 - Dallas, TX"
      },
      distinct: ['zipcode'],
      take: finalLimit,
      orderBy: {
        zipcode: 'asc',
      },
    });

    let results;

    if (areas.length > 0) {
      // Use dynamic data from database
      // Parse and deduplicate zipcodes
      const uniqueZips = new Map<string, string>(); // Map<cleanZipCode, formattedAddress>
      
      areas.forEach((area) => {
        const zipcodeField = area.zipcode;
        
        // Parse the zipcode field
        // Format can be: "75001" or "75001 - Dallas, TX"
        let cleanZipCode: string;
        let formattedAddress: string;
        
        if (zipcodeField.includes(' - ')) {
          // Has location data: "75001 - Dallas, TX"
          cleanZipCode = zipcodeField.split(' - ')[0].trim();
          formattedAddress = zipcodeField;
        } else if (zipcodeField.includes('- ')) {
          // Has location data with no space before dash: "75001- Dallas, TX"
          cleanZipCode = zipcodeField.split('- ')[0].trim();
          formattedAddress = cleanZipCode + ' - ' + zipcodeField.split('- ')[1];
        } else {
          // Just zipcode: "75001"
          cleanZipCode = zipcodeField.trim();
          formattedAddress = cleanZipCode;
        }
        
        // Store first occurrence (deduplicate)
        if (!uniqueZips.has(cleanZipCode)) {
          uniqueZips.set(cleanZipCode, formattedAddress);
        }
      });

      results = Array.from(uniqueZips.entries()).map(([zipCode, formattedAddress]) => ({
        zipCode: zipCode,
        formattedAddress: formattedAddress,
      }));
    } else {
      // Fallback to static test data when no provider areas exist
      const testZips = [
        '97301', // Salem, OR
        '97302', // Salem, OR
        '97201', // Portland, OR
        '97202', // Portland, OR
        '75001', // Dallas, TX
        '75002', // Dallas, TX
        '75201', // Dallas, TX
        '97205', // Portland, OR
        '97303', // Salem, OR
        '97210', // Portland, OR
        '75003', // Dallas, TX
        '97211', // Portland, OR
      ];

      // Filter test data based on query
      const filteredZips = testZips.filter(zip => 
        zip.startsWith(query)
      ).slice(0, finalLimit);

      results = filteredZips.map((zip) => ({
        zipCode: zip,
        formattedAddress: zip, // For now, just ZIP
        // city: 'TBD',
        // state: 'TBD', 
        // stateCode: 'TBD',
      }));
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * Search for providers by service name and location
   * Returns providers offering the specified service in the given ZIP code
   */
  async searchProviders(dto: SearchProvidersDto) {
    const { service, zipcode, filters } = dto;

    // 1. Find the service by name (exact match, case-insensitive)
    const serviceRecord = await this.prisma.services.findFirst({
      where: {
        name: {
          equals: service,
          mode: 'insensitive',
        },
        status: 'approved',
      },
    });

    if (!serviceRecord) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `Service not found: ${service}`,
        },
      });
    }

    // 2. Build where clause for providers
    // Support both formats: "75001" matches "75001" or "75001 - Dallas, TX"
    const where: any = {
      service_id: serviceRecord.id,
      is_active: true,
      provider: {
        status: 'active',
        service_areas: {
          some: {
            zipcode: {
              startsWith: zipcode, // Match "75001" in "75001 - Dallas, TX"
            },
          },
        },
      },
    };

    // Apply optional filters
    if (filters?.minRating) {
      where.provider.rating = { gte: filters.minRating };
    }
    if (filters?.maxPrice) {
      where.provider.max_price = { lte: filters.maxPrice };
    }

    // 3. Fetch providers
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
          },
        },
      },
      orderBy: {
        provider: {
          rating: 'desc', // Sort by rating (highest first)
        },
      },
    });

    // 4. Format response
    const providers = providerServices.map((ps) => ({
      id: ps.provider.id,
      businessName: ps.provider.business_name,
      ownerName: `${ps.provider.user.first_name} ${ps.provider.user.last_name}`,
      rating: Number(ps.provider.rating),
      totalJobs: ps.provider.total_jobs,
      experience: ps.provider.experience,
      description: ps.provider.description,
      location: ps.provider.location,
      minPrice: ps.provider.min_price ? Number(ps.provider.min_price) : null,
      maxPrice: ps.provider.max_price ? Number(ps.provider.max_price) : null,
      phoneNumber: ps.provider.user.phone_number,
      serviceAreas: ps.provider.service_areas.map((area) => area.zipcode),
      services: ps.provider.provider_services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        category: s.service.category,
      })),
    }));

    return {
      success: true,
      data: {
        providers,
        count: providers.length,
        service: {
          id: serviceRecord.id,
          name: serviceRecord.name,
          category: serviceRecord.category,
        },
        location: zipcode,
      },
    };
  }
}

