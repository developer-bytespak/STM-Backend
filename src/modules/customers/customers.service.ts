import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFiltersDto } from './dto/customer-filters.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    try {
      // Check if user with email already exists
      const existingUser = await this.prisma.users.findUnique({
        where: { email: createCustomerDto.email }
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createCustomerDto.password, 10);

      // Create user and customer in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create user
        const user = await prisma.users.create({
          data: {
            first_name: createCustomerDto.first_name,
            last_name: createCustomerDto.last_name,
            email: createCustomerDto.email,
            phone_number: createCustomerDto.phone_number,
            role: Role.customer,
            password: hashedPassword,
            profile_picture: createCustomerDto.profile_picture,
          }
        });

        // Create customer
        const customer = await prisma.customers.create({
          data: {
            user_id: user.id,
            address: createCustomerDto.address,
          },
          include: {
            user: true,
          }
        });

        return customer;
      });

      return this.transformToResponseDto(result);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create customer');
    }
  }

  async findAll(filters: CustomerFiltersDto): Promise<{ data: CustomerResponseDto[]; total: number; page: number; limit: number }> {
    const {
      search,
      email,
      phone_number,
      is_email_verified,
      created_from,
      created_to,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      user: {
        role: Role.customer,
      }
    };

    // Search filter
    if (search) {
      where.user.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Email filter
    if (email) {
      where.user.email = email;
    }

    // Phone number filter
    if (phone_number) {
      where.user.phone_number = phone_number;
    }

    // Email verification filter
    if (is_email_verified !== undefined) {
      where.user.is_email_verified = is_email_verified;
    }

    // Date range filter
    if (created_from || created_to) {
      where.user.created_at = {};
      if (created_from) {
        where.user.created_at.gte = new Date(created_from);
      }
      if (created_to) {
        where.user.created_at.lte = new Date(created_to);
      }
    }

    // Note: Retention metrics were removed from the schema; skipping related filters.

    // Build orderBy clause
    let orderBy: any = {};
    if (sort_by === 'first_name' || sort_by === 'last_name' || sort_by === 'email') {
      orderBy = { user: { [sort_by]: sort_order } };
    } else if (sort_by === 'total_jobs' || sort_by === 'total_spent') {
      // These fields are not directly sortable now; fallback to created_at
      orderBy = { user: { created_at: sort_order } };
    } else {
      orderBy = { user: { [sort_by]: sort_order } };
    }

    try {
      const [customers, total] = await Promise.all([
        this.prisma.customers.findMany({
          where,
          include: {
            user: true,
            jobs: {
              include: {
                feedbacks: true,
              }
            }
          },
          skip,
          take: limit,
          orderBy,
        }),
        this.prisma.customers.count({ where })
      ]);

      const transformedCustomers = customers.map(customer => this.transformToResponseDto(customer));

      return {
        data: transformedCustomers,
        total,
        page,
        limit
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch customers');
    }
  }

  async findOne(id: number): Promise<CustomerResponseDto> {
    try {
      const customer = await this.prisma.customers.findUnique({
        where: { id },
        include: {
          user: true,
          jobs: {
            include: {
              feedbacks: true,
            }
          }
        }
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      return this.transformToResponseDto(customer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch customer');
    }
  }

  async findByUserId(userId: number): Promise<CustomerResponseDto> {
    try {
      const customer = await this.prisma.customers.findUnique({
        where: { user_id: userId },
        include: {
          user: true,
          jobs: {
            include: {
              feedbacks: true,
            }
          }
        }
      });

      if (!customer) {
        throw new NotFoundException(`Customer with user ID ${userId} not found`);
      }

      return this.transformToResponseDto(customer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch customer');
    }
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    try {
      // Check if customer exists
      const existingCustomer = await this.prisma.customers.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!existingCustomer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Check if email is being updated and if it already exists
      if (updateCustomerDto.email && updateCustomerDto.email !== existingCustomer.user.email) {
        const emailExists = await this.prisma.users.findUnique({
          where: { email: updateCustomerDto.email }
        });

        if (emailExists) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Prepare update data
      const userUpdateData: any = {};
      const customerUpdateData: any = {};

      if (updateCustomerDto.first_name) userUpdateData.first_name = updateCustomerDto.first_name;
      if (updateCustomerDto.last_name) userUpdateData.last_name = updateCustomerDto.last_name;
      if (updateCustomerDto.email) userUpdateData.email = updateCustomerDto.email;
      if (updateCustomerDto.phone_number) userUpdateData.phone_number = updateCustomerDto.phone_number;
      if (updateCustomerDto.profile_picture) userUpdateData.profile_picture = updateCustomerDto.profile_picture;

      if (updateCustomerDto.password) {
        userUpdateData.password = await bcrypt.hash(updateCustomerDto.password, 10);
      }

      if (updateCustomerDto.address) customerUpdateData.address = updateCustomerDto.address;

      // Update in transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        if (Object.keys(userUpdateData).length > 0) {
          await prisma.users.update({
            where: { id: existingCustomer.user_id },
            data: userUpdateData
          });
        }

        if (Object.keys(customerUpdateData).length > 0) {
          await prisma.customers.update({
            where: { id },
            data: customerUpdateData
          });
        }

        return prisma.customers.findUnique({
          where: { id },
          include: {
            user: true,
            jobs: {
              include: {
                feedbacks: true,
              }
            }
          }
        });
      });

      return this.transformToResponseDto(result!);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to update customer');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const customer = await this.prisma.customers.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Delete customer and user in transaction
      await this.prisma.$transaction(async (prisma) => {
        await prisma.customers.delete({
          where: { id }
        });

        await prisma.users.delete({
          where: { id: customer.user_id }
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete customer');
    }
  }

  async getCustomerStats(): Promise<any> {
    try {
      const [
        totalCustomers,
        verifiedCustomers,
        recentCustomers,
        totalJobsCount
      ] = await Promise.all([
        this.prisma.customers.count(),
        this.prisma.customers.count({
          where: {
            user: {
              is_email_verified: true
            }
          }
        }),
        // Retention metrics removed; skipping retention breakdown
        this.prisma.customers.count({
          where: {
            user: {
              created_at: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            }
          }
        }),
        // Compute average jobs per customer using total jobs count
        this.prisma.jobs.count()
      ]);

      return {
        total_customers: totalCustomers,
        verified_customers: verifiedCustomers,
        verification_rate: totalCustomers > 0 ? (verifiedCustomers / totalCustomers) * 100 : 0,
        retention_breakdown: {},
        recent_customers: recentCustomers,
        average_jobs_per_customer: totalCustomers > 0 ? totalJobsCount / totalCustomers : 0
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch customer statistics');
    }
  }

  private transformToResponseDto(customer: any): CustomerResponseDto {
    const response = plainToClass(CustomerResponseDto, {
      id: customer.id,
      address: customer.address,
      user: customer.user,
      total_jobs: customer.jobs?.length || 0,
      total_spent: 0,
      average_rating: this.calculateAverageRating(customer.jobs)
    }, { excludeExtraneousValues: true });

    return response;
  }

  private calculateAverageRating(jobs: any[]): number {
    if (!jobs || jobs.length === 0) return 0;

    const ratingsWithFeedback = jobs
      .flatMap(job => job.feedbacks)
      .filter(rating => rating.rating && rating.rating > 0);

    if (ratingsWithFeedback.length === 0) return 0;

    const totalRating = ratingsWithFeedback.reduce((sum, rating) => sum + rating.rating, 0);
    return totalRating / ratingsWithFeedback.length;
  }
}
