import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchMatchingService } from './search-matching.service';

@Controller('services')
@ApiTags('services')
export class ServicesController {
  constructor(private readonly searchService: SearchMatchingService) {}

  /**
   * Search services (public endpoint)
   */
  @Get('search')
  @ApiOperation({ summary: 'Search approved services with filters' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async searchServices(
    @Query('query') query?: string,
    @Query('category') category?: string,
    @Query('zipcode') zipcode?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchServices({
      query,
      category,
      zipcode,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get providers for a service
   */
  @Get(':id/providers')
  @ApiOperation({ summary: 'Get all providers offering a specific service' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getProvidersForService(
    @Param('id', ParseIntPipe) serviceId: number,
    @Query('zipcode') zipcode?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.searchService.getProvidersForService(serviceId, zipcode, sortBy);
  }
}

