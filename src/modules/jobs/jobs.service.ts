import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateJobDto, ReassignJobDto, RespondJobDto, JobResponseAction } from './dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new job with chat and initial message
   */
  async createJob(customerId: number, dto: CreateJobDto) {
    // Verify customer exists
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // Verify service exists
    const service = await this.prisma.services.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service || service.status !== 'approved') {
      throw new BadRequestException('Service not available');
    }

    // Verify provider exists and is active
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: dto.providerId },
      include: {
        service_areas: true,
        provider_services: {
          where: { service_id: dto.serviceId },
        },
      },
    });

    if (!provider || provider.status !== 'active') {
      throw new BadRequestException('Service provider not available');
    }

    // Verify provider offers this service
    if (provider.provider_services.length === 0) {
      throw new BadRequestException('Provider does not offer this service');
    }

    // Verify provider serves this zipcode
    const servesZipcode = provider.service_areas.some(
      (area) => area.zipcode === dto.zipcode,
    );

    if (!servesZipcode) {
      throw new BadRequestException(
        'Provider does not serve this zipcode area',
      );
    }

    // Check if customer is banned
    if (customer.status === 'banned') {
      throw new ForbiddenException('Your account is suspended. Contact support.');
    }

    // Check if customer has unpaid jobs with DIFFERENT providers
    // Allow creating jobs with the same provider (for payment/continuation)
    const unpaidJob = await this.prisma.jobs.findFirst({
      where: {
        customer_id: customer.id,
        provider_id: { not: dto.providerId }, // Only block if different provider
        status: { in: ['new', 'in_progress', 'completed'] },
      },
      include: {
        service: { select: { name: true } },
        service_provider: {
          include: {
            user: { select: { first_name: true, last_name: true } },
          },
        },
      },
    });

    if (unpaidJob) {
      const providerName = `${unpaidJob.service_provider.user.first_name} ${unpaidJob.service_provider.user.last_name}`;
      throw new BadRequestException(
        `You have an unpaid job (#${unpaidJob.id} - ${unpaidJob.service.name}) with ${providerName}. Please complete payment before booking with another provider.`,
      );
    }

    // Create job, payment, chat, and initial message in a transaction
    return await this.prisma.$transaction(async (tx) => {
      // Prepare answers with in-person visit info if requested
      const jobAnswers = {
        ...dto.answers,
        ...(dto.requiresInPersonVisit && {
          in_person_visit_requested: true,
          in_person_visit_cost: dto.inPersonVisitCost || 50, // Default $50 if not specified
        }),
      };

      // 1. Create job
      const job = await tx.jobs.create({
        data: {
          customer_id: customer.id,
          provider_id: provider.id,
          service_id: dto.serviceId,
          status: 'new',
          location: dto.location,
          answers_json: jobAnswers,
          images: dto.images || [], // Store customer uploaded images
          price: dto.customerBudget || 0, // Save customer's budget as job price
          scheduled_at: dto.preferredDate ? new Date(dto.preferredDate) : null,
          response_deadline: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        },
      });

      // 2. Create chat (payment will be created when job is completed)
      const chat = await tx.chat.create({
        data: {
          job_id: job.id,
          customer_id: customer.id,
          provider_id: provider.id,
          is_active: true,
        },
      });

      // 4. Create initial message with job details (without image URLs in text)
      const initialMessage = await tx.messages.create({
        data: {
          chat_id: chat.id,
          sender_type: 'customer',
          sender_id: customerId,
          message_type: 'text',
          message: this.formatJobDetailsMessage(service.name, dto),
        },
      });

      // 4b. If images exist, send them as a separate visual message
      if (dto.images && dto.images.length > 0) {
        await tx.messages.create({
          data: {
            chat_id: chat.id,
            sender_type: 'customer',
            sender_id: customerId,
            message_type: 'image',
            message: JSON.stringify({
              images: dto.images,
              count: dto.images.length
            }),
          },
        });
      }

      // 5. Create notification for provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: provider.user_id,
          type: 'job',
          title: 'New Job Request',
          message: `You have a new ${service.name} request from a customer`,
        },
      });

      return {
        job: {
          id: job.id,
          status: job.status,
          service: service.name,
          location: job.location,
          scheduled_at: job.scheduled_at,
          response_deadline: job.response_deadline,
          created_at: job.created_at,
        },
        chat: {
          id: chat.id,
          created_at: chat.created_at,
        },
        message: 'Job created successfully. Service provider has been notified.',
      };
    });
  }

  /**
   * Format job details as initial chat message
   */
  private formatJobDetailsMessage(serviceName: string, dto: CreateJobDto): string {
    let message = `📋 New ${serviceName} Request\n\n`;
    message += `📍 Location: ${dto.location}\n`;
    message += `📮 Zipcode: ${dto.zipcode}\n`;
    
    if (dto.customerBudget) {
      message += `💰 Customer Budget: $${dto.customerBudget}\n`;
    }
    
    if (dto.preferredDate) {
      message += `📅 Preferred Date: ${dto.preferredDate}\n`;
    }

    // Highlight in-person visit request
    if (dto.requiresInPersonVisit) {
      const visitCost = dto.inPersonVisitCost || 50;
      message += `🏠 In-Person Visit Requested (Additional Cost: $${visitCost})\n`;
    }

    // Just mention images without URLs (they'll be sent as separate message)
    if (dto.images && dto.images.length > 0) {
      message += `\n📷 Customer uploaded ${dto.images.length} image(s) to support this request\n`;
    }

    if (dto.answers && Object.keys(dto.answers).length > 0) {
      message += `\n📝 Details:\n`;
      Object.entries(dto.answers).forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        message += `  • ${formattedKey}: ${value}\n`;
      });
    }

    return message;
  }

  /**
   * Get all jobs for a customer
   */
  async getCustomerJobs(customerId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const jobs = await this.prisma.jobs.findMany({
      where: { customer_id: customer.id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
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
      },
      orderBy: { created_at: 'desc' },
    });

    return jobs.map((job) => ({
      id: job.id,
      status: job.status,
      service: job.service,
      provider: {
        id: job.service_provider.id,
        businessName: job.service_provider.business_name,
        rating: parseFloat(job.service_provider.rating.toString()),
        user: job.service_provider.user,
      },
      location: job.location,
      images: job.images || [],
      scheduled_at: job.scheduled_at,
      completed_at: job.completed_at,
      created_at: job.created_at,
    }));
  }

  /**
   * Reassign job to a different provider
   */
  async reassignJob(customerId: number, jobId: number, dto: ReassignJobDto) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // Get existing job
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: true,
        chats: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customer_id !== customer.id) {
      throw new ForbiddenException('You can only reassign your own jobs');
    }

    if (job.status !== 'new' && job.status !== 'rejected_by_sp') {
      throw new BadRequestException('Only new or rejected jobs can be reassigned');
    }

    // Verify new provider
    const newProvider = await this.prisma.service_providers.findUnique({
      where: { id: dto.newProviderId },
      include: {
        provider_services: {
          where: { service_id: job.service_id },
        },
      },
    });

    if (!newProvider || newProvider.status !== 'active') {
      throw new BadRequestException('Service provider not available');
    }

    if (newProvider.provider_services.length === 0) {
      throw new BadRequestException('Provider does not offer this service');
    }

    // Reassign in transaction
    return await this.prisma.$transaction(async (tx) => {
      // 1. Delete old chat if exists
      if (job.chats.length > 0) {
        await tx.messages.deleteMany({
          where: { chat_id: { in: job.chats.map((c) => c.id) } },
        });
        await tx.chat.deleteMany({
          where: { job_id: jobId },
        });
      }

      // 2. Update job
      const updatedJob = await tx.jobs.update({
        where: { id: jobId },
        data: {
          provider_id: newProvider.id,
          status: 'new',
          response_deadline: new Date(Date.now() + 60 * 60 * 1000),
          rejection_reason: null,
          sp_accepted: false, // Reset acceptance
          edited_answers: null, // Clear any previous negotiations
          pending_approval: false, // Clear pending approvals
          // Note: job.price (customer budget) is preserved
        },
      });

      // 2b. Clear job state for reassignment (payment will be created when job completes)

      // 4. Create new chat
      const newChat = await tx.chat.create({
        data: {
          job_id: jobId,
          customer_id: customer.id,
          provider_id: newProvider.id,
          is_active: true,
        },
      });

      // 5. Create initial message
      await tx.messages.create({
        data: {
          chat_id: newChat.id,
          sender_type: 'customer',
          sender_id: customerId,
          message_type: 'text',
          message: this.formatJobDetailsMessage(job.service.name, {
            serviceId: job.service_id,
            providerId: newProvider.id,
            answers: job.answers_json as Record<string, any>,
            location: job.location,
            zipcode: '', // Not stored in job, would need to get from customer
            preferredDate: job.scheduled_at?.toISOString(),
            customerBudget: Number(job.price), // Include customer budget
          }),
        },
      });

      // 6. Notify new provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: newProvider.user_id,
          type: 'job',
          title: 'New Job Request',
          message: `You have a new ${job.service.name} request from a customer`,
        },
      });

      return {
        jobId: updatedJob.id,
        status: updatedJob.status,
        newProviderId: newProvider.id,
        chatId: newChat.id,
        message: 'Job reassigned successfully',
      };
    });
  }

  /**
   * Get pending jobs for a provider
   */
  async getProviderPendingJobs(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const jobs = await this.prisma.jobs.findMany({
      where: {
        provider_id: provider.id,
        status: 'new',
      },
      include: {
        service: {
          select: {
            name: true,
            category: true,
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
      },
      orderBy: { created_at: 'desc' },
    });

    return jobs.map((job) => ({
      id: job.id,
      service: job.service,
      customer: {
        name: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        phone: job.customer.user.phone_number,
      },
      location: job.location,
      images: job.images || [],
      answers: job.answers_json,
      scheduled_at: job.scheduled_at,
      response_deadline: job.response_deadline,
      created_at: job.created_at,
    }));
  }

  /**
   * Get all active jobs for a provider
   */
  async getProviderJobs(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const jobs = await this.prisma.jobs.findMany({
      where: {
        provider_id: provider.id,
        status: { in: ['in_progress', 'completed'] },
      },
      include: {
        service: {
          select: {
            name: true,
            category: true,
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
      },
      orderBy: { created_at: 'desc' },
    });

    return jobs.map((job) => ({
      id: job.id,
      status: job.status,
      service: job.service,
      customer: {
        name: `${job.customer.user.first_name} ${job.customer.user.last_name}`,
        phone: job.customer.user.phone_number,
      },
      location: job.location,
      images: job.images || [],
      scheduled_at: job.scheduled_at,
      completed_at: job.completed_at,
      created_at: job.created_at,
    }));
  }

  /**
   * Provider responds to job (accept or reject)
   */
  async respondToJob(userId: number, jobId: number, dto: RespondJobDto) {
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
        chats: true,
        customer: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.provider_id !== provider.id) {
      throw new ForbiddenException('You can only respond to jobs assigned to you');
    }

    if (job.status !== 'new') {
      throw new BadRequestException('Job has already been responded to');
    }

    if (dto.action === JobResponseAction.REJECT && !dto.reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (dto.action === JobResponseAction.NEGOTIATE && !dto.negotiation) {
      throw new BadRequestException('Negotiation details are required');
    }

    // Handle response in transaction
    return await this.prisma.$transaction(async (tx) => {
      if (dto.action === JobResponseAction.ACCEPT) {
        // Accept: SP accepted, job stays 'new' (customer closes deal later)
        const updatedJob = await tx.jobs.update({
          where: { id: jobId },
          data: {
            sp_accepted: true, // Mark SP accepted
            // status stays 'new' - customer closes deal later
          },
        });

        // Notify customer
        await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user.id,
            type: 'job',
            title: 'Job Accepted',
            message: `Your ${job.service.name} request has been accepted. You can now close the deal to start the job.`,
          },
        });

        // Add system message to chat
        if (job.chats.length > 0) {
          await tx.messages.create({
            data: {
              chat_id: job.chats[0].id,
              sender_type: 'service_provider',
              sender_id: userId,
              message_type: 'text',
              message: '✅ I have accepted your request. Please review and close the deal to proceed!',
            },
          });
        }

        return {
          jobId: updatedJob.id,
          status: updatedJob.status,
          spAccepted: true,
          action: 'accepted',
          message: 'Job accepted successfully. Waiting for customer to close deal.',
        };
      } else if (dto.action === JobResponseAction.NEGOTIATE) {
        // Negotiate: SP proposes changes, customer must approve
        const negotiation = dto.negotiation!;

        // Build edited answers object
        const editedAnswers: any = {};
        if (negotiation.editedAnswers) {
          editedAnswers.answers = negotiation.editedAnswers;
        }
        if (negotiation.editedPrice !== undefined) {
          editedAnswers.price = negotiation.editedPrice;
        }
        if (negotiation.editedSchedule) {
          editedAnswers.schedule = negotiation.editedSchedule;
        }
        editedAnswers.notes = negotiation.notes;
        editedAnswers.proposedAt = new Date().toISOString();

        const updatedJob = await tx.jobs.update({
          where: { id: jobId },
          data: {
            edited_answers: editedAnswers,
            pending_approval: true,
            // status stays 'new'
          },
        });

        // Notify customer
        await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user.id,
            type: 'job',
            title: 'Service Provider Proposed Changes',
            message: `${provider.business_name || 'Service provider'} proposed changes to your ${job.service.name} request. Please review.`,
          },
        });

        // Add message to chat showing proposed changes
        if (job.chats.length > 0) {
          let changesMessage = '💡 I propose the following changes:\n\n';
          if (negotiation.editedPrice) {
            changesMessage += `💰 New Price: $${negotiation.editedPrice}\n`;
          }
          if (negotiation.editedSchedule) {
            changesMessage += `📅 New Schedule: ${negotiation.editedSchedule}\n`;
          }
          if (negotiation.editedAnswers && Object.keys(negotiation.editedAnswers).length > 0) {
            changesMessage += `📝 Updated Details:\n`;
            Object.entries(negotiation.editedAnswers).forEach(([key, value]) => {
              changesMessage += `  • ${key}: ${value}\n`;
            });
          }
          changesMessage += `\n💬 ${negotiation.notes}`;

          await tx.messages.create({
            data: {
              chat_id: job.chats[0].id,
              sender_type: 'service_provider',
              sender_id: userId,
              message_type: 'text',
              message: changesMessage,
            },
          });
        }

        return {
          jobId: updatedJob.id,
          status: updatedJob.status,
          pendingApproval: true,
          action: 'negotiated',
          message: 'Changes proposed successfully. Waiting for customer approval.',
        };
      } else {
        // Reject: Update job status and delete chat
        const updatedJob = await tx.jobs.update({
          where: { id: jobId },
          data: {
            status: 'rejected_by_sp',
            rejection_reason: dto.reason,
          },
        });

        // Delete chat and messages
        if (job.chats.length > 0) {
          await tx.messages.deleteMany({
            where: { chat_id: { in: job.chats.map((c) => c.id) } },
          });
          await tx.chat.deleteMany({
            where: { job_id: jobId },
          });
        }

        // Notify customer
        await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user.id,
            type: 'job',
            title: 'Job Declined',
            message: `Your ${job.service.name} request was declined. Reason: ${dto.reason}`,
          },
        });

        return {
          jobId: updatedJob.id,
          status: updatedJob.status,
          action: 'rejected',
          reason: dto.reason,
          message: 'Job rejected successfully',
        };
      }
    });
  }
}
