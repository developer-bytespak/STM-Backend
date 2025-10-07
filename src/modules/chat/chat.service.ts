import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

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
            user: { select: { id: true } },
          },
        },
        service_provider: {
          include: {
            user: { select: { id: true } },
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

    return {
      chatId: chat.id,
      messages: messages.map((msg) => ({
        id: msg.id,
        sender_type: msg.sender_type,
        sender_id: msg.sender_id,
        message: msg.message,
        message_type: msg.message_type,
        created_at: msg.created_at,
      })),
    };
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(
    userId: number,
    chatId: string,
    dto: SendMessageDto,
    userRole: string,
  ) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        customer: {
          include: {
            user: { select: { id: true } },
          },
        },
        service_provider: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (!chat.is_active) {
      throw new ForbiddenException('This chat is no longer active');
    }

    // Verify user has access
    const isCustomer = chat.customer.user.id === userId;
    const isProvider = chat.service_provider.user.id === userId;

    if (!isCustomer && !isProvider) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    // Determine sender type based on role
    let senderType: 'customer' | 'service_provider';
    if (userRole === 'customer') {
      senderType = 'customer';
    } else if (userRole === 'service_provider') {
      senderType = 'service_provider';
    } else {
      throw new ForbiddenException('Invalid user role for chat');
    }

    // Create message
    const message = await this.prisma.messages.create({
      data: {
        chat_id: chatId,
        sender_type: senderType,
        sender_id: userId,
        message: dto.message,
        message_type: dto.message_type || 'text',
      },
    });

    // Create notification for recipient
    const recipientId =
      senderType === 'customer'
        ? chat.service_provider.user.id
        : chat.customer.user.id;
    const recipientType =
      senderType === 'customer' ? 'service_provider' : 'customer';

    await this.prisma.notifications.create({
      data: {
        recipient_type: recipientType,
        recipient_id: recipientId,
        type: 'message',
        title: 'New Message',
        message: dto.message.substring(0, 100), // Preview
      },
    });

    return {
      id: message.id,
      sender_type: message.sender_type,
      message: message.message,
      message_type: message.message_type,
      created_at: message.created_at,
    };
  }
}