import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OfficeRealEstateService } from './office-real-estate.service';
import { CreateOfficeSpaceDto } from './dto/create-office-space.dto';
import { UpdateOfficeSpaceDto } from './dto/update-office-space.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles } from '../oauth/decorators/roles.decorator';
import { CurrentUser } from '../oauth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';

// ==================== ADMIN OFFICE CONTROLLER ====================

@Controller('admin/offices')
@ApiTags('admin-offices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminOfficeController {
  constructor(private readonly officeService: OfficeRealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all office spaces (Admin)' })
  @ApiResponse({ status: 200, description: 'List of all office spaces' })
  async getAllOffices() {
    return this.officeService.getAllOffices();
  }

  @Post()
  @ApiOperation({ summary: 'Create new office space' })
  @ApiResponse({ status: 201, description: 'Office space created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @HttpCode(HttpStatus.CREATED)
  async createOffice(
    @Body() createDto: CreateOfficeSpaceDto,
    @CurrentUser() user: any,
  ) {
    return this.officeService.createOfficeSpace(createDto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get office space by ID' })
  @ApiResponse({ status: 200, description: 'Office space details' })
  @ApiResponse({ status: 404, description: 'Office space not found' })
  async getOfficeById(@Param('id') id: string) {
    return this.officeService.getOfficeById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update office space' })
  @ApiResponse({ status: 200, description: 'Office space updated successfully' })
  @ApiResponse({ status: 404, description: 'Office space not found' })
  async updateOffice(
    @Param('id') id: string,
    @Body() updateDto: UpdateOfficeSpaceDto,
    @CurrentUser() user: any,
  ) {
    return this.officeService.updateOfficeSpace(id, updateDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete office space' })
  @ApiResponse({ status: 200, description: 'Office space deleted successfully' })
  @ApiResponse({ status: 404, description: 'Office space not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete office with active bookings',
  })
  async deleteOffice(@Param('id') id: string) {
    return this.officeService.deleteOfficeSpace(id);
  }

  @Post('cleanup-duplicates')
  @ApiOperation({ summary: 'Clean up duplicate bookings' })
  @ApiResponse({ status: 200, description: 'Duplicate bookings cleaned up successfully' })
  async cleanupDuplicateBookings() {
    return this.officeService.cleanupDuplicateBookings();
  }
}

// ==================== PROVIDER OFFICE CONTROLLER ====================

@Controller('provider/offices')
@ApiTags('provider-offices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
@ApiBearerAuth()
export class ProviderOfficeController {
  constructor(private readonly officeService: OfficeRealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'Browse available office spaces' })
  @ApiResponse({
    status: 200,
    description: 'List of available office spaces',
  })
  async getAvailableOffices() {
    return this.officeService.getAvailableOffices();
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get office availability for date picker' })
  @ApiResponse({
    status: 200,
    description: 'Office availability data',
  })
  async getOfficeAvailability(@Param('id') id: string) {
    return this.officeService.getOfficeAvailability(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get office space details' })
  @ApiResponse({ status: 200, description: 'Office space details' })
  @ApiResponse({ status: 404, description: 'Office space not found' })
  async getOfficeById(@Param('id') id: string) {
    return this.officeService.getOfficeById(id);
  }
}

// ==================== ADMIN BOOKING CONTROLLER ====================

@Controller('admin/office-bookings')
@ApiTags('admin-bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminBookingController {
  constructor(private readonly officeService: OfficeRealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bookings (Admin)' })
  @ApiResponse({ status: 200, description: 'List of all bookings' })
  async getAllBookings() {
    return this.officeService.getAllBookings();
  }

  @Put(':id/confirm')
  @ApiOperation({ summary: 'Confirm a booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Booking cannot be confirmed' })
  async confirmBooking(@Param('id') id: string) {
    return this.officeService.confirmBooking(id);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Complete a booking' })
  @ApiResponse({ status: 200, description: 'Booking completed successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Booking cannot be completed' })
  async completeBooking(@Param('id') id: string) {
    return this.officeService.completeBooking(id);
  }

  @Post('cleanup/orphaned')
  @ApiOperation({ summary: 'Clean up orphaned bookings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Orphaned bookings cleaned up successfully' })
  @HttpCode(HttpStatus.OK)
  async cleanupOrphanedBookings() {
    return this.officeService.cleanupOrphanedBookings();
  }
}

// ==================== PROVIDER BOOKING CONTROLLER ====================

@Controller('provider/office-bookings')
@ApiTags('provider-bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
@ApiBearerAuth()
export class ProviderBookingController {
  constructor(private readonly officeService: OfficeRealEstateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Office space not found' })
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Body() createDto: CreateBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.officeService.createBooking(createDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get my bookings' })
  @ApiResponse({ status: 200, description: 'List of provider bookings' })
  async getMyBookings(@CurrentUser() user: any) {
    return this.officeService.getProviderBookings(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getBookingById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.officeService.getBookingById(id, user.id, user.role);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (Provider)' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel booking' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  async cancelBooking(@Param('id') id: string, @CurrentUser() user: any) {
    return this.officeService.cancelBooking(id, user.id);
  }
}
