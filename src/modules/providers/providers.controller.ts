import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { RequestServiceDto } from './dto/request-service.dto';
import { AddServiceDto } from './dto/add-service.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { ReviewFiltersDto } from './dto/review-filters.dto';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('provider')
@ApiTags('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * Request a new service
   */
  @Post('request-new-service')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a new service to be added to the platform' })
  @ApiResponse({ status: 201, description: 'Service request created successfully' })
  @ApiResponse({ status: 409, description: 'Service already exists or request pending' })
  async requestNewService(
    @CurrentUser('id') userId: number,
    @Body() dto: RequestServiceDto,
  ) {
    return this.providersService.requestNewService(userId, dto);
  }

  /**
   * Get all service requests
   */
  @Get('my-service-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all service requests for current provider' })
  @ApiResponse({ status: 200, description: 'Service requests retrieved successfully' })
  async getMyServiceRequests(@CurrentUser('id') userId: number) {
    return this.providersService.getMyServiceRequests(userId);
  }

  /**
   * Add an existing service to profile
   */
  @Post('add-service')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add an existing approved service to provider profile' })
  @ApiResponse({ status: 200, description: 'Service added successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 409, description: 'Already offering this service' })
  async addService(
    @CurrentUser('id') userId: number,
    @Body() dto: AddServiceDto,
  ) {
    return this.providersService.addService(userId, dto);
  }

  // ==================== DASHBOARD ====================

  /**
   * Get provider dashboard
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get provider dashboard with statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard retrieved successfully' })
  async getDashboard(@CurrentUser('id') userId: number) {
    return this.providersService.getDashboard(userId);
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Get provider profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get provider profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@CurrentUser('id') userId: number) {
    return this.providersService.getProfile(userId);
  }

  /**
   * Update provider profile
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update provider profile and service areas' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.providersService.updateProfile(userId, dto);
  }

  /**
   * Set availability (active/inactive)
   */
  @Post('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set provider availability status' })
  @ApiResponse({ status: 200, description: 'Availability updated successfully' })
  @ApiResponse({ status: 400, description: 'Active jobs exist, cannot deactivate' })
  async setAvailability(
    @CurrentUser('id') userId: number,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.providersService.setAvailability(userId, dto);
  }

  // ==================== JOB MANAGEMENT ====================

  /**
   * Get job details
   */
  @Get('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job details by ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not your job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobDetails(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) jobId: number,
  ) {
    return this.providersService.getJobDetails(userId, jobId);
  }

  /**
   * Update job status (mark complete or mark payment)
   */
  @Post('jobs/:id/update-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark job as complete or mark payment received' })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action or status' })
  @ApiResponse({ status: 403, description: 'Not your job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async updateJobStatus(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) jobId: number,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.providersService.updateJobStatus(userId, jobId, dto);
  }

  /**
   * Get jobs with filters (enhanced - replaces pending-jobs and jobs)
   */
  @Get('jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all jobs with filters' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobs(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.providersService.getJobs(userId, {
      status,
      fromDate,
      toDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ==================== REVIEW MANAGEMENT ====================

  /**
   * Get all reviews for current provider
   */
  @Get('reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews for current provider with filters' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getReviews(
    @CurrentUser('id') userId: number,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.providersService.getReviews(userId, {
      minRating: minRating ? parseInt(minRating) : undefined,
      maxRating: maxRating ? parseInt(maxRating) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get review statistics
   */
  @Get('reviews/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get review statistics and rating breakdown' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getReviewStats(@CurrentUser('id') userId: number) {
    return this.providersService.getReviewStats(userId);
  }

  /**
   * Get specific review details
   */
  @Get('reviews/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific review details' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not your review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getReviewById(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) reviewId: number,
  ) {
    return this.providersService.getReviewById(userId, reviewId);
  }
}