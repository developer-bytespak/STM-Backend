import {
  Controller,
  Post,
  Get,
  Body,
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
}