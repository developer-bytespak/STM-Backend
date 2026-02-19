import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateJobDto, ReassignJobDto, RespondJobDto, JobResponseAction } from './dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../shared/services/email.service';
import { ChatService } from '../chat/chat.service';
import { SearchMatchingService } from '../services/search-matching.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly emailService: EmailService,
    private readonly searchMatchingService: SearchMatchingService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  /**
   * Create a new job with chat and initial message
   */
  async createJob(customerId: number, dto: CreateJobDto) {
    // Verify customer exists
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: customerId },
      include: {
        user: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
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
        user: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
          },
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

    // ========== NEW JOB BLOCKING LOGIC ==========
    // RULE 1: Completed but NOT paid → Block ALL
    // RULE 2: In progress with SAME SP → Block, allow DIFFERENT SP
    // RULE 3: New with SAME SP (SP not responded) → Block, allow DIFFERENT SP
    // RULE 4: New with SP ACCEPTED → Block ALL
    
    const existingJobs = await this.prisma.jobs.findMany({
      where: {
        customer_id: customer.id,
        status: { in: ['new', 'in_progress', 'completed'] },
      },
      include: {
        service: { select: { name: true } },
        service_provider: {
          include: {
            user: { select: { first_name: true, last_name: true } },
          },
        },
        payment: { select: { status: true } },
      },
    });

    // Check each existing job for blocking
    for (const existingJob of existingJobs) {
      const providerName = `${existingJob.service_provider.user.first_name} ${existingJob.service_provider.user.last_name}`;
      const isSameProvider = existingJob.provider_id === dto.providerId;

      // RULE 1: COMPLETED but NOT PAID → Block everything
      if (existingJob.status === 'completed' && existingJob.payment?.status !== 'received') {
        throw new BadRequestException(
          `You have an unpaid job (#${existingJob.id}) with ${providerName}. Complete payment before creating new jobs.`,
        );
      }

      // RULE 2: IN_PROGRESS - Block only SAME provider
      if (existingJob.status === 'in_progress') {
        if (isSameProvider) {
          throw new BadRequestException(
            `You already have a job in progress with ${providerName}. Complete or cancel it first before requesting another job with them.`,
          );
        }
        // Different provider is OK
        continue;
      }

      // RULE 3: NEW status - Check acceptance
      if (existingJob.status === 'new') {
        // 3a: If SP accepted - Block everything
        if (existingJob.sp_accepted) {
          throw new BadRequestException(
            `You have an active request (#${existingJob.id}) awaiting your confirmation. Close or cancel it first.`,
          );
        }

        // 3b: SP not accepted yet - Block SAME provider only
        if (isSameProvider) {
          throw new BadRequestException(
            `You already have a pending request (#${existingJob.id}) with ${providerName}. Resend the request or wait for response.`,
          );
        }
        // Different provider is OK
        continue;
      }
    }

    // Create job, payment, chat, and initial message in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Prepare answers with in-person visit info if requested
      const jobAnswers = {
        ...dto.answers,
        ...(dto.requiresInPersonVisit && {
          in_person_visit_requested: true,
          in_person_visit_cost: dto.inPersonVisitCost || 50, // Default $50 if not specified
        }),
        ...(dto.projectSizeSqft != null && {
          project_size_sqft: dto.projectSizeSqft,
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

      // 6. Send provider's auto-message if they have a customized template
      let providerAutoMessage = null;
      const emailTemplate = await tx.sp_email_templates.findUnique({
        where: { provider_id: provider.id },
        select: { first_message_template: true },
      });

      if (emailTemplate?.first_message_template) {
        const customerName = `${customer.user.first_name} ${customer.user.last_name}`;
        const scheduledDateStr = dto.preferredDate 
          ? new Date(dto.preferredDate).toLocaleDateString()
          : 'Not specified';

        // Replace variables in the template
        const autoMessageText = this.chatService.replaceMessageVariables(
          emailTemplate.first_message_template,
          {
            customerName,
            serviceName: service.name,
            location: dto.location,
            scheduledDate: scheduledDateStr,
          },
        );

        // Create the provider's auto-message directly in transaction
        providerAutoMessage = await tx.messages.create({
          data: {
            chat_id: chat.id,
            sender_type: 'service_provider',
            sender_id: provider.user_id,
            message_type: 'text',
            message: autoMessageText,
          },
        });
      }

      // 5. Create notification for provider
      const notification = await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: provider.user_id,
          type: 'job',
          title: 'New Job Request',
          message: `You have a new ${service.name} request from a customer`,
        },
      });

      // Emit real-time notification via socket
      await this.notificationsGateway.emitNotificationToUser(
        provider.user_id,
        notification,
      );

      // Send email notification to provider (non-blocking)
      if (provider.user?.email) {
        const providerName = provider.business_name || `${provider.user.first_name} ${provider.user.last_name}`;
        const customerName = `${customer.user.first_name} ${customer.user.last_name}`;
        this.emailService.sendJobRequestEmailToProvider(
          provider.user.email,
          providerName,
          {
            jobId: job.id,
            serviceName: service.name,
            customerName: customerName,
            location: dto.location,
            price: dto.customerBudget,
            scheduledAt: dto.preferredDate,
          },
        ).catch((error) => {
          // Log error but don't fail the job creation
          console.error('Failed to send job request email:', error);
        });
      }

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
        providerAutoMessage: providerAutoMessage,
        providerUserId: provider.user_id,
        customerUserId: customerId,
        message: 'Job created successfully. Service provider has been notified.',
      };
    });

    // Emit provider's auto-message via Socket.IO if one was created
    if (result.providerAutoMessage) {
      const providerName = provider.business_name || `${provider.user.first_name} ${provider.user.last_name}`;
      this.chatService.emitProviderAutoMessage(
        result.providerAutoMessage,
        provider.id,
        customerId,
        providerName,
      );
    }

    // Return clean response
    return {
      job: result.job,
      chat: result.chat,
      message: result.message,
    };
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

    if (dto.projectSizeSqft != null) {
      message += `📏 Project Size: ${dto.projectSizeSqft} sq ft\n`;
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
   * Get alternative providers for a job (same service, same area as current provider).
   * Used when a job was rejected so the customer can choose another provider.
   */
  async getAlternativeProviders(customerId: number, jobId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: true,
        service_provider: {
          include: { service_areas: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customer_id !== customer.id) {
      throw new ForbiddenException('You can only reassign your own jobs');
    }

    if (job.status !== 'new' && job.status !== 'rejected_by_sp') {
      throw new BadRequestException(
        'Alternative providers are only available for new or rejected jobs',
      );
    }

    const areas = job.service_provider?.service_areas ?? [];
    const zipcode =
      areas.find((a) => a.is_primary)?.zipcode ?? areas[0]?.zipcode ?? undefined;

    const result = await this.searchMatchingService.getProvidersForService(
      job.service_id,
      zipcode,
      'rating',
    );

    const providers = result.providers.filter((p) => p.id !== job.provider_id);

    return {
      service: result.service,
      providers,
      zipcode: zipcode ?? null,
    };
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

    // Get existing job with current provider's service areas (for same-area validation)
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service: true,
        chats: true,
        service_provider: {
          include: { service_areas: true },
        },
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

    // Verify new provider (include service_areas for same-area check)
    const newProvider = await this.prisma.service_providers.findUnique({
      where: { id: dto.newProviderId },
      include: {
        provider_services: {
          where: { service_id: job.service_id },
        },
        service_areas: true,
      },
    });

    if (!newProvider || newProvider.status !== 'active') {
      throw new BadRequestException('Service provider not available');
    }

    if (newProvider.provider_services.length === 0) {
      throw new BadRequestException('Provider does not offer this service');
    }

    // Same-area check: new provider must serve the job's area (from current provider's service areas)
    const areas = job.service_provider?.service_areas ?? [];
    const areaZipcode =
      areas.find((a) => a.is_primary)?.zipcode ?? areas[0]?.zipcode;
    if (areaZipcode) {
      const servesArea = newProvider.service_areas.some(
        (a) => a.zipcode === areaZipcode,
      );
      if (!servesArea) {
        throw new BadRequestException(
          'Selected provider does not serve this job\'s area',
        );
      }
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

      // 2. Update job (optional customerBudget / preferredDate from dto)
      const updatedJob = await tx.jobs.update({
        where: { id: jobId },
        data: {
          provider_id: newProvider.id,
          status: 'new',
          response_deadline: new Date(Date.now() + 60 * 60 * 1000),
          rejection_reason: null,
          sp_accepted: false,
          edited_answers: null,
          pending_approval: false,
          ...(dto.customerBudget != null && { price: dto.customerBudget }),
          ...(dto.preferredDate && {
            scheduled_at: new Date(dto.preferredDate),
          }),
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

      // 5. Create initial message (use updated budget/date if customer edited them)
      const messageBudget =
        dto.customerBudget != null ? dto.customerBudget : Number(job.price);
      const messageDate = dto.preferredDate
        ? new Date(dto.preferredDate)
        : job.scheduled_at;
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
            zipcode: '',
            preferredDate: messageDate?.toISOString(),
            customerBudget: messageBudget,
          }),
        },
      });

      // 6. Notify new provider
      const notification = await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: newProvider.user_id,
          type: 'job',
          title: 'New Job Request',
          message: `You have a new ${job.service.name} request from a customer`,
        },
      });

      // Emit real-time notification via socket
      await this.notificationsGateway.emitNotificationToUser(
        newProvider.user_id,
        notification,
      );

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
      include: {
        user: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
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
                email: true,
                first_name: true,
                last_name: true,
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
        const notification = await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user.id,
            type: 'job',
            title: 'Job Accepted',
            message: `Your ${job.service.name} request has been accepted. You can now close the deal to start the job.`,
          },
        });

        // Emit real-time notification via socket
        await this.notificationsGateway.emitNotificationToUser(
          job.customer.user.id,
          notification,
        );

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

        // Send email notification to customer (non-blocking)
        if (job.customer.user?.email) {
          const customerName = `${job.customer.user.first_name} ${job.customer.user.last_name}`;
          const providerName = provider.business_name || `${provider.user.first_name} ${provider.user.last_name}`;
          this.emailService.sendJobAcceptedEmailToCustomer(
            provider.id,
            job.customer.user.email,
            customerName,
            {
              jobId: job.id,
              serviceName: job.service.name,
              providerName: providerName,
              price: Number(job.price),
            },
          ).catch((error) => {
            console.error('Failed to send job accepted email:', error);
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
        const notification = await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user.id,
            type: 'job',
            title: 'Service Provider Proposed Changes',
            message: `${provider.business_name || 'Service provider'} proposed changes to your ${job.service.name} request. Please review.`,
          },
        });

        // Emit real-time notification via socket
        await this.notificationsGateway.emitNotificationToUser(
          job.customer.user.id,
          notification,
        );

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

        // Send email notification to customer (non-blocking)
        if (job.customer.user?.email) {
          const customerName = `${job.customer.user.first_name} ${job.customer.user.last_name}`;
          const providerName = provider.business_name || `${provider.user.first_name} ${provider.user.last_name}`;
          this.emailService.sendJobNegotiationEmailToCustomer(
            provider.id,
            job.customer.user.email,
            customerName,
            {
              jobId: job.id,
              serviceName: job.service.name,
              providerName: providerName,
              negotiationNotes: negotiation.notes,
              editedPrice: negotiation.editedPrice,
              editedSchedule: negotiation.editedSchedule,
              originalPrice: Number(job.price),
            },
          ).catch((error) => {
            console.error('Failed to send job negotiation email:', error);
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
        const notification = await tx.notifications.create({
          data: {
            recipient_type: 'customer',
            recipient_id: job.customer.user.id,
            type: 'job',
            title: 'Job Declined',
            message: `Your ${job.service.name} request was declined. Reason: ${dto.reason}`,
          },
        });

        // Emit real-time notification via socket
        await this.notificationsGateway.emitNotificationToUser(
          job.customer.user.id,
          notification,
        );

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

  /**
   * Resend job request to same provider
   * Extends deadline and notifies provider again
   */
  async resendJobRequest(customerId: number, jobId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        service_provider: {
          include: {
            user: { select: { first_name: true, last_name: true } },
          },
        },
        service: { select: { name: true } },
        chats: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.customer_id !== customer.id) {
      throw new ForbiddenException('You can only resend your own jobs');
    }

    // Can only resend if status is 'new' and SP hasn't accepted
    if (job.status !== 'new') {
      throw new BadRequestException('Can only resend pending requests');
    }

    if (job.sp_accepted) {
      throw new BadRequestException('Cannot resend - provider has already accepted');
    }

    // Extend deadline by 1 hour
    const newDeadline = new Date(Date.now() + 60 * 60 * 1000);

    return await this.prisma.$transaction(async (tx) => {
      // Update job with new deadline
      const updatedJob = await tx.jobs.update({
        where: { id: jobId },
        data: {
          response_deadline: newDeadline,
        },
      });

      // Send resend notification to provider
      await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: job.service_provider.user_id,
          type: 'job',
          title: '🔔 Job Request Reminder',
          message: `Customer resent their ${job.service.name} request. New deadline: ${newDeadline.toLocaleString()}`,
        },
      });

      // Add chat message
      if (job.chats.length > 0) {
        await tx.messages.create({
          data: {
            chat_id: job.chats[0].id,
            sender_type: 'customer',
            sender_id: customerId,
            message_type: 'text',
            message: '📢 Reminder: Please review and respond to this request. Deadline extended by 1 hour.',
          },
        });
      }

      return {
        jobId: updatedJob.id,
        newDeadline: updatedJob.response_deadline,
        message: 'Job request resent successfully. Provider has been notified.',
      };
    });
  }
}
