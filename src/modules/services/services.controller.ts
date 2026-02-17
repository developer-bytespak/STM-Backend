import { Controller, Get, Post, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SearchMatchingService } from './search-matching.service';
import { SmartProvidersDto } from './dto/smart-providers.dto';

@Controller('services')
@ApiTags('services')
export class ServicesController {
  constructor(private readonly searchService: SearchMatchingService) {}

  /**
   * Get all approved services (public endpoint)
   */
  @Get()
  @ApiOperation({ summary: 'Get all approved services' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async getAllServices() {
    return this.searchService.getAllApprovedServices();
  }

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
   * Smart Search - Get best matching providers (filtered by service, zipcode, budget)
   */
  @Post('smart-providers')
  @ApiOperation({ summary: 'Get best matching providers for service, zipcode, and budget' })
  @ApiBody({ type: SmartProvidersDto })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getSmartProviders(@Body() dto: SmartProvidersDto) {
    return this.searchService.getSmartProviders(dto);
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

