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

    // Helper function to get sender name
    const getSenderName = (senderId: number, senderType: string): string => {
      if (senderType === 'customer' && chat.customer.user.id === senderId) {
        return `${chat.customer.user.first_name} ${chat.customer.user.last_name}`;
      } else if (senderType === 'service_provider' && chat.service_provider.user.id === senderId) {
        return `${chat.service_provider.user.first_name} ${chat.service_provider.user.last_name}`;
      } else if (senderType === 'local_service_manager' && chat.local_service_manager && chat.local_service_manager.user.id === senderId) {
        return `${chat.local_service_manager.user.first_name} ${chat.local_service_manager.user.last_name}`;
      }
      return 'Unknown User';
    };

    return {
      chatId: chat.id,
      messages: messages.map((msg) => ({
        id: msg.id,
        sender_type: msg.sender_type,
        sender_id: msg.sender_id,
        sender_name: getSenderName(msg.sender_id, msg.sender_type),
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
        
        // If it's an unpaid job error, throw it to prevent chat creation
        if (error.status === 400 && error.message?.includes('unpaid job')) {
          console.log('[AI Chat] 🚫 BLOCKING: Unpaid job detected - preventing chat creation');
          throw error; // Re-throw to controller to show payment dialog
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

      await tx.notifications.create({
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

  // Note: Sending messages is now handled via Socket.IO (chat.gateway.ts)
  // Use the 'send_message' Socket.IO event for real-time messaging
}