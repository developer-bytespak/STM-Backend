import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
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
import { UpdateServiceDto } from './dto/update-service.dto';
import { BanProviderDto } from './dto/ban-provider.dto';
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
   * Create a new LSM
   */
  @Post('lsm/create')
  @ApiOperation({ summary: 'Create a new Local Service Manager' })
  @ApiResponse({ status: 201, description: 'LSM created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists or region has LSM' })
  async createLsm(@Body() dto: CreateLsmDto) {
    return this.adminService.createLsm(dto);
  }

  // ==================== PROVIDER MANAGEMENT ====================

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
}
