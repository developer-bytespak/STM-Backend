import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOfficeSpaceDto } from './dto/create-office-space.dto';
import { UpdateOfficeSpaceDto } from './dto/update-office-space.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class OfficeRealEstateService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== OFFICE SPACE CRUD ====================

  /**
   * Create a new office space (Admin only)
   */
  async createOfficeSpace(createDto: CreateOfficeSpaceDto, adminId: number) {
    const office = await this.prisma.office_spaces.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        type: createDto.type || 'private_office',
        status: 'available' as any,
        address: createDto.location.address,
        city: createDto.location.city,
        state: createDto.location.state,
        zip_code: createDto.location.zipCode,
        capacity: createDto.capacity,
        area_sqft: createDto.area,
        daily_price: createDto.dailyPrice,
        availability: createDto.availability as any,
        images: (createDto.images || []) as any,
        creator: {
          connect: { id: adminId },
        },
      },
    });

    return this.formatOfficeResponse(office);
  }

  /**
   * Get all office spaces (Admin)
   */
  async getAllOffices() {
    const offices = await this.prisma.office_spaces.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      offices: offices.map((office) => this.formatOfficeResponse(office)),
      total: offices.length,
    };
  }

  /**
   * Get office availability for date picker (Provider)
   */
  async getOfficeAvailability(officeId: string) {
    console.log('Getting availability for office:', officeId);
    
    // Get all bookings for this office
    const bookings = await this.prisma.office_bookings.findMany({
      where: {
        office_space_id: officeId,
        status: {
          in: ['pending', 'confirmed']
        }
      },
      select: {
        start_date: true,
        end_date: true,
        status: true
      },
      orderBy: {
        start_date: 'asc'
      }
    });

    console.log('Found bookings:', bookings);

    // Transform to frontend-friendly format
    const unavailableDates = bookings.map(booking => ({
      start: booking.start_date.toISOString().split('T')[0], // YYYY-MM-DD format
      end: booking.end_date.toISOString().split('T')[0],
      status: booking.status
    }));

    return {
      success: true,
      officeId,
      unavailableDates,
      totalBookings: bookings.length
    };
  }

  /**
   * Get available office spaces (Provider)
   */
  async getAvailableOffices() {
    const offices = await this.prisma.office_spaces.findMany({
      where: { status: 'available' as any },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      offices: offices.map((office) => this.formatOfficeResponse(office)),
    };
  }

  /**
   * Get single office space by ID
   */
  async getOfficeById(id: string) {
    const office = await this.prisma.office_spaces.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        bookings: {
          select: {
            id: true,
            start_date: true,
            end_date: true,
            status: true,
          },
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });

    if (!office) {
      throw new NotFoundException(`Office space with ID ${id} not found`);
    }

    return {
      success: true,
      office: this.formatOfficeResponse(office),
    };
  }

  /**
   * Update office space (Admin only)
   */
  async updateOfficeSpace(
    id: string,
    updateDto: UpdateOfficeSpaceDto,
    adminId: number,
  ) {
    const office = await this.prisma.office_spaces.findUnique({
      where: { id },
    });

    if (!office) {
      throw new NotFoundException(`Office space with ID ${id} not found`);
    }

    const updateData: any = {};

    if (updateDto.name) updateData.name = updateDto.name;
    if (updateDto.description) updateData.description = updateDto.description;
    if (updateDto.type) updateData.type = updateDto.type;
    if (updateDto.status) updateData.status = updateDto.status;
    if (updateDto.location) {
      updateData.address = updateDto.location.address;
      updateData.city = updateDto.location.city;
      updateData.state = updateDto.location.state;
      updateData.zip_code = updateDto.location.zipCode;
    }
    if (updateDto.capacity !== undefined) updateData.capacity = updateDto.capacity;
    if (updateDto.area !== undefined) updateData.area_sqft = updateDto.area;
    if (updateDto.dailyPrice !== undefined)
      updateData.daily_price = updateDto.dailyPrice;
    if (updateDto.availability) updateData.availability = updateDto.availability;
    if (updateDto.images) updateData.images = updateDto.images;

    const updatedOffice = await this.prisma.office_spaces.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      message: 'Office space updated successfully',
      office: this.formatOfficeResponse(updatedOffice),
    };
  }

  /**
   * Delete office space (Admin only)
   */
  async deleteOfficeSpace(id: string) {
    const office = await this.prisma.office_spaces.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: {
              in: ['pending', 'confirmed'],
            },
          },
        },
      },
    });

    if (!office) {
      throw new NotFoundException(`Office space with ID ${id} not found`);
    }

    // Check for active bookings
    if (office.bookings && office.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete office space with active or pending bookings',
      );
    }

    await this.prisma.office_spaces.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Office space deleted successfully',
    };
  }

  // ==================== BOOKING MANAGEMENT ====================

  /**
   * Clean up duplicate bookings (Admin only)
   */
  async cleanupDuplicateBookings() {
    console.log('Cleaning up duplicate bookings...');
    
    // Find all bookings grouped by office and date range
    const allBookings = await this.prisma.office_bookings.findMany({
      where: {
        status: {
          in: ['pending', 'confirmed']
        }
      },
      orderBy: [
        { office_space_id: 'asc' },
        { start_date: 'asc' },
        { created_at: 'asc' }
      ]
    });

    const duplicates = [];
    const processed = new Set();

    for (let i = 0; i < allBookings.length; i++) {
      const booking = allBookings[i];
      const key = `${booking.office_space_id}-${booking.start_date.toISOString()}-${booking.end_date.toISOString()}`;
      
      if (processed.has(key)) {
        duplicates.push(booking);
      } else {
        processed.add(key);
      }
    }

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate bookings:`, duplicates);
      
      // Delete duplicate bookings (keep the first one created)
      const duplicateIds = duplicates.map(b => b.id);
      await this.prisma.office_bookings.deleteMany({
        where: {
          id: {
            in: duplicateIds
          }
        }
      });
      
      console.log(`Deleted ${duplicates.length} duplicate bookings`);
    } else {
      console.log('No duplicate bookings found');
    }

    return { duplicatesFound: duplicates.length, duplicatesDeleted: duplicates.length };
  }

  /**
   * Create a booking (Provider)
   */
  async createBooking(createDto: CreateBookingDto, providerId: number) {
    console.log('=== BOOKING REQUEST RECEIVED ===');
    console.log('CreateDto:', createDto);
    console.log('ProviderId:', providerId);
    
    // Get office space
    const office = await this.prisma.office_spaces.findUnique({
      where: { id: createDto.officeSpaceId },
    });

    if (!office) {
      throw new NotFoundException('Office space not found');
    }

    // Check if office is available
    if (office.status !== 'available') {
      throw new BadRequestException('Office space is not available for booking');
    }

    // Get provider details
    const provider = await this.prisma.users.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Validate dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);
    const now = new Date();
    
    // More lenient date validation - only reject clearly past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Add 1 day buffer to account for timezone differences
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Debug logging
    console.log('Booking date validation:', {
      receivedStartDate: createDto.startDate,
      parsedStartDate: startDate.toISOString(),
      startOfDay: startOfDay.toISOString(),
      today: today.toISOString(),
      yesterday: yesterday.toISOString(),
      now: now.toISOString(),
      isStartInPast: startOfDay < yesterday
    });

    // Only reject if start date is clearly in the past (yesterday or earlier)
    if (startOfDay < yesterday) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for existing bookings that conflict with the requested dates
    const conflictingBookings = await this.prisma.office_bookings.findMany({
      where: {
        office_space_id: createDto.officeSpaceId,
        status: {
          in: ['pending', 'confirmed']
        },
        OR: [
          // New booking starts during an existing booking
          {
            AND: [
              { start_date: { lte: startDate } },
              { end_date: { gt: startDate } }
            ]
          },
          // New booking ends during an existing booking
          {
            AND: [
              { start_date: { lt: endDate } },
              { end_date: { gte: endDate } }
            ]
          },
          // New booking completely contains an existing booking
          {
            AND: [
              { start_date: { gte: startDate } },
              { end_date: { lte: endDate } }
            ]
          },
          // Existing booking completely contains the new booking
          {
            AND: [
              { start_date: { lte: startDate } },
              { end_date: { gte: endDate } }
            ]
          }
        ]
      }
    });

    if (conflictingBookings.length > 0) {
      console.log('Conflicting bookings found:', conflictingBookings);
      throw new BadRequestException(
        `This office space is already booked for the selected dates. Please choose different dates.`
      );
    }

    console.log('No conflicting bookings found, proceeding with booking creation...');

    // Calculate duration and total amount
    const durationDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dailyRate = Number(office.daily_price);
    const totalAmount = durationDays * dailyRate;

    // Create booking
    const booking = await this.prisma.office_bookings.create({
      data: {
        office_space_id: office.id,
        provider_id: providerId,
        office_name: office.name,
        provider_name: `${provider.first_name} ${provider.last_name}`,
        provider_email: provider.email,
        start_date: startDate,
        end_date: endDate,
        duration: durationDays,
        duration_type: 'daily',
        daily_rate: dailyRate,
        total_amount: totalAmount,
        status: 'pending' as any,
        payment_status: 'pending',
        special_requests: createDto.specialRequests,
      },
    });

    return {
      success: true,
      message: 'Booking created successfully',
      booking: this.formatBookingResponse(booking),
    };
  }

  /**
   * Get all bookings (Admin)
   */
  async getAllBookings() {
    const bookings = await this.prisma.office_bookings.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        office_space: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
        provider: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      bookings: bookings.map((booking) => this.formatBookingResponse(booking)),
      total: bookings.length,
    };
  }

  /**
   * Get provider's own bookings
   */
  async getProviderBookings(providerId: number) {
    const bookings = await this.prisma.office_bookings.findMany({
      where: { provider_id: providerId },
      orderBy: { created_at: 'desc' },
      include: {
        office_space: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zip_code: true,
            capacity: true,
            area_sqft: true,
            images: true,
          },
        },
      },
    });

    return {
      success: true,
      bookings: bookings.map((booking) => this.formatBookingResponse(booking)),
    };
  }

  /**
   * Get single booking by ID
   */
  async getBookingById(id: string, userId: number, role: string) {
    const booking = await this.prisma.office_bookings.findUnique({
      where: { id },
      include: {
        office_space: true,
        provider: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check authorization
    if (role !== 'admin' && booking.provider_id !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return {
      success: true,
      booking: this.formatBookingResponse(booking),
    };
  }

  /**
   * Confirm booking (Admin only)
   */
  async confirmBooking(id: string) {
    const booking = await this.prisma.office_bookings.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'pending') {
      throw new BadRequestException(
        `Booking is already ${booking.status} and cannot be confirmed`,
      );
    }

    const updatedBooking = await this.prisma.office_bookings.update({
      where: { id },
      data: {
        status: 'confirmed' as any,
        payment_status: 'paid', // Auto-mark as paid for MVP
      },
    });

    return {
      success: true,
      message: 'Booking confirmed successfully',
      booking: this.formatBookingResponse(updatedBooking),
    };
  }

  /**
   * Complete booking (Admin only)
   */
  async completeBooking(id: string) {
    const booking = await this.prisma.office_bookings.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'confirmed') {
      throw new BadRequestException(
        'Only confirmed bookings can be marked as completed',
      );
    }

    const updatedBooking = await this.prisma.office_bookings.update({
      where: { id },
      data: {
        status: 'completed' as any,
      },
    });

    // Update office space booking count
    await this.prisma.office_spaces.update({
      where: { id: booking.office_space_id },
      data: {
        total_bookings: {
          increment: 1,
        },
      },
    });

    return {
      success: true,
      message: 'Booking completed successfully',
      booking: this.formatBookingResponse(updatedBooking),
    };
  }

  // ==================== HELPER METHODS ====================

  private formatOfficeResponse(office: any) {
    return {
      id: office.id,
      name: office.name,
      description: office.description,
      type: office.type,
      status: office.status,
      address: office.address,
      city: office.city,
      state: office.state,
      zipCode: office.zip_code,
      capacity: office.capacity,
      area: office.area_sqft,
      dailyPrice: Number(office.daily_price),
      availability: office.availability,
      rating: Number(office.rating),
      reviewsCount: office.reviews_count,
      totalBookings: office.total_bookings,
      images: office.images,
      createdAt: office.created_at,
      updatedAt: office.updated_at,
      createdBy: office.created_by,
      creator: office.creator
        ? {
            id: office.creator.id,
            name: `${office.creator.first_name} ${office.creator.last_name}`,
            email: office.creator.email,
          }
        : undefined,
      bookings: office.bookings,
    };
  }

  private formatBookingResponse(booking: any) {
    return {
      id: booking.id,
      officeSpaceId: booking.office_space_id,
      providerId: booking.provider_id,
      officeName: booking.office_name,
      providerName: booking.provider_name,
      providerEmail: booking.provider_email,
      startDate: booking.start_date,
      endDate: booking.end_date,
      duration: booking.duration,
      durationType: booking.duration_type,
      dailyRate: Number(booking.daily_rate),
      totalAmount: Number(booking.total_amount),
      status: booking.status,
      paymentStatus: booking.payment_status,
      paymentMethod: booking.payment_method,
      transactionId: booking.transaction_id,
      specialRequests: booking.special_requests,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      officeSpace: booking.office_space,
      provider: booking.provider,
    };
  }
}
