import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { ProvidersImagesService } from './providers-images.service';
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
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providersImagesService: ProvidersImagesService,
  ) {}

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

  // ==================== IMAGE MANAGEMENT ====================

  /**
   * Get provider images
   */
  @Get('images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get provider images (logo, banner, gallery)' })
  @ApiResponse({ status: 200, description: 'Images retrieved successfully' })
  async getImages(@CurrentUser('id') userId: number) {
    return this.providersImagesService.getProviderImages(userId);
  }

  /**
   * Upload logo image
   */
  @Post('images/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload provider logo image' })
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.providersImagesService.uploadLogo(userId, file);
  }

  /**
   * Upload banner image (main homepage image)
   */
  @Post('images/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload provider banner image' })
  @ApiResponse({ status: 201, description: 'Banner uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.providersImagesService.uploadBanner(userId, file);
  }

  /**
   * Upload gallery image
   */
  @Post('images/gallery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload gallery image' })
  @ApiResponse({ status: 201, description: 'Gallery image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGalleryImage(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.providersImagesService.uploadGalleryImage(userId, file, caption);
  }

  /**
   * Delete gallery image
   */
  @Delete('images/gallery/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete gallery image' })
  @ApiResponse({ status: 200, description: 'Gallery image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async deleteGalleryImage(
    @CurrentUser('id') userId: number,
    @Param('imageId') imageId: string,
  ) {
    return this.providersImagesService.deleteGalleryImage(userId, imageId);
  }

  /**
   * Reorder gallery images
   */
  @Put('images/gallery/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder gallery images' })
  @ApiResponse({ status: 200, description: 'Gallery images reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid image IDs' })
  async reorderGalleryImages(
    @CurrentUser('id') userId: number,
    @Body('imageIds') imageIds: string[],
  ) {
    return this.providersImagesService.reorderGalleryImages(userId, imageIds);
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

  // ==================== EMAIL TEMPLATES ====================

  /**
   * Get email templates
   */
  @Get('email-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get email templates (custom or null for defaults)' })
  @ApiResponse({ status: 200, description: 'Email templates retrieved successfully' })
  async getEmailTemplates(@CurrentUser('id') userId: number) {
    return this.providersService.getEmailTemplates(userId);
  }

  /**
   * Update email templates
   */
  @Put('email-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update email templates' })
  @ApiResponse({ status: 200, description: 'Email templates updated successfully' })
  async updateEmailTemplates(
    @CurrentUser('id') userId: number,
    @Body() dto: any,
  ) {
    return this.providersService.updateEmailTemplates(userId, dto);
  }

  /**
   * Reset email templates to system defaults
   */
  @Delete('email-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset email templates to system defaults' })
  @ApiResponse({ status: 200, description: 'Email templates reset successfully' })
  async resetEmailTemplates(@CurrentUser('id') userId: number) {
    return this.providersService.resetEmailTemplates(userId);
  }

  // ==================== AVAILABILITY CONFIRMATION ====================

  /**
   * Confirm availability - weekly confirmation reminder
   * Provider confirms they are still active and their profile is up-to-date
   */
  @Post('confirm-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm weekly availability' })
  @ApiResponse({
    status: 200,
    description: 'Availability confirmed successfully',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async confirmAvailability(@CurrentUser('id') userId: number) {
    const provider = await this.providersService.confirmAvailability(userId);
    return {
      success: true,
      message: 'Availability confirmed successfully',
      confirmedAt: provider.updated_at,
      provider: {
        id: provider.id,
        name: provider.user?.first_name + ' ' + provider.user?.last_name,
        status: provider.status,
        is_active: provider.is_active,
      },
    };
  }
}