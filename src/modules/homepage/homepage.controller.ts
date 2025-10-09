import { Controller, Get, Post, Query, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { HomepageService } from './homepage.service';
import { SearchProvidersDto } from './dto/search-providers.dto';

@Controller('homepage/search')
@ApiTags('Homepage Search')
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  /**
   * Search for service categories and granular services
   * Used for service search autocomplete
   */
  @Get('services')
  @ApiOperation({ summary: 'Search for service categories and granular services' })
  @ApiQuery({ name: 'query', required: true, description: 'Search query (min 3 characters)' })
  @ApiResponse({ status: 200, description: 'Services found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query (less than 3 characters)' })
  async searchServices(@Query('query') query: string) {
    if (!query || query.length < 3) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query must be at least 3 characters long'
        }
      });
    }

    return this.homepageService.searchServices(query);
  }

  /**
   * Get all services under a specific category
   * Used when user selects a category to see granular services
   */
  @Get('services/category/:category')
  @ApiOperation({ summary: 'Get all services under a category' })
  @ApiParam({ name: 'category', description: 'Category name (e.g., Interior Cleaning)' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getServicesByCategory(@Param('category') category: string) {
    return this.homepageService.getServicesByCategory(category);
  }

  /**
   * Search for locations (ZIP codes)
   * Used for location search autocomplete
   */
  @Get('locations')
  @ApiOperation({ summary: 'Search for locations (ZIP codes)' })
  @ApiQuery({ name: 'query', required: true, description: 'ZIP code search query (min 2 characters)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results to return (default 10)' })
  @ApiResponse({ status: 200, description: 'Locations found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  async searchLocations(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.length < 2) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query must be at least 2 characters long'
        }
      });
    }

    const limitNum = limit ? parseInt(limit) : 10;
    return this.homepageService.searchLocations(query, limitNum);
  }

  /**
   * Search for providers by service name and location
   * Final step in homepage search flow
   */
  @Post('providers')
  @ApiOperation({ summary: 'Search for providers by service and location' })
  @ApiResponse({ status: 200, description: 'Providers found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async searchProviders(@Body() dto: SearchProvidersDto) {
    return this.homepageService.searchProviders(dto);
  }
}

