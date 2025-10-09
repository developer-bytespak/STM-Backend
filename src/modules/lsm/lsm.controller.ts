import {
  Controller,
  Get,
  Post,
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
import { LsmService } from './lsm.service';
import { RejectServiceRequestDto } from './dto/reject-service-request.dto';
import { DocumentActionDto } from './dto/document-action.dto';
import { SetProviderStatusDto } from './dto/set-provider-status.dto';
import { RequestBanDto } from './dto/request-ban.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('lsm')
@ApiTags('lsm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LSM)
@ApiBearerAuth()
export class LsmController {
  constructor(private readonly lsmService: LsmService) {}

  /**
   * Get pending service requests in region
   */
  @Get('service-requests/pending')
  @ApiOperation({ summary: 'Get pending service requests in LSM region' })
  @ApiResponse({ status: 200, description: 'Requests retrieved successfully' })
  async getPendingServiceRequests(@CurrentUser('id') userId: number) {
    return this.lsmService.getPendingServiceRequests(userId);
  }

  /**
   * Approve a service request
   */
  @Post('service-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a service request (sends to admin)' })
  @ApiResponse({ status: 200, description: 'Request approved successfully' })
  @ApiResponse({ status: 403, description: 'Request not in your region' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async approveServiceRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) requestId: number,
  ) {
    return this.lsmService.approveServiceRequest(userId, requestId);
  }

  /**
   * Reject a service request
   */
  @Post('service-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a service request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully' })
  @ApiResponse({ status: 403, description: 'Request not in your region' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async rejectServiceRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) requestId: number,
    @Body() dto: RejectServiceRequestDto,
  ) {
    return this.lsmService.rejectServiceRequest(userId, requestId, dto);
  }

  /**
   * Get all providers in region
   */
  @Get('providers')
  @ApiOperation({ summary: 'Get all service providers in LSM region' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getProvidersInRegion(@CurrentUser('id') userId: number) {
    return this.lsmService.getProvidersInRegion(userId);
  }

  /**
   * Verify or reject provider document
   */
  @Post('providers/:providerId/documents/:documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify or reject a provider document' })
  @ApiResponse({ status: 200, description: 'Document action completed' })
  @ApiResponse({ status: 403, description: 'Provider not in your region' })
  @ApiResponse({ status: 404, description: 'Provider or document not found' })
  async handleDocument(
    @CurrentUser('id') userId: number,
    @Param('providerId', ParseIntPipe) providerId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: DocumentActionDto,
  ) {
    return this.lsmService.handleDocument(userId, providerId, documentId, dto);
  }

  // ==================== DASHBOARD ====================

  /**
   * Get LSM dashboard overview
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get LSM dashboard with region statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@CurrentUser('id') userId: number) {
    return this.lsmService.getDashboard(userId);
  }

  // ==================== ONBOARDING MANAGEMENT ====================

  /**
   * Get pending provider onboarding applications
   */
  @Get('onboarding/pending')
  @ApiOperation({ summary: 'Get pending provider onboarding applications in region' })
  @ApiResponse({ status: 200, description: 'Pending providers retrieved successfully' })
  async getPendingOnboarding(@CurrentUser('id') userId: number) {
    return this.lsmService.getPendingOnboarding(userId);
  }

  /**
   * Get provider details
   */
  @Get('providers/:id')
  @ApiOperation({ summary: 'Get provider details by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Provider not in your region' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProviderDetails(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) providerId: number,
  ) {
    return this.lsmService.getProviderDetails(userId, providerId);
  }

  /**
   * Approve provider onboarding (manual approval after documents verified)
   */
  @Post('providers/:id/approve-onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve provider onboarding and activate account' })
  @ApiResponse({ status: 200, description: 'Provider approved and activated' })
  @ApiResponse({ status: 400, description: 'Not all documents verified' })
  @ApiResponse({ status: 403, description: 'Provider not in your region' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async approveOnboarding(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) providerId: number,
  ) {
    return this.lsmService.approveOnboarding(userId, providerId);
  }

  /**
   * Set provider status (active/inactive)
   */
  @Post('providers/:id/set-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set provider status (activate or deactivate)' })
  @ApiResponse({ status: 200, description: 'Provider status updated successfully' })
  @ApiResponse({ status: 400, description: 'Active jobs exist without force flag' })
  @ApiResponse({ status: 403, description: 'Provider not in your region' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async setProviderStatus(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) providerId: number,
    @Body() dto: SetProviderStatusDto,
  ) {
    return this.lsmService.setProviderStatus(userId, providerId, dto);
  }

  /**
   * Request admin to ban provider
   */
  @Post('providers/:id/request-ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request admin to ban a provider' })
  @ApiResponse({ status: 200, description: 'Ban request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Ban request already pending or provider banned' })
  @ApiResponse({ status: 403, description: 'Provider not in your region' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async requestBan(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) providerId: number,
    @Body() dto: RequestBanDto,
  ) {
    return this.lsmService.requestBan(userId, providerId, dto);
  }

  // ==================== DISPUTE MANAGEMENT ====================

  /**
   * Get disputes in region
   */
  @Get('disputes')
  @ApiOperation({ summary: 'Get all disputes in LSM region' })
  @ApiResponse({ status: 200, description: 'Disputes retrieved successfully' })
  async getDisputes(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lsmService.getDisputes(userId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get dispute details with chat history
   */
  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute details with chat history' })
  @ApiResponse({ status: 200, description: 'Dispute retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Dispute not in your region' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDisputeDetails(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) disputeId: number,
  ) {
    return this.lsmService.getDisputeDetails(userId, disputeId);
  }

  /**
   * Join dispute chat (accept invitation)
   */
  @Post('disputes/:id/join-chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept dispute invitation and join chat' })
  @ApiResponse({ status: 200, description: 'Successfully joined chat' })
  @ApiResponse({ status: 400, description: 'Not invited or already joined' })
  @ApiResponse({ status: 403, description: 'Dispute not in your region' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async joinDisputeChat(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) disputeId: number,
  ) {
    return this.lsmService.joinDisputeChat(userId, disputeId);
  }

  /**
   * Resolve dispute
   */
  @Post('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a dispute with decision notes' })
  @ApiResponse({ status: 200, description: 'Dispute resolved successfully' })
  @ApiResponse({ status: 400, description: 'Dispute already resolved' })
  @ApiResponse({ status: 403, description: 'Dispute not in your region' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async resolveDispute(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) disputeId: number,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.lsmService.resolveDispute(userId, disputeId, dto);
  }

  // ==================== JOBS MONITORING ====================

  /**
   * Get all jobs in region
   */
  @Get('jobs')
  @ApiOperation({ summary: 'Get all jobs in LSM region with filters' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobsInRegion(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lsmService.getJobsInRegion(userId, {
      status,
      providerId: providerId ? parseInt(providerId) : undefined,
      fromDate,
      toDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ==================== SERVICE REQUESTS HISTORY ====================

  /**
   * Get all service requests (full history)
   */
  @Get('service-requests')
  @ApiOperation({ summary: 'Get all service requests in region (not just pending)' })
  @ApiResponse({ status: 200, description: 'Service requests retrieved successfully' })
  async getServiceRequestsHistory(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lsmService.getServiceRequestsHistory(userId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}