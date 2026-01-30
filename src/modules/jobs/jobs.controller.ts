import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
import { JobsService } from './jobs.service';
import { CreateJobDto, ReassignJobDto, RespondJobDto } from './dto';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller()
@ApiTags('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ==================== CUSTOMER ENDPOINTS ====================

  /**
   * Create a new job
   */
  @Post('jobs/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new job booking' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Service or provider not found' })
  async createJob(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.createJob(userId, dto);
  }

  /**
   * Get all customer jobs
   */
  @Get('customer/jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all jobs for current customer' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getCustomerJobs(@CurrentUser('id') userId: number) {
    return this.jobsService.getCustomerJobs(userId);
  }

  /**
   * Reassign job to different provider
   */
  @Post('jobs/:id/reassign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reassign job to a different service provider' })
  @ApiResponse({ status: 200, description: 'Job reassigned successfully' })
  @ApiResponse({ status: 400, description: 'Cannot reassign this job' })
  @ApiResponse({ status: 403, description: 'Not your job' })
  @ApiResponse({ status: 404, description: 'Job or provider not found' })
  async reassignJob(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) jobId: number,
    @Body() dto: ReassignJobDto,
  ) {
    return this.jobsService.reassignJob(userId, jobId, dto);
  }

  // ==================== PROVIDER ENDPOINTS ====================

  /**
   * Get pending job requests for provider
   */
  @Get('provider/pending-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending job requests for current provider' })
  @ApiResponse({ status: 200, description: 'Pending jobs retrieved successfully' })
  async getProviderPendingJobs(@CurrentUser('id') userId: number) {
    return this.jobsService.getProviderPendingJobs(userId);
  }

  /**
   * NOTE: GET provider/jobs is handled by ProvidersController (GET /provider/jobs) with
   * pagination and status filter. Do not add a duplicate route here - it would conflict
   * and return only in_progress/completed (no 'new' requests), breaking the provider jobs page.
   */

  /**
   * Respond to a job (accept or reject)
   */
  @Post('provider/jobs/:id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or reject a job request' })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action or already responded' })
  @ApiResponse({ status: 403, description: 'Not your job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async respondToJob(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) jobId: number,
    @Body() dto: RespondJobDto,
  ) {
    return this.jobsService.respondToJob(userId, jobId, dto);
  }

  /**
   * Resend job request to same provider
   * Extends deadline and notifies provider again
   */
  @Post('jobs/:id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend pending job request to same provider' })
  @ApiResponse({ status: 200, description: 'Job request resent successfully' })
  @ApiResponse({ status: 400, description: 'Cannot resend this job' })
  @ApiResponse({ status: 403, description: 'Not your job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async resendJobRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) jobId: number,
  ) {
    return this.jobsService.resendJobRequest(userId, jobId);
  }
}
