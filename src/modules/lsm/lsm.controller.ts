import {
  Controller,
  Get,
  Post,
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
import { LsmService } from './lsm.service';
import { RejectServiceRequestDto } from './dto/reject-service-request.dto';
import { DocumentActionDto } from './dto/document-action.dto';
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
}