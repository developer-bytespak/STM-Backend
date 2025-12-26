import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

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
   */
  async createChatFromAI(
    userId: number,
    providerId: number,
    aiSessionId: string,
    summary: string,
  ) {
    // Verify customer exists
    const customer = await this.prisma.customers.findUnique({
      where: { user_id: userId },
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
    });

    if (existingChat) {
      // Return existing chat
      return {
        chatId: existingChat.id,
        message: 'Chat already exists',
      };
    }

    // Create chat with AI flow flag
    return await this.prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          customer_id: customer.id,
          provider_id: providerId,
          from_ai_flow: true,
          ai_session_id: aiSessionId,
          is_active: true,
        },
      });

      // Create system message with AI summary
      // Using sender_type='customer' but with a special message format to indicate it's from AI
      await tx.messages.create({
        data: {
          chat_id: chat.id,
          sender_type: 'customer', // System messages use customer type but with special content
          sender_id: userId,
          message_type: 'text',
          message: `[AI Summary] ${summary}`,
        },
      });

      return {
        chatId: chat.id,
        message: 'Chat created successfully with AI summary',
      };
    });
  }

  // Note: Sending messages is now handled via Socket.IO (chat.gateway.ts)
  // Use the 'send_message' Socket.IO event for real-time messaging
}