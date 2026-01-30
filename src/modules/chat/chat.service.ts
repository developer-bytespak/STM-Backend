import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Get all chats for a customer
   */
  async getCustomerChats(customerId: number) {
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    const chats = await this.prisma.chat.findMany({
      where: {
        customer_id: customer.id,
        is_active: true,
        is_deleted: false,
      },
      include: {
        job: {
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        },
        service_provider: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                profile_picture: true,
              },
            },
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1, // Latest message only
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return chats.map((chat) => ({
      id: chat.id,
      job: {
        id: chat.job?.id,
        service: chat.job?.service,
        status: chat.job?.status,
      },
      provider: {
        id: chat.service_provider.id,
        userId: chat.service_provider.user.id,
        businessName: chat.service_provider.business_name,
        user: chat.service_provider.user,
      },
      lastMessage: chat.messages[0] || null,
      created_at: chat.created_at,
    }));
  }

  /**
   * Get all chats for a provider
   */
  async getProviderChats(userId: number) {
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    if (!provider) {
      throw new NotFoundException('Service provider profile not found');
    }

    const chats = await this.prisma.chat.findMany({
      where: {
        provider_id: provider.id,
        is_active: true,
        is_deleted: false,
      },
      include: {
        job: {
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        },
        customer: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                profile_picture: true,
              },
            },
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return chats.map((chat) => ({
      id: chat.id,
      job: {
        id: chat.job?.id,
        service: chat.job?.service,
        status: chat.job?.status,
      },
      customer: {
        userId: chat.customer.user.id,
        name: `${chat.customer.user.first_name} ${chat.customer.user.last_name}`,
        profilePicture: chat.customer.user.profile_picture,
      },
      lastMessage: chat.messages[0] || null,
      created_at: chat.created_at,
    }));
  }

  /**
   * Get all chats for an LSM (Local Service Manager)
   */
  async getLSMChats(userId: number) {
    const lsm = await this.prisma.local_service_managers.findUnique({
      where: { user_id: userId },
    });

    if (!lsm) {
      throw new NotFoundException('LSM profile not found');
    }

    const chats = await this.prisma.chat.findMany({
      where: {
        lsm_id: lsm.id,
        lsm_joined: true, // Only show chats LSM has joined
        is_active: true,
        is_deleted: false,
      },
      include: {
        job: {
          include: {
            service: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        },
        customer: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                profile_picture: true,
              },
            },
          },
        },
        service_provider: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                profile_picture: true,
              },
            },
          },
        },
        local_service_manager: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { lsm_joined_at: 'desc' }, // Most recently joined first
    });

    return chats.map((chat) => ({
      id: chat.id,
      job: {
        id: chat.job?.id,
        service: chat.job?.service,
        status: chat.job?.status,
      },
      customer: {
        name: `${chat.customer.user.first_name} ${chat.customer.user.last_name}`,
        profilePicture: chat.customer.user.profile_picture,
      },
      provider: {
        id: chat.service_provider.id,
        businessName: chat.service_provider.business_name,
        user: chat.service_provider.user,
      },
      localServiceManager: chat.local_service_manager ? {
        id: chat.local_service_manager.id,
        user: chat.local_service_manager.user,
      } : undefined,
      lsm_invited: chat.lsm_invited,
      lsm_joined: chat.lsm_joined,
      lsm_joined_at: chat.lsm_joined_at,
      lastMessage: chat.messages[0] || null,
      created_at: chat.created_at,
    }));
  }

  /**
   * Get messages for a specific chat
   */
  async getChatMessages(userId: number, chatId: string, userRole: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        customer: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        service_provider: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        local_service_manager: {
          include: {
            user: { select: { id: true, first_name: true, last_name: true } },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Verify user has access to this chat
    const isCustomer = chat.customer.user.id === userId;
    const isProvider = chat.service_provider.user.id === userId;
    const isLSM = chat.local_service_manager && chat.local_service_manager.user.id === userId;

    if (!isCustomer && !isProvider && !isLSM) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    const messages = await this.prisma.messages.findMany({
      where: { chat_id: chatId },
      orderBy: { created_at: 'asc' },
    });

    // Helper function to get sender name (coerce IDs to number for consistent comparison)
    const getSenderName = (senderId: number, senderType: string): string => {
      const sid = Number(senderId);
      if (senderType === 'customer' && Number(chat.customer.user.id) === sid) {
        return `${chat.customer.user.first_name} ${chat.customer.user.last_name}`;
      } else if (senderType === 'service_provider' && Number(chat.service_provider.user.id) === sid) {
        return `${chat.service_provider.user.first_name} ${chat.service_provider.user.last_name}`;
      } else if (senderType === 'local_service_manager' && chat.local_service_manager && Number(chat.local_service_manager.user.id) === sid) {
        return `${chat.local_service_manager.user.first_name} ${chat.local_service_manager.user.last_name}`;
      }
      return 'Unknown User';
    };

    return {
      chatId: chat.id,
        messages: messages.map((msg) => ({
        id: msg.id,
        sender_type: msg.sender_type,
        sender_id: Number(msg.sender_id),
        sender_name: getSenderName(Number(msg.sender_id), msg.sender_type),
        message: msg.message,
        message_type: msg.message_type,
        created_at: msg.created_at,
      })),
    };
  }

  /**
   * Upload files for chat
   * Returns base64 data URLs that can be sent as messages
   */
  async uploadChatFiles(
    userId: number,
    files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
  ) {
    // Validate that user exists (basic auth check)
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const urls: string[] = [];

    // Process each file
    for (const file of files) {
      // Validate file
      if (!file) {
        throw new BadRequestException('Invalid file');
      }

      // Validate file size (max 10MB per file)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException(
          `File "${file.originalname}" is too large. Maximum size is 10MB`,
        );
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/plain',
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type "${file.mimetype}" is not allowed. Supported types: PDF, images, documents, and text files`,
        );
      }

      // For now, store file as base64 data URL
      // In production, you should upload to S3/cloud storage and return a public URL
      const base64File = file.buffer.toString('base64');
      const dataUrl = `data:${file.mimetype};base64,${base64File}`;
      
      urls.push(dataUrl);
    }

    return { urls };
  }

  /**
   * Create a chat from AI flow with summary injection
   * Also creates a job request using extracted data from AI conversation
   */
  async createChatFromAI(
    userId: number,
    providerId: number,
    aiSessionId: string,
    summary: string,
    extractedData?: any, // Extracted data from AI conversation (service, zipcode, budget, requirements)
  ) {
    // Verify customer exists and include user details
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            profile_picture: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }

    // Verify provider exists
    const provider = await this.prisma.service_providers.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Service provider not found');
    }

    if (provider.status !== 'active') {
      throw new BadRequestException('Service provider is not active');
    }

    // Check if chat already exists for this customer-provider pair from AI flow
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        customer_id: customer.id,
        provider_id: providerId,
        from_ai_flow: true,
        ai_session_id: aiSessionId,
        is_active: true,
        is_deleted: false,
      },
      include: {
        job: true, // Include job if it exists
      },
    });

    if (existingChat) {
      // Return existing chat with job info
      console.log('[AI Chat] Chat already exists:', existingChat.id, 'Job ID:', existingChat.job?.id);
      return {
        chatId: existingChat.id,
        jobId: existingChat.job?.id,
        message: 'Chat already exists',
      };
    }

    // Step 1: Create job FIRST (outside transaction, as JobsService has its own transaction)
    let jobId: number | null = null;
    let existingChatFromJob: any = null;

    if (extractedData && extractedData.service) {
      try {
        console.log('\n[AI Chat] ========================================');
        console.log('[AI Chat] STEP 1: Creating job with extracted data');
        console.log('[AI Chat] Extracted data:', JSON.stringify(extractedData, null, 2));
        
        // Find service by name (case-insensitive)
        const service = await this.prisma.services.findFirst({
          where: {
            name: {
              contains: extractedData.service || '',
              mode: 'insensitive',
            },
            status: 'approved',
          },
        });

        if (!service) {
          console.error(`[AI Chat] ❌ Service not found for name: "${extractedData.service}"`);
          console.log('[AI Chat] Will create chat without job');
        } else {
          console.log(`[AI Chat] ✅ Found service: ${service.name} (ID: ${service.id})`);
          
          // Prepare job data with AI-extracted info and smart defaults
          const jobData = {
            serviceId: service.id,
            providerId: providerId,
            zipcode: extractedData.zipcode || customer.zipcode || '',
            location: customer.address || '',
            // Parse budget - remove $ and other currency symbols
            customerBudget: extractedData.budget 
              ? parseFloat(extractedData.budget.toString().replace(/[$,]/g, ''))
              : undefined,
            answers: {
              requirements: extractedData.requirements || '',
              property_type: 'residential',
              service_frequency: 'one-time',
              urgency_level: 'normal',
              ai_generated: true,
            },
            fromAI: true,
          };

          console.log('[AI Chat] Job data prepared:', JSON.stringify(jobData, null, 2));
          console.log('[AI Chat] Calling JobsService.createJob...');

          // Create job using JobsService (has its own transaction AND creates chat)
          const result = await this.jobsService.createJob(userId, jobData);
          jobId = result.job.id;
          
          console.log(`[AI Chat] ✅ Job created successfully with ID: ${jobId}`);
          
          // CRITICAL: JobsService already created a chat! Find it instead of creating duplicate
          existingChatFromJob = await this.prisma.chat.findFirst({
            where: {
              job_id: jobId,
              customer_id: customer.id,
              provider_id: providerId,
              is_active: true,
            },
          });
          
          if (existingChatFromJob) {
            console.log(`[AI Chat] ✅ Found chat created by JobsService: ${existingChatFromJob.id}`);
          }
        }
      } catch (error) {
        console.error('[AI Chat] ❌ Error creating job from AI data:', error.message);
        console.error('[AI Chat] Error details:', error);
        console.error('[AI Chat] Stack trace:', error.stack);
        
        // If it's a business rule error (400), block chat creation
        if (error.status === 400) {
          console.log('[AI Chat] 🚫 BLOCKING: Business rule violation - preventing chat creation');
          console.log('[AI Chat] Reason:', error.message);
          throw error; // Re-throw to controller to show appropriate error
        }
        
        console.log('[AI Chat] Will continue with chat creation without job');
      }
    } else {
      console.log('[AI Chat] ⚠️  No extracted data or service name provided');
      console.log('[AI Chat] extractedData:', extractedData);
      console.log('[AI Chat] Will create chat without job');
    }

    // Step 2: Use existing chat from JobsService OR create new chat
    console.log('[AI Chat] ========================================');
    
    if (existingChatFromJob) {
      // Job was created and JobsService already created the chat - use it!
      console.log('[AI Chat] STEP 2: Using existing chat from JobsService');
      console.log('[AI Chat] Chat ID:', existingChatFromJob.id);
      console.log('[AI Chat] Job ID:', jobId);
      
      // Update the chat to mark it as from AI flow
      await this.prisma.chat.update({
        where: { id: existingChatFromJob.id },
        data: {
          from_ai_flow: true,
          ai_session_id: aiSessionId,
        },
      });
      
      // Get the initial message created by JobsService
      const existingMessages = await this.prisma.messages.findMany({
        where: { chat_id: existingChatFromJob.id },
        orderBy: { created_at: 'asc' },
        take: 1,
      });
      
      const initialMessage = existingMessages[0];
      
      // Prepare data for Socket.IO events (already sent by JobsService, but send again for customer)
      const messageData = {
        id: initialMessage.id,
        chatId: existingChatFromJob.id,
        jobId: jobId,
        senderId: userId,
        senderName: `${customer.user?.first_name || 'Customer'} ${customer.user?.last_name || ''}`,
        senderRole: 'customer',
        content: initialMessage.message,
        timestamp: initialMessage.created_at,
        type: initialMessage.message_type,
      };
      
      // Emit to customer's personal room so they see the message immediately
      this.chatGateway.server.to(`user:${userId}`).emit('new_message', messageData);
      
      console.log(`[AI Chat] 📤 Message emitted to customer room: user:${userId}`);
      console.log('[AI Chat] ========================================');
      console.log('[AI Chat] ✅ COMPLETE: Using existing chat from job creation');
      console.log('[AI Chat] Chat ID:', existingChatFromJob.id);
      console.log('[AI Chat] Job ID:', jobId);
      console.log('[AI Chat] ========================================\n');
      
      return {
        chatId: existingChatFromJob.id,
        jobId: jobId,
        message: 'Using existing chat from job creation',
      };
    }
    
    // No existing chat from job - create new chat
    console.log('[AI Chat] STEP 2: Creating new chat', jobId ? `and linking to job ${jobId}` : '(no job)');
    
    return await this.prisma.$transaction(async (tx) => {
      // Create chat with AI flow flag and optional job linkage
      const chat = await tx.chat.create({
        data: {
          customer_id: customer.id,
          provider_id: providerId,
          from_ai_flow: true,
          ai_session_id: aiSessionId,
          is_active: true,
          job_id: jobId, // Link chat to job if created
        },
      });

      // Create system message with AI summary (without smart defaults - they're stored in job)
      const message = await tx.messages.create({
        data: {
          chat_id: chat.id,
          sender_type: 'customer',
          sender_id: userId,
          message_type: 'text',
          message: `Here are the details for the service request:\n${summary}`,
        },
      });

      // Create notification with job ID if available for proper redirect
      const notificationTitle = jobId 
        ? `New Job Request [job:${jobId}]`
        : `New Job Request [chat:${chat.id}]`;

      const notification = await tx.notifications.create({
        data: {
          recipient_type: 'service_provider',
          recipient_id: provider.user_id,
          type: 'job',
          title: notificationTitle,
          message: `You have a new job request from ${customer.user?.first_name || 'Customer'} ${customer.user?.last_name || ''}`,
        },
      });

      // Prepare data for Socket.IO events
      const messageData = {
        id: message.id,
        chatId: chat.id,
        jobId: jobId,
        senderId: userId,
        senderName: `${customer.user?.first_name || 'Customer'} ${customer.user?.last_name || ''}`,
        senderRole: 'customer',
        content: message.message,
        timestamp: message.created_at,
        type: message.message_type,
      };

      // Emit real-time notification via socket
      this.chatGateway.server.to(`user:${provider.user_id}`).emit('notification:created', {
        notification: {
          id: notification.id,
          recipient_type: notification.recipient_type,
          recipient_id: notification.recipient_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          is_read: notification.is_read,
          created_at: notification.created_at,
        },
      });

      // Emit combined event: notification + chat for dual action (redirect + auto-open)
      this.chatGateway.server.to(`user:${provider.user_id}`).emit('new_job_with_chat', {
        notification: {
          type: 'job',
          jobId: jobId,
          chatId: chat.id,
          title: notificationTitle,
          message: `New job request from ${customer.user?.first_name || 'Customer'} ${customer.user?.last_name || ''}`,
        },
        chat: messageData,
      });
      
      // Also emit to chat room for real-time updates
      this.chatGateway.server.to(chat.id).emit('new_message', messageData);
      
      // CRITICAL: Emit to customer's personal room so they see the message immediately
      this.chatGateway.server.to(`user:${userId}`).emit('new_message', messageData);
      
      console.log(`[AI Chat] 📤 Message emitted to:`);  
      console.log(`  - Provider room: user:${provider.user_id}`);
      console.log(`  - Customer room: user:${userId}`);
      console.log(`  - Chat room: ${chat.id}`);

      console.log('[AI Chat] ========================================');
      console.log('[AI Chat] ✅ COMPLETE: Chat and job creation finished');
      console.log('[AI Chat] Chat ID:', chat.id);
      console.log('[AI Chat] Job ID:', jobId || 'none');
      console.log('[AI Chat] ========================================\n');

      return {
        chatId: chat.id,
        jobId: jobId,
        message: jobId 
          ? 'Chat and job request created successfully'
          : 'Chat created successfully with AI summary',
      };
    });
  }

  /**
   * Send negotiation offer (both provider and customer can use)
   */
  async sendNegotiationOffer(
    userId: number,
    userRole: string,
    dto: any,
  ) {
    const { job_id, proposed_price, proposed_date, notes } = dto;

    const job = await this.prisma.jobs.findUnique({
      where: { id: job_id },
      include: {
        chats: true,
        customer: { include: { user: true } },
        service_provider: { include: { user: true } },
        service: true,
      },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // Determine sender role
    let senderRole = 'service_provider';
    let senderName = '';
    
    if (userRole === 'customer') {
      const customer = await this.prisma.customers.findUnique({
        where: { user_id: userId },
      });
      if (!customer || customer.id !== job.customer_id) {
        throw new ForbiddenException('Access denied');
      }
      senderRole = 'customer';
      senderName = `${job.customer.user.first_name} ${job.customer.user.last_name}`;
    } else {
      const provider = await this.prisma.service_providers.findUnique({
        where: { user_id: userId },
      });
      if (!provider || provider.id !== job.provider_id) {
        throw new ForbiddenException('Access denied');
      }
      senderRole = 'service_provider';
      senderName = provider.business_name || `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`;
    }

    const chat = job.chats[0];
    if (!chat) {
      throw new BadRequestException('No chat found for this job');
    }

    // Normalize date to ISO string (dto may send Date or string)
    const toIsoDate = (d: Date | string | null | undefined): string | null => {
      if (d == null) return null;
      if (typeof d === 'string') return d || null;
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
      return null;
    };

    // Build offer data
    const offerData = {
      offered_by: senderRole,
      offered_by_name: senderName,
      offered_at: new Date().toISOString(),
      original_price: job.price.toNumber(),
      proposed_price: proposed_price ?? job.price.toNumber(),
      original_date: job.scheduled_at?.toISOString() || null,
      proposed_date: toIsoDate(proposed_date as Date | string) ?? null,
      notes: notes || '',
      status: 'pending',
    };

    // Update job with offer
    await this.prisma.jobs.update({
      where: { id: job_id },
      data: {
        edited_answers: offerData,
        pending_approval: true,
      },
    });

    // Create formatted message
    const messageText = this.formatNegotiationOfferMessage(offerData);

    const message = await this.prisma.messages.create({
      data: {
        chat_id: chat.id,
        sender_type: senderRole as any,
        sender_id: userId,
        message_type: 'text',
        message: messageText,
      },
    });

    // Emit same shape as gateway (snake_case) so frontend displays sender name and date correctly
    const createdAt = message.created_at instanceof Date ? message.created_at.toISOString() : message.created_at;
    const messageData = {
      id: message.id,
      chatId: chat.id,
      sender_type: senderRole,
      sender_id: userId,
      sender_name: senderName,
      message: messageText,
      message_type: 'text' as const,
      created_at: createdAt,
    };

    // Emit only to personal rooms to avoid duplicates
    if (this.chatGateway?.server) {
      this.chatGateway.server.to(`user:${job.customer.user_id}`).emit('new_message', messageData);
      this.chatGateway.server.to(`user:${job.service_provider.user_id}`).emit('new_message', messageData);
      console.log(`[SOCKET] Offer message emitted to user:${job.customer.user_id} and user:${job.service_provider.user_id}`);
    } else {
      console.error('[SOCKET] ChatGateway server not available - message not sent in real-time');
    }

    return {
      success: true,
      message: 'Negotiation offer sent!',
      offer: offerData,
    };
  }

  /**
   * Respond to negotiation offer (accept, decline, counter)
   */
  async respondToNegotiationOffer(
    userId: number,
    userRole: string,
    dto: any,
  ) {
    const { job_id, action, counter_proposed_price, counter_proposed_date, counter_notes } = dto;

    const job = await this.prisma.jobs.findUnique({
      where: { id: job_id },
      include: {
        chats: true,
        customer: { include: { user: true } },
        service_provider: { include: { user: true } },
      },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // Determine responder role
    let responderRole = 'service_provider';
    let responderName = '';
    
    if (userRole === 'customer') {
      const customer = await this.prisma.customers.findUnique({
        where: { user_id: userId },
      });
      if (!customer || customer.id !== job.customer_id) {
        throw new ForbiddenException('Access denied');
      }
      responderRole = 'customer';
      responderName = `${job.customer.user.first_name} ${job.customer.user.last_name}`;
    } else {
      const provider = await this.prisma.service_providers.findUnique({
        where: { user_id: userId },
      });
      if (!provider || provider.id !== job.provider_id) {
        throw new ForbiddenException('Access denied');
      }
      responderRole = 'service_provider';
      responderName = job.service_provider.business_name || `${job.service_provider.user.first_name} ${job.service_provider.user.last_name}`;
    }

    const chat = job.chats[0];
    if (!chat) {
      throw new BadRequestException('No chat found for this job');
    }

    const currentOffer = job.edited_answers as any;
    if (!currentOffer || currentOffer.status !== 'pending') {
      throw new BadRequestException('No pending offer to respond to');
    }

    // Store user IDs before transaction for socket emission
    const customerUserId = job.customer.user_id;
    const providerUserId = job.service_provider.user_id;

    const result = await this.prisma.$transaction(async (tx) => {
      if (action === 'accept') {
        // BOTH CAN ACCEPT - Update job price immediately
        const finalPrice = currentOffer.proposed_price || currentOffer.original_price;
        const finalDate = currentOffer.proposed_date ? new Date(currentOffer.proposed_date) : job.scheduled_at;

        const finalOffer = {
          ...currentOffer,
          status: 'accepted',
          accepted_by: responderRole,
          accepted_by_name: responderName,
          accepted_at: new Date().toISOString(),
        };

        // Update job with final negotiated terms
        await tx.jobs.update({
          where: { id: job_id },
          data: {
            edited_answers: finalOffer,
            pending_approval: false,
            sp_accepted: true,
            price: finalPrice,
            scheduled_at: finalDate,
          },
        });

        const messageText = `🎉 DEAL CONFIRMED!\n\n✅ ${responderName} accepted the offer\n\n📝 Final Terms:\n💰 Price: $${finalPrice}\n📅 Date: ${finalDate ? finalDate.toLocaleDateString() : 'Not specified'}`;

        const message = await tx.messages.create({
          data: {
            chat_id: chat.id,
            sender_type: responderRole as any,
            sender_id: userId,
            message_type: 'text',
            message: messageText,
          },
        });

        const createdAt = message.created_at instanceof Date ? message.created_at.toISOString() : message.created_at;
        const messageData = {
          id: message.id,
          chatId: chat.id,
          sender_type: responderRole,
          sender_id: userId,
          sender_name: responderName,
          message: messageText,
          message_type: 'text' as const,
          created_at: createdAt,
        };

        return { success: true, message: 'Offer accepted! Deal confirmed.', action: 'accepted', messageData };
      }

      if (action === 'decline') {
        const declinedOffer = {
          ...currentOffer,
          status: 'declined',
          declined_by: responderRole,
          declined_by_name: responderName,
          declined_at: new Date().toISOString(),
        };

        await tx.jobs.update({
          where: { id: job_id },
          data: { 
            edited_answers: declinedOffer,
            pending_approval: false,
          },
        });

        const messageText = `❌ Offer Declined\n\n${responderName} declined the offer. You can continue negotiating with a new offer.`;

        const message = await tx.messages.create({
          data: {
            chat_id: chat.id,
            sender_type: responderRole as any,
            sender_id: userId,
            message_type: 'text',
            message: messageText,
          },
        });

        const createdAtDecline = message.created_at instanceof Date ? message.created_at.toISOString() : message.created_at;
        const messageData = {
          id: message.id,
          chatId: chat.id,
          sender_type: responderRole,
          sender_id: userId,
          sender_name: responderName,
          message: messageText,
          message_type: 'text' as const,
          created_at: createdAtDecline,
        };

        return { success: true, message: 'Offer declined.', action: 'declined', messageData };
      }

      if (action === 'counter') {
        if (!counter_proposed_price && !counter_proposed_date) {
          throw new BadRequestException('Please provide at least a price or date for counter offer');
        }

        const counterDateIso =
          counter_proposed_date == null
            ? null
            : counter_proposed_date instanceof Date
              ? counter_proposed_date.toISOString()
              : typeof counter_proposed_date === 'string'
                ? counter_proposed_date
                : null;
        const counterOffer = {
          offered_by: responderRole,
          offered_by_name: responderName,
          counter_to_offer: currentOffer.offered_by,
          offered_at: new Date().toISOString(),
          original_price: currentOffer.proposed_price || currentOffer.original_price,
          proposed_price: counter_proposed_price ?? (currentOffer.proposed_price || currentOffer.original_price),
          original_date: currentOffer.proposed_date || currentOffer.original_date,
          proposed_date: counterDateIso || currentOffer.proposed_date || currentOffer.original_date,
          notes: counter_notes || '',
          status: 'pending',
        };

        await tx.jobs.update({
          where: { id: job_id },
          data: { 
            edited_answers: counterOffer,
            pending_approval: true,
          },
        });

        const messageText = this.formatCounterOfferMessage(counterOffer);

        const message = await tx.messages.create({
          data: {
            chat_id: chat.id,
            sender_type: responderRole as any,
            sender_id: userId,
            message_type: 'text',
            message: messageText,
          },
        });

        const createdAtCounter = message.created_at instanceof Date ? message.created_at.toISOString() : message.created_at;
        const messageData = {
          id: message.id,
          chatId: chat.id,
          sender_type: responderRole,
          sender_id: userId,
          sender_name: responderName,
          message: messageText,
          message_type: 'text' as const,
          created_at: createdAtCounter,
        };

        return { success: true, message: 'Counter offer sent!', action: 'countered', messageData };
      }
    });

    // Emit socket AFTER transaction commits successfully
    if (result.messageData) {
      // Only emit to personal rooms, not chat room to avoid duplicates
      if (this.chatGateway?.server) {
        this.chatGateway.server.to(`user:${customerUserId}`).emit('new_message', result.messageData);
        this.chatGateway.server.to(`user:${providerUserId}`).emit('new_message', result.messageData);
        console.log(`[SOCKET] Negotiation response emitted to user:${customerUserId} and user:${providerUserId}`);
      } else {
        console.error('[SOCKET] ChatGateway server not available - negotiation response not sent in real-time');
      }
    }

    return result;
  }

  /**
   * Get negotiation history for a job
   */
  async getNegotiationHistory(jobId: number, userId: number) {
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // Verify access
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
    });
    const provider = await this.prisma.service_providers.findUnique({
      where: { user_id: userId },
    });

    const userIsCustomer = customer && job.customer_id === customer.id;
    const userIsProvider = provider && job.provider_id === provider.id;

    if (!userIsCustomer && !userIsProvider) {
      throw new ForbiddenException('You do not have access to this job');
    }

    // Normalize dates to ISO strings so frontend never gets Invalid Date
    const toIso = (d: unknown): string | null => {
      if (d == null) return null;
      if (typeof d === 'string') return d || null;
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
      return null;
    };
    const rawOffer = job.edited_answers as Record<string, unknown> | null;
    const current_offer = rawOffer
      ? {
          ...rawOffer,
          original_date: toIso(rawOffer.original_date) ?? (rawOffer.original_date as string | null) ?? null,
          proposed_date: toIso(rawOffer.proposed_date) ?? (rawOffer.proposed_date as string | null) ?? null,
        }
      : null;

    return {
      job_id: jobId,
      current_status: job.pending_approval ? 'awaiting_response' : 'no_active_negotiation',
      current_offer,
      original_price: job.price.toNumber(),
      original_date: job.scheduled_at ? (job.scheduled_at instanceof Date ? job.scheduled_at.toISOString() : String(job.scheduled_at)) : null,
    };
  }

  /**
   * Format negotiation offer message
   */
  private formatNegotiationOfferMessage(offerData: any): string {
    const lines: string[] = [];
    lines.push(`💡 NEW OFFER from ${offerData.offered_by_name || (offerData.offered_by === 'customer' ? 'Customer' : 'Provider')}`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    const priceChange = offerData.proposed_price !== offerData.original_price
      ? `$${offerData.original_price} → $${offerData.proposed_price}`
      : `$${offerData.proposed_price}`;

    lines.push(`💰 Price: ${priceChange}`);

    if (offerData.original_date && offerData.proposed_date) {
      const oldDate = new Date(offerData.original_date).toLocaleDateString();
      const newDate = new Date(offerData.proposed_date).toLocaleDateString();
      lines.push(`📅 Date: ${oldDate} → ${newDate}`);
    } else if (offerData.proposed_date) {
      const newDate = new Date(offerData.proposed_date).toLocaleDateString();
      lines.push(`📅 Date: ${newDate}`);
    }

    if (offerData.notes) {
      lines.push('');
      lines.push(`📝 Notes: ${offerData.notes}`);
    }

    lines.push('');
    lines.push('⏳ Awaiting response...');

    return lines.join('\n');
  }

  /**
   * Format counter offer message
   */
  private formatCounterOfferMessage(counterOffer: any): string {
    const lines: string[] = [];
    lines.push(`↩️ COUNTER OFFER from ${counterOffer.offered_by_name || (counterOffer.offered_by === 'customer' ? 'Customer' : 'Provider')}`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    const priceChange = counterOffer.proposed_price !== counterOffer.original_price
      ? `$${counterOffer.original_price} → $${counterOffer.proposed_price}`
      : `$${counterOffer.proposed_price}`;

    lines.push(`💰 Price: ${priceChange}`);

    if (counterOffer.original_date && counterOffer.proposed_date) {
      const oldDate = new Date(counterOffer.original_date).toLocaleDateString();
      const newDate = new Date(counterOffer.proposed_date).toLocaleDateString();
      lines.push(`📅 Date: ${oldDate} → ${newDate}`);
    } else if (counterOffer.proposed_date) {
      const newDate = new Date(counterOffer.proposed_date).toLocaleDateString();
      lines.push(`📅 Date: ${newDate}`);
    }

    if (counterOffer.notes) {
      lines.push('');
      lines.push(`📝 Notes: ${counterOffer.notes}`);
    }

    lines.push('');
    lines.push('⏳ Awaiting response...');

    return lines.join('\n');
  }

  // Note: Sending messages is now handled via Socket.IO (chat.gateway.ts)
  // Use the 'send_message' Socket.IO event for real-time messaging
}