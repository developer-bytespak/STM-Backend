import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFiltersDto } from './dto/customer-filters.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { JobActionDto, CustomerJobAction } from './dto/job-action.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FileDisputeDto } from './dto/file-dispute.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
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
            user: {
              connect: { id: user.id }
            },
            address: createCustomerDto.address,
            region: createCustomerDto.region,
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

  // ==================== CUSTOMER-FACING APIS ====================

  /**
   * Get customer dashboard
   */
  async getCustomerDashboard(userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const [jobStats, totalSpent, pendingFeedback, recentJobs, recentFeedback] =
      await Promise.all([
        this.prisma.jobs.groupBy({
          by: ['status'],
          where: { customer_id: customer.id },
          _count: true,
        }),
        this.prisma.payments.aggregate({
          where: {
            job: { customer_id: customer.id },
            status: 'received',
          },
          _sum: { amount: true },
        }),
        this.prisma.jobs.count({
          where: {
            customer_id: customer.id,
            status: 'paid',
            feedbacks: { none: {} },
          },
        }),
        this.prisma.jobs.findMany({
          where: { customer_id: customer.id },
          include: {
            service: { select: { name: true } },
            service_provider: {
              select: { business_name: true, user: { select: { first_name: true, last_name: true } } },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 5,
        }),
        this.prisma.ratings_feedback.findMany({
          where: { customer_id: customer.id },
          include: {
            provider: {
              select: { business_name: true, user: { select: { first_name: true, last_name: true } } },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 5,
        }),
      ]);

    const jobCounts = {
      new: 0,
      in_progress: 0,
      completed: 0,
      paid: 0,
      cancelled: 0,
      rejected_by_sp: 0,
    };

    jobStats.forEach((stat) => {
      jobCounts[stat.status] = stat._count;
    });

    return {
      summary: {
        totalJobs: Object.values(jobCounts).reduce((sum, count) => sum + count, 0),
        totalSpent: totalSpent._sum.amount ? Number(totalSpent._sum.amount) : 0,
        pendingFeedback,
      },
      jobs: jobCounts,
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        service: job.service.name,
        provider:
          job.service_provider.business_name ||
          `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`,
        status: job.status,
        price: Number(job.price),
        createdAt: job.created_at,
      })),
      recentFeedback: recentFeedback.map((feedback) => ({
        id: feedback.id,
        rating: feedback.rating,
        feedback: feedback.feedback,
        provider:
          feedback.provider.business_name ||
          `${feedback.provider.user.first_name} ${feedback.provider.user.last_name}`,
        createdAt: feedback.created_at,
      })),
    };
  }

  /**
   * Get job details for customer
   */
  async getCustomerJobDetails(userId: number, jobId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: true,
        service_provider: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                phone_number: true,
              },
            },
          },
        },
        chats: { select: { id: true } },
        payment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customer_id !== customer.id) {
      throw new ForbiddenException('You can only view your own jobs');
    }

    return {
      job: {
        id: job.id,
        service: job.service.name,
        category: job.service.category,
        status: job.status,
        price: Number(job.price),
        originalAnswers: job.answers_json,
        editedAnswers: job.edited_answers,
        spAccepted: job.sp_accepted,
        pendingApproval: job.pending_approval,
        location: job.location,
        scheduledAt: job.scheduled_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
      },
      provider: {
        id: job.service_provider.id,
        businessName: job.service_provider.business_name,
        ownerName: `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`,
        phone: job.service_provider.user.phone_number,
        rating: Number(job.service_provider.rating),
        location: job.service_provider.location,
      },
      payment: job.payment
        ? {
            amount: Number(job.payment.amount),
            status: job.payment.status,
            method: job.payment.method,
            markedAt: job.payment.marked_at,
          }
        : null,
      chatId: job.chats.length > 0 ? job.chats[0].id : null,
      actions: {
        canApproveEdits: job.pending_approval === true,
        canCloseDeal: job.status === 'new' && job.sp_accepted === true,
        canCancel: ['new', 'in_progress'].includes(job.status),
        canGiveFeedback: job.status === 'paid',
      },
    };
  }

  /**
   * Perform job action (approve edits, close deal, cancel)
   */
  async performJobAction(userId: number, jobId: number, dto: JobActionDto) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: true,
        service_provider: {
          include: { user: true },
        },
        chats: true,
        payment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customer_id !== customer.id) {
      throw new ForbiddenException('You can only modify your own jobs');
    }

    if (dto.action === CustomerJobAction.APPROVE_EDITS) {
      if (!job.pending_approval) {
        throw new BadRequestException('No pending edits to approve');
      }

      return await this.prisma.$transaction(async (tx) => {
        const editedAnswers = job.edited_answers as any;

        // Apply edited price and schedule
        const updateData: any = { pending_approval: false };
        if (editedAnswers?.price) {
          updateData.price = editedAnswers.price;
        }
        if (editedAnswers?.schedule) {
          updateData.scheduled_at = new Date(editedAnswers.schedule);
        }
        if (editedAnswers?.answers) {
          updateData.answers_json = {
            ...(job.answers_json as any),
            ...editedAnswers.answers,
          };
        }

        await tx.jobs.update({
          where: { id: jobId },
          data: updateData,
        });

        // Notify SP
        await tx.notifications.create({
          data: {
            recipient_type: 'service_provider',
            recipient_id: job.service_provider.user_id,
            type: 'job',
            title: 'Customer Approved Changes',
            message: `Customer approved your proposed changes for job #${job.id}.`,
          },
        });

        // Add chat message
        if (job.chats.length > 0) {
          await tx.messages.create({
            data: {
              chat_id: job.chats[0].id,
              sender_type: 'customer',
              sender_id: userId,
              message_type: 'text',
              message: '✅ I approved your proposed changes. Please proceed!',
            },
          });
        }

        return { message: 'Changes approved successfully' };
      });
    } else if (dto.action === CustomerJobAction.CLOSE_DEAL) {
      if (job.status !== 'new') {
        throw new BadRequestException('Job is not in new status');
      }

      if (!job.sp_accepted) {
        throw new BadRequestException('Service provider has not accepted yet');
      }

      return await this.prisma.$transaction(async (tx) => {
        await tx.jobs.update({
          where: { id: jobId },
          data: { status: 'in_progress' },
        });

        if (job.payment) {
          await tx.payments.update({
            where: { job_id: jobId },
            data: { amount: job.price },
          });
        }

        await tx.notifications.create({
          data: {
            recipient_type: 'service_provider',
            recipient_id: job.service_provider.user_id,
            type: 'job',
            title: 'Deal Closed - Start Work',
            message: `Customer closed the deal for job #${job.id}. You can now start the work.`,
          },
        });

        return { message: 'Deal closed successfully. Job is now in progress.' };
      });
    } else if (dto.action === CustomerJobAction.CANCEL) {
      if (!['new', 'in_progress'].includes(job.status)) {
        throw new BadRequestException('Cannot cancel this job');
      }

      if (!dto.cancellationReason) {
        throw new BadRequestException('Cancellation reason is required');
      }

      // Calculate cancellation fee based on lead time
      const cancellationResult = this.calculateCancellationFee(
        job.scheduled_at,
        Number(job.price),
      );

      return await this.prisma.$transaction(async (tx) => {
        await tx.jobs.update({
          where: { id: jobId },
          data: {
            status: 'cancelled',
            rejection_reason: dto.cancellationReason,
          },
        });

        // If there's a cancellation fee, update the payment record
        if (cancellationResult.fee > 0) {
          await tx.payments.update({
            where: { job_id: jobId },
            data: {
              amount: cancellationResult.fee,
              method: 'cancellation_fee',
              notes: cancellationResult.message,
              status: 'pending', // Customer must pay cancellation fee
            },
          });
        }

        await tx.notifications.create({
          data: {
            recipient_type: 'service_provider',
            recipient_id: job.service_provider.user_id,
            type: 'job',
            title: 'Job Cancelled',
            message: `Customer cancelled job #${job.id}. Reason: ${dto.cancellationReason}${cancellationResult.fee > 0 ? `. Cancellation fee: $${cancellationResult.fee}` : ''}`,
          },
        });

        return {
          message: cancellationResult.message,
          cancellationFee: cancellationResult.fee,
          canReschedule: cancellationResult.canReschedule,
        };
      });
    }

    throw new BadRequestException('Invalid action');
  }

  /**
   * Submit feedback for a job
   */
  async submitFeedback(userId: number, jobId: number, dto: SubmitFeedbackDto) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service_provider: true,
        feedbacks: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customer_id !== customer.id) {
      throw new ForbiddenException('You can only give feedback for your own jobs');
    }

    if (job.status !== 'paid') {
      throw new BadRequestException('Can only give feedback for paid jobs');
    }

    if (job.feedbacks.length > 0) {
      throw new BadRequestException('Feedback already submitted for this job');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create feedback
      await tx.ratings_feedback.create({
        data: {
          job_id: jobId,
          customer_id: customer.id,
          provider_id: job.provider_id,
          rating: dto.rating,
          feedback: dto.feedback,
          punctuality_rating: dto.punctualityRating,
          response_time: dto.responseTime,
        },
      });

      // Recalculate provider rating
      const allFeedback = await tx.ratings_feedback.findMany({
        where: { provider_id: job.provider_id },
      });

      const avgRating =
        allFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / allFeedback.length;

      await tx.service_providers.update({
        where: { id: job.provider_id },
        data: { rating: avgRating },
      });

      // Notify provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: job.service_provider.user_id,
          type: 'feedback',
          title: 'New Feedback Received',
          message: `You received a ${dto.rating}-star review for job #${job.id}.`,
        },
      });

      return { message: 'Feedback submitted successfully' };
    });
  }

  /**
   * Get jobs pending feedback
   */
  async getPendingFeedback(userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const jobsNeedingFeedback = await this.prisma.jobs.findMany({
      where: {
        customer_id: customer.id,
        status: 'paid',
        feedbacks: { none: {} },
      },
      include: {
        service: { select: { name: true } },
        service_provider: {
          select: {
            business_name: true,
            user: { select: { first_name: true, last_name: true } },
          },
        },
        payment: { select: { amount: true } },
      },
      orderBy: { completed_at: 'asc' },
    });

    return {
      pendingCount: jobsNeedingFeedback.length,
      jobs: jobsNeedingFeedback.map((job) => ({
        jobId: job.id,
        service: job.service.name,
        provider:
          job.service_provider.business_name ||
          `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`,
        completedAt: job.completed_at,
        amount: job.payment ? Number(job.payment.amount) : Number(job.price),
      })),
    };
  }

  /**
   * File a dispute
   */
  async fileDispute(userId: number, dto: FileDisputeDto) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: dto.jobId },
      include: {
        service_provider: {
          include: { local_service_manager: true, user: true },
        },
        chats: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customer_id !== customer.id) {
      throw new ForbiddenException('You can only dispute your own jobs');
    }

    if (!['completed', 'paid'].includes(job.status)) {
      throw new BadRequestException('Can only dispute completed or paid jobs');
    }

    return await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.disputes.create({
        data: {
          job_id: dto.jobId,
          raised_by_type: 'customer',
          status: 'pending',
        },
      });

      // Update chat to invite LSM
      if (job.chats.length > 0) {
        await tx.chat.update({
          where: { id: job.chats[0].id },
          data: { lsm_invited: true },
        });
      }

      // Notify LSM
      await tx.notifications.create({
        data: {
          recipient_type: 'local_service_manager',
          recipient_id: job.service_provider.local_service_manager.user_id,
          type: 'system',
          title: 'New Dispute Filed',
          message: `Customer filed dispute for job #${dto.jobId}. Click to join chat and resolve.`,
        },
      });

      // Notify SP
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: job.service_provider.user_id,
          type: 'system',
          title: 'Dispute Filed',
          message: `Customer filed a dispute for job #${dto.jobId}. LSM will review.`,
        },
      });

      return {
        disputeId: dispute.id,
        message: 'Dispute filed successfully. LSM has been notified.',
      };
    });
  }

  /**
   * Get customer profile
   */
  async getCustomerProfile(userId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // Calculate stats
    const [totalJobs, totalSpent] = await Promise.all([
      this.prisma.jobs.count({ where: { customer_id: customer.id } }),
      this.prisma.payments.aggregate({
        where: {
          job: { customer_id: customer.id },
          status: 'received',
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      user: {
        name: `${customer.user.first_name} ${customer.user.last_name}`,
        email: customer.user.email,
        phone: customer.user.phone_number,
      },
      address: customer.address,
      region: customer.region,
      zipcode: customer.zipcode,
      statistics: {
        totalJobs,
        totalSpent: totalSpent._sum.amount ? Number(totalSpent._sum.amount) : 0,
      },
    };
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(userId: number, dto: UpdateCustomerProfileDto) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      const userUpdateData: any = {};
      if (dto.firstName) userUpdateData.first_name = dto.firstName;
      if (dto.lastName) userUpdateData.last_name = dto.lastName;
      if (dto.phone) userUpdateData.phone_number = dto.phone;

      if (Object.keys(userUpdateData).length > 0) {
        await tx.users.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }

      const customerUpdateData: any = {};
      if (dto.address) customerUpdateData.address = dto.address;
      if (dto.zipcode) customerUpdateData.zipcode = dto.zipcode;
      if (dto.region) customerUpdateData.region = dto.region;

      if (Object.keys(customerUpdateData).length > 0) {
        await tx.customers.update({
          where: { id: customer.id },
          data: customerUpdateData,
        });
      }

      return { message: 'Profile updated successfully' };
    });
  }

  /**
   * Request a new service (when search returns no results)
   */
  async requestNewService(userId: number, dto: any) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
      include: {
        user: { select: { email: true, first_name: true, last_name: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // Create service request record
    const serviceRequest = await this.prisma.service_requests.create({
      data: {
        keyword: dto.keyword,
        description: dto.description,
        region: dto.region,
        zipcode: dto.zipcode,
        category: 'Customer Request', // Default category
        service_name: dto.keyword,
        email_sent: false,
        reviewed: false,
        provider_id: 1, // Dummy provider (will be updated when LSM assigns)
        customersId: customer.id,
      },
    });

    // Notify LSM in the region
    // Find LSM for the region
    const lsm = await this.prisma.local_service_managers.findFirst({
      where: { region: dto.region },
      include: { user: { select: { id: true } } },
    });

    if (lsm) {
      await this.prisma.notifications.create({
        data: {
          recipient_type: 'local_service_manager',
          recipient_id: lsm.user.id,
          type: 'system',
          title: 'New Service Request from Customer',
          message: `Customer ${customer.user.first_name} ${customer.user.last_name} requested: "${dto.keyword}" in ${dto.region}`,
        },
      });
    }

    // Also notify admin
    const admins = await this.prisma.admin.findMany({
      include: { user: { select: { id: true } } },
    });

    for (const admin of admins) {
      await this.prisma.notifications.create({
        data: {
          recipient_type: 'admin',
          recipient_id: admin.user.id,
          type: 'system',
          title: 'Customer Service Request',
          message: `New service requested: "${dto.keyword}" in ${dto.region} (${dto.zipcode})`,
        },
      });
    }

    return {
      message:
        'Service request submitted successfully. We will notify you when this service becomes available.',
      requestId: serviceRequest.id,
    };
  }

  /**
   * Calculate cancellation fee based on lead time
   * Rules:
   * 1. Cancel < 4 days before scheduled: 25% fee
   * 2. Cancel >= 4 days but WITHIN 48 hrs before scheduled: 25% fee
   * 3. Cancel >= 4 days and NOT within 48 hrs: can reschedule without fee (0% fee)
   */
  private calculateCancellationFee(
    scheduledAt: Date,
    jobPrice: number,
  ): {
    fee: number;
    message: string;
    canReschedule: boolean;
  } {
    if (!scheduledAt) {
      // No scheduled date - no fee
      return {
        fee: 0,
        message: 'Job cancelled successfully. No cancellation fee.',
        canReschedule: false,
      };
    }

    const now = new Date();
    const scheduledTime = new Date(scheduledAt);
    const hoursUntilJob = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntilJob = hoursUntilJob / 24;

    const CANCELLATION_FEE_PERCENTAGE = 0.25; // 25% fee
    const FOUR_DAYS_HOURS = 4 * 24; // 96 hours
    const TWO_DAYS_HOURS = 2 * 24; // 48 hours

    // Rule 1: Less than 4 days lead time - charge 25% fee
    if (hoursUntilJob < FOUR_DAYS_HOURS) {
      const fee = jobPrice * CANCELLATION_FEE_PERCENTAGE;
      return {
        fee: Math.round(fee * 100) / 100, // Round to 2 decimals
        message: `Job cancelled with less than 4 days notice. Cancellation fee of ${CANCELLATION_FEE_PERCENTAGE * 100}% ($${fee.toFixed(2)}) applies.`,
        canReschedule: false,
      };
    }

    // Rule 2: 4+ days lead time but cancelling WITHIN 48 hours before scheduled - charge 25% fee
    if (daysUntilJob >= 4 && hoursUntilJob < TWO_DAYS_HOURS) {
      const fee = jobPrice * CANCELLATION_FEE_PERCENTAGE;
      return {
        fee: Math.round(fee * 100) / 100,
        message: `Job cancelled within 48 hours of scheduled time. Cancellation fee of ${CANCELLATION_FEE_PERCENTAGE * 100}% ($${fee.toFixed(2)}) applies.`,
        canReschedule: false,
      };
    }

    // Rule 3: 4+ days lead time and NOT within 48 hours - can reschedule without fee
    return {
      fee: 0,
      message: `Job cancelled successfully. You can reschedule without any fee (cancelled more than 48 hours before scheduled time with 4+ days lead time).`,
      canReschedule: true,
    };
  }
}
