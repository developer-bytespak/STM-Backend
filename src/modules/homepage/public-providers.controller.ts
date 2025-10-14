import {
  Controller,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { HomepageService } from './homepage.service';

@Controller('providers')
@ApiTags('Public Providers')
export class PublicProvidersController {
  constructor(private readonly homepageService: HomepageService) {}

  /**
   * Get provider details by slug (SEO-friendly URL)
   * Public endpoint - no authentication required
   * 
   * Slug format: "business-name-{id}" (e.g., "joes-plumbing-11")
   */
  @Get(':slug')
  @ApiOperation({
    summary: 'Get provider details by slug',
    description: 'Retrieve detailed provider information using SEO-friendly slug. Slug format: business-name-{id}',
  })
  @ApiParam({
    name: 'slug',
    description: 'Provider slug (e.g., joes-plumbing-11)',
    example: 'joes-plumbing-11',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid slug format',
  })
  @ApiResponse({
    status: 404,
    description: 'Provider not found or inactive',
  })
  async getProviderBySlug(@Param('slug') slug: string) {
    if (!slug || slug.trim() === '') {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_SLUG',
          message: 'Provider slug is required',
        },
      });
    }

    // Validate slug format (should contain at least one hyphen and end with number)
    if (!/-\d+$/.test(slug)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_SLUG_FORMAT',
          message: 'Invalid slug format. Expected format: business-name-{id}',
        },
      });
    }

    return this.homepageService.getProviderBySlug(slug);
  }
}

