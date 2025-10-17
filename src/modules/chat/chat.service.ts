import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Verify user has access to this chat
    const isCustomer = chat.customer.user.id === userId;
    const isProvider = chat.service_provider.user.id === userId;

    if (!isCustomer && !isProvider) {
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

  // Note: Sending messages is now handled via Socket.IO (chat.gateway.ts)
  // Use the 'send_message' Socket.IO event for real-time messaging
}