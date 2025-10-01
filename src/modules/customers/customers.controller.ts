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
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFiltersDto } from './dto/customer-filters.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully', type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  @UseInterceptors(FileInterceptor('profile_picture'))
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @UploadedFile() profilePicture?: any
  ): Promise<CustomerResponseDto> {
    if (profilePicture) {
      createCustomerDto.profile_picture = profilePicture.buffer;
    }
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter by email' })
  @ApiQuery({ name: 'phone_number', required: false, description: 'Filter by phone number' })
  @ApiQuery({ name: 'retention_status', required: false, description: 'Filter by retention status' })
  @ApiQuery({ name: 'is_email_verified', required: false, description: 'Filter by email verification status' })
  @ApiQuery({ name: 'min_total_jobs', required: false, description: 'Filter by minimum total jobs' })
  @ApiQuery({ name: 'max_total_jobs', required: false, description: 'Filter by maximum total jobs' })
  @ApiQuery({ name: 'min_total_spent', required: false, description: 'Filter by minimum total spent' })
  @ApiQuery({ name: 'max_total_spent', required: false, description: 'Filter by maximum total spent' })
  @ApiQuery({ name: 'created_from', required: false, description: 'Filter by created date from' })
  @ApiQuery({ name: 'created_to', required: false, description: 'Filter by created date to' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'sort_by', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sort_order', required: false, description: 'Sort order (asc/desc)' })
  async findAll(@Query() filters: CustomerFiltersDto): Promise<{ data: CustomerResponseDto[]; total: number; page: number; limit: number }> {
    return this.customersService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  @ApiResponse({ status: 200, description: 'Customer statistics retrieved successfully' })
  async getCustomerStats(): Promise<any> {
    return this.customersService.getCustomerStats();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get customer by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findByUserId(@Param('userId', ParseIntPipe) userId: number): Promise<CustomerResponseDto> {
    return this.customersService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CustomerResponseDto> {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully', type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  @UseInterceptors(FileInterceptor('profile_picture'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @UploadedFile() profilePicture?: any
  ): Promise<CustomerResponseDto> {
    if (profilePicture) {
      updateCustomerDto.profile_picture = profilePicture.buffer;
    }
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 204, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.customersService.remove(id);
  }
}
