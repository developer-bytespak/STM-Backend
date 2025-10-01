import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderManagementDto } from './dto/provider-management.dto';
import { ProviderFiltersDto } from './dto/provider-filters.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { CreateServiceDto } from './dto/create-service.dto';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Provider created successfully', type: ProviderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('documents'))
  async create(
    @Body() createProviderDto: CreateProviderDto,
    @UploadedFiles() documents?: any[]
  ): Promise<ProviderResponseDto> {
    // Handle file uploads for documents
    if (documents && documents.length > 0) {
      createProviderDto.documents = documents;
    }
    return this.providersService.create(createProviderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all providers with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or location' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter by email' })
  @ApiQuery({ name: 'phone_number', required: false, description: 'Filter by phone number' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'tier', required: false, description: 'Filter by provider tier' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by provider status' })
  @ApiQuery({ name: 'is_active', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'lsm_id', required: false, description: 'Filter by Local Service Manager ID' })
  @ApiQuery({ name: 'is_email_verified', required: false, description: 'Filter by email verification status' })
  @ApiQuery({ name: 'min_rating', required: false, description: 'Filter by minimum rating' })
  @ApiQuery({ name: 'max_rating', required: false, description: 'Filter by maximum rating' })
  @ApiQuery({ name: 'min_experience', required: false, description: 'Filter by minimum experience' })
  @ApiQuery({ name: 'max_experience', required: false, description: 'Filter by maximum experience' })
  @ApiQuery({ name: 'min_total_jobs', required: false, description: 'Filter by minimum total jobs' })
  @ApiQuery({ name: 'max_total_jobs', required: false, description: 'Filter by maximum total jobs' })
  @ApiQuery({ name: 'min_earnings', required: false, description: 'Filter by minimum earnings' })
  @ApiQuery({ name: 'max_earnings', required: false, description: 'Filter by maximum earnings' })
  @ApiQuery({ name: 'created_from', required: false, description: 'Filter by created date from' })
  @ApiQuery({ name: 'created_to', required: false, description: 'Filter by created date to' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sort_order', required: false, description: 'Sort order (asc/desc)' })
  async findAll(@Query() filters: ProviderFiltersDto): Promise<{ data: ProviderResponseDto[]; total: number; page: number; limit: number }> {
    return this.providersService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get provider statistics' })
  @ApiResponse({ status: 200, description: 'Provider statistics retrieved successfully' })
  async getProviderStats(): Promise<any> {
    return this.providersService.getProviderStats();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get provider by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully', type: ProviderResponseDto })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async findByUserId(@Param('userId', ParseIntPipe) userId: number): Promise<ProviderResponseDto> {
    return this.providersService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully', type: ProviderResponseDto })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ProviderResponseDto> {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update provider by ID' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully', type: ProviderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('documents'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProviderDto: UpdateProviderDto,
    @UploadedFiles() documents?: any[]
  ): Promise<ProviderResponseDto> {
    if (documents && documents.length > 0) {
      updateProviderDto.documents = documents;
    }
    return this.providersService.update(id, updateProviderDto);
  }

  @Patch(':id/management')
  @ApiOperation({ summary: 'Update provider management (status, tier, LSM assignment)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider management updated successfully', type: ProviderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async updateManagement(
    @Param('id', ParseIntPipe) id: number,
    @Body() managementDto: ProviderManagementDto
  ): Promise<ProviderResponseDto> {
    return this.providersService.updateManagement(id, managementDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete provider by ID' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 204, description: 'Provider deleted successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.providersService.remove(id);
  }

  // Service Management Endpoints
  @Get(':id/services')
  @ApiOperation({ summary: 'Get provider services (created and available)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider services retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProviderServices(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.providersService.getProviderServices(id);
  }

  @Post(':id/services')
  @ApiOperation({ summary: 'Create new service (requires LSM approval)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 201, description: 'Service created and submitted for approval' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('documents'))
  async createService(
    @Param('id', ParseIntPipe) id: number,
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFiles() documents?: any[]
  ): Promise<any> {
    if (documents && documents.length > 0) {
      createServiceDto.documents = documents;
    }
    return this.providersService.createService(id, createServiceDto);
  }
}
