import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestServiceDto } from './dto/request-service.dto';
import { AddServiceDto } from './dto/add-service.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { UpdateJobStatusDto, JobStatusAction } from './dto/update-job-status.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Request a new service
   */
  async requestNewService(userId: number, dto: RequestServiceDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
      include: {
        local_service_manager: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Check if service already exists
    const existingService = await this.prisma.services.findFirst({
      where: {
        name: { equals: dto.serviceName, mode: 'insensitive' },
        category: { equals: dto.category, mode: 'insensitive' },
      },
    });

    if (existingService) {
      throw new ConflictException(
        'This service already exists. You can add it to your profile instead.',
      );
    }

    // Check if provider already has a pending request for this service
    const existingRequest = await this.prisma.service_requests.findFirst({
      where: {
        provider_id: provider.id,
        service_name: { equals: dto.serviceName, mode: 'insensitive' },
        final_status: 'pending',
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'You already have a pending request for this service',
      );
    }

    // Create service request
    const serviceRequest = await this.prisma.service_requests.create({
      data: {
        provider_id: provider.id,
        service_name: dto.serviceName,
        category: dto.category,
        description: dto.description,
        questions_json: dto.suggestedQuestions,
        region: provider.local_service_manager.region,
        area: provider.local_service_manager.area,
        final_status: 'pending',
      },
    });

    // Notify LSM
    await this.prisma.notifications.create({
      data: {
        recipient_type: 'local_service_manager',
        recipient_id: provider.local_service_manager.user_id,
        type: 'system',
        title: 'New Service Request',
        message: `${provider.business_name || 'A service provider'} has requested to add "${dto.serviceName}" service`,
      },
    });

    return {
      id: serviceRequest.id,
      serviceName: serviceRequest.service_name,
      category: serviceRequest.category,
      status: serviceRequest.final_status,
      lsm_approved: serviceRequest.lsm_approved,
      admin_approved: serviceRequest.admin_approved,
      created_at: serviceRequest.created_at,
    };
  }

  /**
   * Get all service requests for current provider
   */
  async getMyServiceRequests(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const requests = await this.prisma.service_requests.findMany({
      where: { provider_id: provider.id },
      orderBy: { created_at: 'desc' },
    });

    return requests.map((req) => ({
      id: req.id,
      serviceName: req.service_name,
      category: req.category,
      description: req.description,
      status: req.final_status,
      lsm_approved: req.lsm_approved,
      admin_approved: req.admin_approved,
      lsm_rejection_reason: req.lsm_rejection_reason,
      admin_rejection_reason: req.admin_rejection_reason,
      created_at: req.created_at,
    }));
  }

  /**
   * Add an existing approved service to provider profile
   */
  async addService(userId: number, dto: AddServiceDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Verify service exists and is approved
    const service = await this.prisma.services.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.status !== 'approved') {
      throw new BadRequestException('Service is not approved');
    }

    // Check if provider already offers this service
    const existingLink = await this.prisma.provider_services.findFirst({
      where: {
        provider_id: provider.id,
        service_id: dto.serviceId,
      },
    });

    if (existingLink) {
      throw new ConflictException('You already offer this service');
    }

    // Link provider to service
    const providerService = await this.prisma.provider_services.create({
      data: {
        provider_id: provider.id,
        service_id: dto.serviceId,
        is_active: true,
      },
    });

    return {
      message: 'Service added to your profile successfully',
      serviceId: providerService.service_id,
      serviceName: service.name,
      category: service.category,
    };
  }

  // ==================== DASHBOARD ====================

  /**
   * Get provider dashboard overview
   */
  async getDashboard(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Check if provider is approved - only active providers can access dashboard
    if (provider.status === 'pending') {
      throw new ForbiddenException('Your account is pending approval from Local Service Manager');
    }

    if (provider.status === 'rejected') {
      throw new ForbiddenException('Your account has been rejected. Please contact support.');
    }

    if (provider.status !== 'active') {
      throw new ForbiddenException('Your account is not active. Please contact support.');
    }

    // Optimized: Single raw query to get all statistics
    const [basicStats] = await this.prisma.$queryRaw<any[]>`
      SELECT 
        (SELECT COUNT(*) FROM jobs WHERE provider_id = ${provider.id} AND status = 'new') as new_jobs,
        (SELECT COUNT(*) FROM jobs WHERE provider_id = ${provider.id} AND status = 'in_progress') as in_progress_jobs,
        (SELECT COUNT(*) FROM jobs WHERE provider_id = ${provider.id} AND status = 'completed') as completed_jobs,
        (SELECT COUNT(*) FROM jobs WHERE provider_id = ${provider.id} AND status = 'paid') as paid_jobs,
        (SELECT COUNT(*) FROM jobs WHERE provider_id = ${provider.id} AND status = 'cancelled') as cancelled_jobs,
        (SELECT COUNT(*) FROM jobs WHERE provider_id = ${provider.id} AND status = 'rejected_by_sp') as rejected_jobs,
        (SELECT COALESCE(SUM(amount), 0) FROM payments p 
         JOIN jobs j ON p.job_id = j.id 
         WHERE j.provider_id = ${provider.id} AND p.status = 'received') as total_earnings,
        (SELECT COALESCE(AVG(rating), ${provider.rating}) FROM ratings_feedback WHERE provider_id = ${provider.id}) as avg_rating,
        (SELECT COUNT(*) FROM ratings_feedback WHERE provider_id = ${provider.id}) as feedback_count
    `;

    // Get recent jobs (separate query for complex joins)
    const recentJobs = await this.prisma.$queryRaw<any[]>`
      SELECT 
        j.id, j.status, j.price, j.created_at,
        s.name as service_name,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name
      FROM jobs j
      JOIN services s ON j.service_id = s.id
      JOIN customers c ON j.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE j.provider_id = ${provider.id}
      ORDER BY j.created_at DESC
      LIMIT 5
    `;

    // Get recent feedback (separate query for complex joins)
    const recentFeedback = await this.prisma.$queryRaw<any[]>`
      SELECT 
        rf.id, rf.rating, rf.feedback, rf.created_at,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name
      FROM ratings_feedback rf
      JOIN customers c ON rf.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE rf.provider_id = ${provider.id}
      ORDER BY rf.created_at DESC
      LIMIT 5
    `;

    const stats = basicStats;

    const jobCounts = {
      new: Number(stats.new_jobs),
      in_progress: Number(stats.in_progress_jobs),
      completed: Number(stats.completed_jobs),
      paid: Number(stats.paid_jobs),
      cancelled: Number(stats.cancelled_jobs),
      rejected_by_sp: Number(stats.rejected_jobs),
    };

    const totalJobs = Object.values(jobCounts).reduce((sum, count) => sum + count, 0);
    const totalEarnings = Number(stats.total_earnings);
    const averageRating = Number(stats.feedback_count) > 0 
      ? Number(Number(stats.avg_rating).toFixed(2))
      : Number(provider.rating);

    return {
      summary: {
        totalJobs,
        totalEarnings,
        averageRating,
        warnings: provider.warnings,
      },
      jobs: jobCounts,
      pendingActions: {
        newJobRequests: jobCounts.new,
        jobsToComplete: jobCounts.in_progress,
        paymentsToMark: jobCounts.completed,
      },
      recentJobs: recentJobs.map((job) => ({
        id: Number(job.id),
        service: job.service_name,
        customer: `${job.customer_first_name} ${job.customer_last_name}`,
        status: job.status,
        price: Number(job.price),
        createdAt: job.created_at,
      })),
      recentFeedback: recentFeedback.map((feedback) => ({
        id: Number(feedback.id),
        rating: Number(feedback.rating),
        feedback: feedback.feedback,
        customer: `${feedback.customer_first_name} ${feedback.customer_last_name}`,
        createdAt: feedback.created_at,
      })),
    };
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Get provider profile
   */
  async getProfile(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
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
        provider_services: {
          where: { is_active: true },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
        service_areas: {
          orderBy: { is_primary: 'desc' },
        },
        documents: {
          select: {
            id: true,
            file_name: true,
            status: true,
            verified_at: true,
            created_at: true,
          },
        },
        jobs: {
          where: {
            status: { in: ['new', 'in_progress'] },
          },
          select: {
            id: true,
            service: {
              select: {
                name: true,
              },
            },
            status: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const totalDocs = provider.documents.length;
    const verifiedDocs = provider.documents.filter((d) => d.status === 'verified').length;
    const pendingDocs = provider.documents.filter((d) => d.status === 'pending').length;
    const rejectedDocs = provider.documents.filter((d) => d.status === 'rejected').length;
    const canDeactivate = provider.jobs.length === 0; // No active jobs

    return {
      user: {
        name: `${provider.user.first_name} ${provider.user.last_name}`,
        email: provider.user.email,
        phone: provider.user.phone_number,
      },
      business: {
        businessName: provider.business_name,
        description: provider.description,
        location: provider.location,
        zipcode: provider.zipcode,
        minPrice: provider.min_price ? Number(provider.min_price) : null,
        maxPrice: provider.max_price ? Number(provider.max_price) : null,
        experience: provider.experience,
        experienceLevel: provider.experience_level,
        websiteUrl: provider.website_url,
      },
      status: {
        current: provider.status,
        isActive: provider.is_active, // Business availability toggle
        canDeactivate,
        activeJobsCount: provider.jobs.length,
        warnings: provider.warnings,
        rejectionReason: provider.rejection_reason, // LSM feedback if onboarding rejected
      },
      services: provider.provider_services.map((ps) => ({
        id: ps.service.id,
        name: ps.service.name,
        category: ps.service.category,
      })),
      serviceAreas: provider.service_areas.map((area) => ({
        zipcode: area.zipcode,
        isPrimary: area.is_primary,
      })),
      documents: {
        total: totalDocs,
        verified: verifiedDocs,
        pending: pendingDocs,
        rejected: rejectedDocs,
        list: provider.documents.map((doc) => ({
          id: doc.id,
          fileName: doc.file_name,
          status: doc.status,
          verifiedAt: doc.verified_at,
          uploadedAt: doc.created_at,
        })),
      },
      statistics: {
        totalJobs: provider.total_jobs,
        earnings: Number(provider.earning),
        rating: Number(provider.rating),
      },
      images: {
        logoUrl: provider.logo_url,
        bannerUrl: provider.banner_url,
        galleryImages:
          (provider.gallery_images as Array<{
            id: string;
            url: string;
            caption?: string;
            order: number;
          }>) || [],
      },
    };
  }

  /**
   * Update provider profile
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Prevent profile editing when status is pending or rejected
    if (provider.status === 'pending') {
      throw new ForbiddenException('Cannot edit profile while account is pending approval');
    }

    if (provider.status === 'rejected') {
      throw new ForbiddenException('Cannot edit profile while account is rejected. Please re-upload documents to resubmit.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData: any = {};
      if (dto.businessName !== undefined) updateData.business_name = dto.businessName;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.location !== undefined) updateData.location = dto.location;
      if (dto.minPrice !== undefined) updateData.min_price = dto.minPrice;
      if (dto.maxPrice !== undefined) updateData.maxPrice = dto.maxPrice;
      if (dto.experience !== undefined) updateData.experience = dto.experience;
      if (dto.websiteUrl !== undefined) updateData.website_url = dto.websiteUrl;

      // Update provider
      if (Object.keys(updateData).length > 0) {
        await tx.service_providers.update({
          where: { id: provider.id },
          data: updateData,
        });
      }

      // Update service areas if provided
      if (dto.serviceAreas && dto.serviceAreas.length > 0) {
        // Delete existing areas
        await tx.provider_service_areas.deleteMany({
          where: { provider_id: provider.id },
        });

        // Create new areas
        await tx.provider_service_areas.createMany({
          data: dto.serviceAreas.map((zipcode, index) => ({
            provider_id: provider.id,
            zipcode,
            is_primary: index === 0, // First one is primary
          })),
        });
      }

      return {
        message: 'Profile updated successfully',
      };
    });
  }

  /**
   * Set provider availability (active/inactive)
   */
  async setAvailability(userId: number, dto: SetAvailabilityDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
      include: {
        jobs: {
          where: {
            status: { in: ['new', 'in_progress'] },
          },
          select: {
            id: true,
            service: {
              select: {
                name: true,
              },
            },
            status: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    // Prevent availability toggle when status is pending or rejected
    if (provider.status === 'pending') {
      throw new ForbiddenException('Cannot change availability while account is pending approval');
    }

    if (provider.status === 'rejected') {
      throw new ForbiddenException('Cannot change availability while account is rejected');
    }

    if (dto.status === provider.status) {
      throw new BadRequestException(`You are already ${dto.status}`);
    }

    // Check active jobs if trying to go inactive
    if (dto.status === 'inactive' && provider.jobs.length > 0) {
      const jobList = provider.jobs
        .map((j) => `#${j.id} (${j.service.name} - ${j.status})`)
        .join(', ');

      throw new BadRequestException(
        `You have ${provider.jobs.length} active job(s): ${jobList}. Please complete them before deactivating your account.`,
      );
    }

    // Update provider status and create notification
    await this.prisma.$transaction(async (tx) => {
      // Update provider status
      await tx.service_providers.update({
        where: { id: provider.id },
        data: { status: dto.status },
      });

      // Create notification for the provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: provider.user_id,
          type: 'system',
          title: dto.status === 'active' ? 'Account Activated' : 'Account Deactivated',
          message: `You have ${dto.status === 'active' ? 'activated' : 'deactivated'} your account. You are now ${dto.status === 'active' ? 'available' : 'unavailable'} for new job requests.`,
        },
      });
    });

    return {
      status: dto.status,
      message: `Account set to ${dto.status} successfully`,
    };
  }

  // ==================== JOB MANAGEMENT ====================

  /**
   * Get job details
   */
  async getJobDetails(userId: number, jobId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: {
          select: {
            name: true,
            category: true,
            questions_json: true,
          },
        },
        customer: {
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
        chats: {
          select: {
            id: true,
          },
        },
        payment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.provider_id !== provider.id) {
      throw new ForbiddenException('You can only view your own jobs');
    }

    const canMarkComplete = job.status === 'in_progress';
    const canMarkPayment = job.status === 'completed';

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
        images: job.images || [],
        scheduledAt: job.scheduled_at,
        completedAt: job.completed_at,
        paidAt: job.paid_at,
        responseDeadline: job.response_deadline,
        createdAt: job.created_at,
      },
      customer: {
        name: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        phone: job.customer.user.phone_number,
        address: job.customer.address,
      },
      payment: job.payment
        ? {
            amount: Number(job.payment.amount),
            method: job.payment.method,
            status: job.payment.status,
            markedAt: job.payment.marked_at,
            notes: job.payment.notes,
          }
        : null,
      chatId: job.chats.length > 0 ? job.chats[0].id : null,
      actions: {
        canMarkComplete,
        canMarkPayment,
      },
    };
  }

  /**
   * Update job status (mark complete or mark payment)
   */
  async updateJobStatus(userId: number, jobId: number, dto: UpdateJobStatusDto) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: true,
        customer: {
          include: { user: true },
        },
        payment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.provider_id !== provider.id) {
      throw new ForbiddenException('You can only update your own jobs');
    }

    if (dto.action === JobStatusAction.MARK_COMPLETE) {
      // Mark job as completed
      if (job.status !== 'in_progress') {
        throw new BadRequestException('Only in-progress jobs can be marked as complete');
      }

      return await this.prisma.$transaction(async (tx) => {
        // Update job
        const updatedJob = await tx.jobs.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completed_at: new Date(),
          },
        });

        // Update payment amount (finalize price)
        if (job.payment) {
          await tx.payments.update({
            where: { job_id: jobId },
            data: {
              amount: job.price,
              status: 'pending', // Awaiting payment
            },
          });
        }

        // Notify customer
        await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user_id,
            type: 'job',
            title: 'Job Completed',
            message: `Your ${job.service.name} job has been marked complete. Please make payment.`,
          },
        });

        return {
          jobId: updatedJob.id,
          status: updatedJob.status,
          completedAt: updatedJob.completed_at,
          message: 'Job marked as complete successfully',
        };
      });
    } else if (dto.action === JobStatusAction.MARK_PAYMENT) {
      // Mark payment as received
      if (job.status !== 'completed') {
        throw new BadRequestException('Only completed jobs can have payment marked');
      }

      if (!dto.paymentDetails) {
        throw new BadRequestException('Payment details are required');
      }

      if (!job.payment) {
        throw new NotFoundException('Payment record not found for this job');
      }

      return await this.prisma.$transaction(async (tx) => {
        // Update payment
        const updatedPayment = await tx.payments.update({
          where: { job_id: jobId },
          data: {
            status: 'received',
            method: dto.paymentDetails!.method,
            notes: dto.paymentDetails!.notes,
            marked_by: userId,
            marked_at: new Date(),
          },
        });

        // Update job
        await tx.jobs.update({
          where: { id: jobId },
          data: {
            status: 'paid',
            paid_at: new Date(),
          },
        });

        // Update provider earnings and job count
        await tx.service_providers.update({
          where: { id: provider.id },
          data: {
            earning: { increment: job.price },
            total_jobs: { increment: 1 },
          },
        });

        // Update LSM closed deals count
        await tx.local_service_managers.update({
          where: { id: provider.lsm_id },
          data: {
            closed_deals_count: { increment: 1 },
          },
        });

        // Notify customer
        await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user_id,
            type: 'payment',
            title: 'Payment Confirmed',
            message: `Payment of $${Number(job.price).toFixed(2)} confirmed for job #${job.id} (${job.service.name}).`,
          },
        });

        // Notify provider
        await tx.notifications.create({
          data: {
            recipient_type: 'service_provider',
            recipient_id: provider.user_id,
            type: 'payment',
            title: 'Payment Recorded',
            message: `Payment of $${Number(job.price).toFixed(2)} recorded for job #${job.id}.`,
          },
        });

        return {
          jobId: job.id,
          status: 'paid',
          paymentAmount: Number(updatedPayment.amount),
          paymentMethod: updatedPayment.method,
          markedAt: updatedPayment.marked_at,
          message: 'Payment marked as received successfully',
        };
      });
    }

    throw new BadRequestException('Invalid action');
  }

  /**
   * Get jobs with filters
   */
  async getJobs(
    userId: number,
    filters: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const { status, fromDate, toDate, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {
      provider_id: provider.id,
    };

    // Status filter (comma-separated statuses)
    if (status) {
      const statuses = status.split(',');
      where.status = { in: statuses };
    }

    // Date range filter
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) {
        where.created_at.gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    const total = await this.prisma.jobs.count({ where });

    const jobs = await this.prisma.jobs.findMany({
      where,
      include: {
        service: {
          select: {
            name: true,
            category: true,
          },
        },
        customer: {
          select: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                phone_number: true,
              },
            },
          },
        },
        payment: {
          select: {
            status: true,
            amount: true,
          },
        },
        chats: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * finalLimit,
      take: finalLimit,
    });

    return {
      data: jobs.map((job) => ({
        id: job.id,
        service: job.service.name,
        category: job.service.category,
        customer: {
          name: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
          phone: job.customer.user.phone_number,
        },
        status: job.status,
        price: Number(job.price),
        paymentStatus: job.payment?.status || 'pending',
        images: job.images || [],
        scheduledAt: job.scheduled_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
        chatId: job.chats.length > 0 ? job.chats[0].id : null,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  // ==================== REVIEW MANAGEMENT ====================

  /**
   * Get all reviews for current provider (paginated)
   */
  async getReviews(
    userId: number,
    filters: { minRating?: number; maxRating?: number; page?: number; limit?: number },
  ) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const { minRating, maxRating, page = 1, limit = 20 } = filters;
    const finalLimit = Math.min(limit, 100);

    const where: any = {
      provider_id: provider.id,
    };

    // Filter by rating range
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    const [total, reviews] = await Promise.all([
      this.prisma.ratings_feedback.count({ where }),
      this.prisma.ratings_feedback.findMany({
        where,
        include: {
          customer: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          job: {
            select: {
              id: true,
              service: {
                select: {
                  name: true,
                  category: true,
                },
              },
              completed_at: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * finalLimit,
        take: finalLimit,
      }),
    ]);

    return {
      data: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        feedback: review.feedback,
        punctualityRating: review.punctuality_rating,
        responseTime: review.response_time,
        customer: {
          name: `${review.customer.user.first_name} ${review.customer.user.last_name}`,
        },
        job: {
          id: review.job.id,
          service: review.job.service.name,
          category: review.job.service.category,
          completedAt: review.job.completed_at,
        },
        createdAt: review.created_at,
      })),
      pagination: {
        total,
        page,
        limit: finalLimit,
        totalPages: Math.ceil(total / finalLimit),
      },
    };
  }

  /**
   * Get review statistics for current provider
   */
  async getReviewStats(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
      include: {
        feedbacks: {
          select: {
            rating: true,
            punctuality_rating: true,
            response_time: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const totalReviews = provider.feedbacks.length;

    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        averagePunctuality: 0,
        averageResponseTime: 0,
        ratingBreakdown: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
        percentages: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    // Calculate averages
    const totalRating = provider.feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
    const totalPunctuality = provider.feedbacks.reduce(
      (sum, f) => sum + (f.punctuality_rating || 0),
      0,
    );
    const totalResponseTime = provider.feedbacks.reduce(
      (sum, f) => sum + (f.response_time || 0),
      0,
    );

    const averageRating = totalRating / totalReviews;
    const averagePunctuality = totalPunctuality / totalReviews;
    const averageResponseTime = totalResponseTime / totalReviews;

    // Rating breakdown
    const ratingBreakdown = {
      5: provider.feedbacks.filter((f) => f.rating === 5).length,
      4: provider.feedbacks.filter((f) => f.rating === 4).length,
      3: provider.feedbacks.filter((f) => f.rating === 3).length,
      2: provider.feedbacks.filter((f) => f.rating === 2).length,
      1: provider.feedbacks.filter((f) => f.rating === 1).length,
    };

    return {
      totalReviews,
      averageRating: Number(averageRating.toFixed(2)),
      averagePunctuality: Number(averagePunctuality.toFixed(2)),
      averageResponseTime: Math.round(averageResponseTime),
      ratingBreakdown,
      percentages: {
        5: Math.round((ratingBreakdown[5] / totalReviews) * 100),
        4: Math.round((ratingBreakdown[4] / totalReviews) * 100),
        3: Math.round((ratingBreakdown[3] / totalReviews) * 100),
        2: Math.round((ratingBreakdown[2] / totalReviews) * 100),
        1: Math.round((ratingBreakdown[1] / totalReviews) * 100),
      },
    };
  }

  /**
   * Get specific review details
   */
  async getReviewById(userId: number, reviewId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const review = await this.prisma.ratings_feedback.findUnique({
      where: { id: reviewId },
      include: {
        customer: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            service: {
              select: {
                name: true,
                category: true,
              },
            },
            completed_at: true,
            price: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.provider_id !== provider.id) {
      throw new ForbiddenException('You can only view your own reviews');
    }

    return {
      id: review.id,
      rating: review.rating,
      feedback: review.feedback,
      punctualityRating: review.punctuality_rating,
      responseTime: review.response_time,
      customer: {
        name: `${review.customer.user.first_name} ${review.customer.user.last_name}`,
      },
      job: {
        id: review.job.id,
        service: review.job.service.name,
        category: review.job.service.category,
        completedAt: review.job.completed_at,
        price: Number(review.job.price),
      },
      createdAt: review.created_at,
    };
  }
}