import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
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
import { AdminService } from './admin.service';
import { CreateLsmDto } from './dto/create-lsm.dto';
import { UpdateLsmDto } from './dto/update-lsm.dto';
import { ReplaceLsmDto } from './dto/replace-lsm.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { BanProviderDto } from './dto/ban-provider.dto';
import { BanCustomerDto } from './dto/ban-customer.dto';
import {
  ApproveBanRequestDto,
  RejectBanRequestDto,
} from './dto/reject-ban-request.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AdminReviewFiltersDto } from './dto/review-filters.dto';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('admin')
@ApiTags('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== SERVICE REQUEST MANAGEMENT ====================

  /**
   * Get LSM-approved service requests pending admin approval
   */
  @Get('service-requests/pending')
  @ApiOperation({ summary: 'Get LSM-approved service requests awaiting admin approval' })
  @ApiResponse({ status: 200, description: 'Requests retrieved successfully' })
  async getPendingServiceRequests() {
    return this.adminService.getPendingServiceRequests();
  }

  /**
   * Approve service request and create service
   */
  @Post('service-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve service request and create the service' })
  @ApiResponse({ status: 200, description: 'Service created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or LSM approval missing' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Service already exists' })
  async approveServiceRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) requestId: number,
  ) {
    return this.adminService.approveServiceRequest(userId, requestId);
  }

  /**
   * Reject service request
   */
  @Post('service-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a service request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async rejectServiceRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) requestId: number,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectServiceRequest(userId, requestId, reason);
  }

  // ==================== SERVICE MANAGEMENT ====================

  /**
   * Get all services
   */
  @Get('services')
  @ApiOperation({ summary: 'Get all services with statistics' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async getAllServices() {
    return this.adminService.getAllServices();
  }

  /**
   * Update a service
   */
  @Put('services/:id')
  @ApiOperation({ summary: 'Update service details' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async updateService(
    @Param('id', ParseIntPipe) serviceId: number,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.adminService.updateService(serviceId, dto);
  }

  /**
   * Delete a service (soft delete)
   */
  @Delete('services/:id')
  @ApiOperation({ summary: 'Deactivate a service (cannot delete if active jobs exist)' })
  @ApiResponse({ status: 200, description: 'Service deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete service with active jobs' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async deleteService(@Param('id', ParseIntPipe) serviceId: number) {
    return this.adminService.deleteService(serviceId);
  }

  // ==================== LSM MANAGEMENT ====================

  /**
   * Get all LSMs
   */
  @Get('lsms')
  @ApiOperation({ summary: 'Get all Local Service Managers' })
  @ApiResponse({ status: 200, description: 'LSMs retrieved successfully' })
  async getAllLsms() {
    return this.adminService.getAllLsms();
  }

  /**
   * Get LSM by ID
   */
  @Get('lsms/:id')
  @ApiOperation({ summary: 'Get LSM details by ID' })
  @ApiResponse({ status: 200, description: 'LSM retrieved successfully' })
  @ApiResponse({ status: 404, description: 'LSM not found' })
  async getLsmById(@Param('id', ParseIntPipe) lsmId: number) {
    return this.adminService.getLsmById(lsmId);
  }

  /**
   * Create a new LSM
   */
  @Post('lsm/create')
  @ApiOperation({ summary: 'Create a new Local Service Manager' })
  @ApiResponse({ status: 201, description: 'LSM created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists or region has LSM' })
  async createLsm(@Body() dto: CreateLsmDto) {
    return this.adminService.createLsm(dto);
  }

  /**
   * Update LSM information
   */
  @Put('lsms/:id')
  @ApiOperation({ summary: 'Update LSM information (name, region, status)' })
  @ApiResponse({ status: 200, description: 'LSM updated successfully' })
  @ApiResponse({ status: 404, description: 'LSM not found' })
  @ApiResponse({ status: 409, description: 'Region already has another LSM' })
  async updateLsm(
    @Param('id', ParseIntPipe) lsmId: number,
    @Body() dto: UpdateLsmDto,
  ) {
    return this.adminService.updateLsm(lsmId, dto);
  }

  /**
   * Replace LSM - Create new LSM and handle old one
   */
  @Post('lsms/:id/replace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Replace LSM with a new one (creates new LSM, reassigns providers, handles old LSM)'
  })
  @ApiResponse({ status: 200, description: 'LSM replaced successfully' })
  @ApiResponse({ status: 404, description: 'LSM not found' })
  @ApiResponse({ status: 409, description: 'Email already exists or region conflict' })
  async replaceLsm(
    @Param('id', ParseIntPipe) oldLsmId: number,
    @Body() dto: ReplaceLsmDto,
  ) {
    return this.adminService.replaceLsm(oldLsmId, dto);
  }

  /**
   * Deactivate/Delete LSM
   */
  @Delete('lsms/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate an LSM (cannot delete if has active providers)' })
  @ApiResponse({ status: 200, description: 'LSM deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete LSM with active providers' })
  @ApiResponse({ status: 404, description: 'LSM not found' })
  async deleteLsm(@Param('id', ParseIntPipe) lsmId: number) {
    return this.adminService.deleteLsm(lsmId);
  }

  // ==================== PROVIDER MANAGEMENT ====================

  /**
   * Get all providers with filters and search
   */
  @Get('providers')
  @ApiOperation({ summary: 'Get all service providers with filters' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getAllProviders(
    @Query('search') search?: string,
    @Query('region') region?: string,
    @Query('status') status?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getAllProviders({
      search,
      region,
      status,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxRating: maxRating ? parseFloat(maxRating) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc',
    });
  }

  /**
   * Get provider by ID with detailed stats
   */
  @Get('providers/:id')
  @ApiOperation({ summary: 'Get provider details by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProviderById(@Param('id', ParseIntPipe) providerId: number) {
    return this.adminService.getProviderById(providerId);
  }

  /**
   * Get/view a provider document
   */
  @Get('providers/:providerId/documents/:documentId')
  @ApiOperation({ summary: 'Get/view a provider document' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider or document not found' })
  async getProviderDocument(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    return this.adminService.getProviderDocument(providerId, documentId);
  }

  /**
   * Ban a service provider
   */
  @Post('providers/:id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a service provider' })
  @ApiResponse({ status: 200, description: 'Provider banned successfully' })
  @ApiResponse({ status: 400, description: 'Cannot ban provider with active jobs' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async banProvider(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) providerId: number,
    @Body() dto: BanProviderDto,
  ) {
    return this.adminService.banProvider(userId, providerId, dto);
  }

  /**
   * Unban a service provider
   */
  @Post('providers/:id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unban a service provider' })
  @ApiResponse({ status: 200, description: 'Provider unbanned successfully' })
  @ApiResponse({ status: 400, description: 'Provider is not banned' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async unbanProvider(@Param('id', ParseIntPipe) providerId: number) {
    return this.adminService.unbanProvider(providerId);
  }

  // ==================== DASHBOARD ====================

  /**
   * Get dashboard core statistics
   */
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get core dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  /**
   * Get recent activities feed
   */
  @Get('activities')
  @ApiOperation({ summary: 'Get recent activities/events on the platform' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async getActivities(
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getActivities(
      limit ? parseInt(limit) : 10,
      type,
    );
  }

  /**
   * Get pending approvals by type
   */
  @Get('pending-actions')
  @ApiOperation({ summary: 'Get count of pending approvals by type' })
  @ApiResponse({ status: 200, description: 'Pending actions retrieved successfully' })
  async getPendingActions() {
    return this.adminService.getPendingActions();
  }

  /**
   * Get revenue data for chart
   */
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue chart data by period' })
  @ApiResponse({ status: 200, description: 'Revenue data retrieved successfully' })
  async getRevenue(
    @Query('period') period?: string,
  ) {
    return this.adminService.getRevenue(period || '7days');
  }

  /**
   * Get admin dashboard overview
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard with all statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ==================== CUSTOMER MANAGEMENT ====================

  /**
   * Get all customers with filters
   */
  @Get('customers')
  @ApiOperation({ summary: 'Get all customers with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async getAllCustomers(
    @Query('search') search?: string,
    @Query('region') region?: string,
    @Query('minJobs') minJobs?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllCustomers({
      search,
      region,
      minJobs: minJobs ? parseInt(minJobs) : undefined,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get customer by ID with detailed information
   */
  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer details by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomerById(@Param('id', ParseIntPipe) customerId: number) {
    return this.adminService.getCustomerById(customerId);
  }

  /**
   * Ban a customer
   */
  @Post('customers/:id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a customer and cancel active jobs' })
  @ApiResponse({ status: 200, description: 'Customer banned successfully' })
  @ApiResponse({ status: 400, description: 'Customer is already banned' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async banCustomer(
    @Param('id', ParseIntPipe) customerId: number,
    @Body() dto: BanCustomerDto,
  ) {
    return this.adminService.banCustomer(customerId, dto.reason);
  }

  /**
   * Unban a customer
   */
  @Post('customers/:id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unban a customer' })
  @ApiResponse({ status: 200, description: 'Customer unbanned successfully' })
  @ApiResponse({ status: 400, description: 'Customer is not banned' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async unbanCustomer(@Param('id', ParseIntPipe) customerId: number) {
    return this.adminService.unbanCustomer(customerId);
  }

  // ==================== DISPUTES MANAGEMENT ====================

  /**
   * Get all disputes with filters
   */
  @Get('disputes')
  @ApiOperation({ summary: 'Get all disputes with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Disputes retrieved successfully' })
  async getAllDisputes(
    @Query('status') status?: string,
    @Query('region') region?: string,
    @Query('raisedBy') raisedBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllDisputes({
      status,
      region,
      raisedBy,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get dispute by ID with full details and chat history
   */
  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute details with chat history' })
  @ApiResponse({ status: 200, description: 'Dispute retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDisputeById(@Param('id', ParseIntPipe) disputeId: number) {
    return this.adminService.getDisputeById(disputeId);
  }

  // ==================== JOBS MONITORING ====================

  /**
   * Get all jobs with comprehensive filters
   */
  @Get('jobs')
  @ApiOperation({ summary: 'Get all jobs with filters for system-wide monitoring' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getAllJobs(
    @Query('status') status?: string,
    @Query('region') region?: string,
    @Query('service') service?: string,
    @Query('customerId') customerId?: string,
    @Query('providerId') providerId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllJobs({
      status,
      region,
      service,
      customerId: customerId ? parseInt(customerId) : undefined,
      providerId: providerId ? parseInt(providerId) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      fromDate,
      toDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ==================== BAN REQUESTS ====================

  /**
   * Get ban requests from LSMs
   */
  @Get('ban-requests')
  @ApiOperation({ summary: 'Get ban requests from LSMs' })
  @ApiResponse({ status: 200, description: 'Ban requests retrieved successfully' })
  async getBanRequests(
    @Query('status') status?: string,
    @Query('region') region?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getBanRequests({
      status,
      region,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Approve LSM ban request
   */
  @Post('ban-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve LSM ban request and ban the provider' })
  @ApiResponse({ status: 200, description: 'Ban request approved' })
  @ApiResponse({ status: 400, description: 'Request already reviewed or provider has active jobs' })
  @ApiResponse({ status: 404, description: 'Ban request not found' })
  async approveBanRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) requestId: number,
    @Body() dto: ApproveBanRequestDto,
  ) {
    return this.adminService.approveBanRequest(userId, requestId, dto.adminNotes);
  }

  /**
   * Reject LSM ban request
   */
  @Post('ban-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject LSM ban request' })
  @ApiResponse({ status: 200, description: 'Ban request rejected' })
  @ApiResponse({ status: 400, description: 'Request already reviewed' })
  @ApiResponse({ status: 404, description: 'Ban request not found' })
  async rejectBanRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) requestId: number,
    @Body() dto: RejectBanRequestDto,
  ) {
    return this.adminService.rejectBanRequest(userId, requestId, dto.adminNotes);
  }

  // ==================== REGIONAL REPORTS ====================

  /**
   * Get regional performance statistics
   */
  @Get('reports/regions')
  @ApiOperation({ summary: 'Get performance statistics for all regions' })
  @ApiResponse({ status: 200, description: 'Regional reports retrieved successfully' })
  async getRegionalReports() {
    return this.adminService.getRegionalReports();
  }

  // ==================== PLATFORM SETTINGS ====================

  /**
   * Get platform settings
   */
  @Get('settings')
  @ApiOperation({ summary: 'Get platform configuration settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  /**
   * Update platform settings
   */
  @Put('settings')
  @ApiOperation({ summary: 'Update platform configuration settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.adminService.updateSettings(userId, dto);
  }

  // ==================== REVIEW MANAGEMENT ====================

  /**
   * Get all reviews across the platform
   */
  @Get('reviews')
  @ApiOperation({ summary: 'Get all reviews with filters for platform monitoring' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getAllReviews(
    @Query('providerId') providerId?: string,
    @Query('customerId') customerId?: string,
    @Query('region') region?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllReviews({
      providerId: providerId ? parseInt(providerId) : undefined,
      customerId: customerId ? parseInt(customerId) : undefined,
      region,
      minRating: minRating ? parseInt(minRating) : undefined,
      maxRating: maxRating ? parseInt(maxRating) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get platform-wide review statistics
   */
  @Get('reviews/stats')
  @ApiOperation({ summary: 'Get platform-wide review statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getReviewStats() {
    return this.adminService.getReviewStats();
  }

  /**
   * Get specific review details
   */
  @Get('reviews/:id')
  @ApiOperation({ summary: 'Get review details by ID' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getReviewById(@Param('id', ParseIntPipe) reviewId: number) {
    return this.adminService.getReviewById(reviewId);
  }

  /**
   * Delete a review (for inappropriate content)
   */
  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete inappropriate review and recalculate provider rating' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(@Param('id', ParseIntPipe) reviewId: number) {
    return this.adminService.deleteReview(reviewId);
  }
}
