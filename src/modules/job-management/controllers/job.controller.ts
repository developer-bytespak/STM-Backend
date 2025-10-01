import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../../oauth/guards/roles.guard';
import { Roles, CurrentUser } from '../../oauth/decorators';
import { UserRole } from '../../users/enums/user-role.enum';

/**
 * Job Controller - Testing RBAC
 * 
 * Role Permissions:
 * - CUSTOMER: Create jobs, view own jobs
 * - PROVIDER: View assigned jobs, update job status
 * - LSM: View all jobs in region, assign jobs
 * - ADMIN: Full access (bypasses all restrictions)
 */
@Controller('jobs')
@ApiTags('Jobs')
@ApiBearerAuth()
export class JobController {
  
  /**
   * Create a new job
   * ✅ CUSTOMER only (Admin bypasses)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Create a new job (Customer only)' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customer role required' })
  async createJob(@CurrentUser() user, @Body() jobData: any) {
    return {
      message: '✅ Job created successfully!',
      createdBy: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      job: {
        id: 1,
        description: jobData.description || 'Sample job',
        status: 'pending',
        customerId: user.id,
      },
      note: 'RBAC working! Only customers (or admins) can create jobs.',
    };
  }

  /**
   * Get jobs for current customer
   * ✅ CUSTOMER only
   */
  @Get('my-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get my jobs (Customer only)' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved' })
  async getMyJobs(@CurrentUser() user) {
    return {
      message: '✅ Your jobs retrieved',
      customerId: user.id,
      role: user.role,
      jobs: [
        { id: 1, description: 'Fix sink', status: 'pending' },
        { id: 2, description: 'Paint wall', status: 'completed' },
      ],
    };
  }

  /**
   * Get assigned jobs for current provider
   * ✅ PROVIDER only
   */
  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Get assigned jobs (Provider only)' })
  @ApiResponse({ status: 200, description: 'Assigned jobs retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Provider role required' })
  async getAssignedJobs(@CurrentUser() user) {
    return {
      message: '✅ Assigned jobs retrieved',
      providerId: user.id,
      role: user.role,
      jobs: [
        { id: 1, description: 'Fix sink', status: 'in_progress', customer: 'John Doe' },
        { id: 3, description: 'Install lights', status: 'assigned', customer: 'Jane Smith' },
      ],
      note: 'RBAC working! Only providers (or admins) can see this.',
    };
  }

  /**
   * Update job status
   * ✅ PROVIDER only
   */
  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Update job status (Provider only)' })
  @ApiResponse({ status: 200, description: 'Job status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Provider role required' })
  async updateJobStatus(
    @Param('id', ParseIntPipe) jobId: number,
    @CurrentUser() user,
    @Body() statusData: any,
  ) {
    return {
      message: '✅ Job status updated!',
      jobId,
      newStatus: statusData.status || 'completed',
      updatedBy: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      note: 'RBAC working! Only providers (or admins) can update job status.',
    };
  }

  /**
   * View all jobs (for management)
   * ✅ LSM and ADMIN only
   */
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LSM, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all jobs (LSM/Admin only)' })
  @ApiResponse({ status: 200, description: 'All jobs retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - LSM or Admin role required' })
  async getAllJobs(@CurrentUser() user) {
    return {
      message: '✅ All jobs retrieved',
      viewedBy: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      totalJobs: 10,
      jobs: [
        { id: 1, description: 'Fix sink', status: 'pending', customer: 'John Doe' },
        { id: 2, description: 'Paint wall', status: 'completed', customer: 'Jane Smith' },
        { id: 3, description: 'Install lights', status: 'assigned', provider: 'Bob Builder' },
      ],
      note: 'RBAC working! Only LSM/Admin can see all jobs.',
    };
  }

  /**
   * Delete a job
   * ✅ ADMIN only
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a job (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async deleteJob(
    @Param('id', ParseIntPipe) jobId: number,
    @CurrentUser() user,
  ) {
    return {
      message: '✅ Job deleted!',
      jobId,
      deletedBy: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      note: 'RBAC working! Only admins can delete jobs.',
    };
  }

  /**
   * Test endpoint - Any authenticated user
   * ✅ No role restriction (but requires authentication)
   */
  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Test authentication (any authenticated user)' })
  @ApiResponse({ status: 200, description: 'Authentication working' })
  async testAuth(@CurrentUser() user) {
    return {
      message: '✅ You are authenticated!',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      note: 'This endpoint requires authentication but no specific role.',
    };
  }
}
