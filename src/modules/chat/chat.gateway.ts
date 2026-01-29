import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
        'https://stm-frontend.vercel.app',
      ].filter(Boolean);
      
      // Check exact match
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In development, allow any localhost port
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }
      
      // Allow Vercel preview deployments
      if (origin.match(/https:\/\/.*\.vercel\.app$/)) {
        return callback(null, true);
      }
      
      // Reject all others
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Handle new socket connection
   * Authenticates user via JWT token
   */
  async handleConnection(client: Socket) {
    try {
      // Extract JWT from handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!payload || !payload.sub) {
        this.logger.warn('Connection rejected: Invalid token');
        client.disconnect();
        return;
      }

      // Store user info in socket data
      client.data.userId = payload.sub;
      client.data.userRole = payload.role;

      // Join user to their personal room for direct messaging
      client.join(`user:${payload.sub}`);

      this.logger.log(
        `User ${payload.sub} (${payload.role}) connected - Socket ID: ${client.id}`,
      );
      this.logger.log(`User ${payload.sub} joined personal room: user:${payload.sub}`);

      // Notify client of successful connection
      client.emit('connected', {
        message: 'Successfully connected to chat server',
        userId: payload.sub,
      });
    } catch (error) {
      this.logger.error('Auth failed:', error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(
      `User ${client.data.userId} disconnected - Socket ID: ${client.id}`,
    );
  }

  /**
   * Join a chat room
   * Verifies user has access before allowing them to join
   */
  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { chatId } = data;
      const userId = client.data.userId;

      if (!chatId) {
        client.emit('error', { message: 'Chat ID is required' });
        return;
      }

      this.logger.log(`User ${userId} attempting to join chat ${chatId}`);

      // Verify user has access to this chat - use realtimeClient for speed
      const chat = await this.prisma.realtimeClient.chat.findUnique({
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
          local_service_manager: {
            include: {
              user: { select: { id: true } },
            },
          },
        },
      });

      if (!chat) {
        client.emit('error', { message: 'Chat not found' });
        return;
      }

      // Check if user is part of this chat
      const hasAccess =
        chat.customer.user.id === userId ||
        chat.service_provider.user.id === userId ||
        (chat.local_service_manager &&
          chat.local_service_manager.user.id === userId);

      if (!hasAccess) {
        this.logger.warn(
          `User ${userId} denied access to chat ${chatId} - Not authorized`,
        );
        client.emit('error', { message: 'Access denied to this chat' });
        return;
      }

      // Join the room
      client.join(chatId);
      this.logger.log(`User ${userId} successfully joined chat ${chatId}`);

      // Notify client they've joined
      client.emit('joined_chat', {
        chatId,
        message: 'Successfully joined chat',
      });

      // Notify others in the room (optional)
      client.to(chatId).emit('user_joined', {
        userId,
        chatId,
      });
    } catch (error) {
      this.logger.error('Error in join_chat:', error.message);
      client.emit('error', { message: 'Failed to join chat' });
    }
  }

  /**
   * Leave a chat room
   */
  @SubscribeMessage('leave_chat')
  async handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { chatId } = data;
      const userId = client.data.userId;

      client.leave(chatId);
      this.logger.log(`User ${userId} left chat ${chatId}`);

      // Notify client
      client.emit('left_chat', { chatId });

      // Notify others in the room (optional)
      client.to(chatId).emit('user_left', {
        userId,
        chatId,
      });
    } catch (error) {
      this.logger.error('Error in leave_chat:', error.message);
      client.emit('error', { message: 'Failed to leave chat' });
    }
  }

  /**
   * Send a message in a chat
   * Saves to database and broadcasts to all users in the room
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    data: {
      chatId: string;
      message: string;
      message_type?: 'text' | 'image' | 'document';
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;
      const userRole = client.data.userRole;
      const { chatId, message, message_type = 'text' } = data;

      if (!chatId || !message) {
        client.emit('error', {
          message: 'Chat ID and message are required',
        });
        return;
      }

      this.logger.log(`User ${userId} sending message to chat ${chatId}`);

      // Verify access and get chat info - use realtimeClient for speed
      const chat = await this.prisma.realtimeClient.chat.findUnique({
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
        client.emit('error', { message: 'Chat not found' });
        return;
      }

      if (!chat.is_active) {
        client.emit('error', { message: 'This chat is no longer active' });
        return;
      }

      // Verify user has access
      const isCustomer = chat.customer.user.id === userId;
      const isProvider = chat.service_provider.user.id === userId;
      const isLSM =
        chat.local_service_manager &&
        chat.local_service_manager.user.id === userId;

      if (!isCustomer && !isProvider && !isLSM) {
        client.emit('error', { message: 'Access denied' });
        return;
      }

      // Determine sender type based on role
      let senderType: 'customer' | 'service_provider' | 'local_service_manager';
      if (userRole === 'customer') {
        senderType = 'customer';
      } else if (userRole === 'service_provider') {
        senderType = 'service_provider';
      } else if (userRole === 'local_service_manager') {
        senderType = 'local_service_manager';
      } else {
        client.emit('error', { message: 'Invalid user role for chat' });
        return;
      }

      // Save message to database - use realtimeClient for speed
      const newMessage = await this.prisma.realtimeClient.messages.create({
        data: {
          chat_id: chatId,
          sender_type: senderType,
          sender_id: userId,
          message: message,
          message_type: message_type,
        },
      });

      // Get sender name for the broadcast
      let senderName = 'Unknown User';
      if (senderType === 'customer') {
        senderName = `${chat.customer.user.first_name} ${chat.customer.user.last_name}`;
      } else if (senderType === 'service_provider') {
        senderName = `${chat.service_provider.user.first_name} ${chat.service_provider.user.last_name}`;
      } else if (senderType === 'local_service_manager' && chat.local_service_manager) {
        senderName = `${chat.local_service_manager.user.first_name} ${chat.local_service_manager.user.last_name}`;
      }

      // Prepare broadcast data
      const messageData = {
        id: newMessage.id,
        chatId: chatId,
        sender_type: newMessage.sender_type,
        sender_id: newMessage.sender_id,
        sender_name: senderName,
        message: newMessage.message,
        message_type: newMessage.message_type,
        created_at: newMessage.created_at,
      };

      // Broadcast to everyone in the room EXCEPT the sender
      // (sender already has the message from optimistic update)
      client.to(chatId).emit('new_message', messageData);

      // Also emit to recipient personal rooms to ensure delivery even if they haven't joined chat
      // const recipientUserIds: number[] = [];
      // if (senderType === 'customer') {
      //   recipientUserIds.push(chat.service_provider.user.id);
      //   if (chat.local_service_manager) {
      //     recipientUserIds.push(chat.local_service_manager.user.id);
      //   }
      // } else if (senderType === 'service_provider') {
      //   recipientUserIds.push(chat.customer.user.id);
      //   if (chat.local_service_manager) {
      //     recipientUserIds.push(chat.local_service_manager.user.id);
      //   }
      // } else if (senderType === 'local_service_manager') {
      //   recipientUserIds.push(chat.customer.user.id);
      //   recipientUserIds.push(chat.service_provider.user.id);
      // }

      // // Emit to each recipient's personal room
      // for (const recipientUserId of recipientUserIds) {
      //   this.server.to(`user:${recipientUserId}`).emit('new_message', messageData);
      // }

      // this.logger.log(
      //   `Message ${newMessage.id} broadcasted to chat ${chatId} and ${recipientUserIds.length} personal rooms`,
      // );

      // Create notification for offline recipients
      // Determine recipients based on sender
      const recipientIds: { id: number; type: string }[] = [];

      if (senderType === 'customer') {
        recipientIds.push({
          id: chat.service_provider.user.id,
          type: 'service_provider',
        });
        if (chat.local_service_manager) {
          recipientIds.push({
            id: chat.local_service_manager.user.id,
            type: 'local_service_manager',
          });
        }
      } else if (senderType === 'service_provider') {
        recipientIds.push({ id: chat.customer.user.id, type: 'customer' });
        if (chat.local_service_manager) {
          recipientIds.push({
            id: chat.local_service_manager.user.id,
            type: 'local_service_manager',
          });
        }
      } else if (senderType === 'local_service_manager') {
        recipientIds.push({ id: chat.customer.user.id, type: 'customer' });
        recipientIds.push({
          id: chat.service_provider.user.id,
          type: 'service_provider',
        });
      }

      // Create notifications for all recipients
      for (const recipient of recipientIds) {
        // Encode chat_id in title for frontend to parse
        const notification = await this.prisma.realtimeClient.notifications.create({
          data: {
            recipient_type: recipient.type as any,
            recipient_id: recipient.id,
            type: 'message',
            title: `New Message [chat:${chatId}]`,
            message: message.substring(0, 100),
          },
        });

        // Emit real-time notification via socket
        this.server.to(`user:${recipient.id}`).emit('notification:created', {
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
        this.logger.log(`Notification emitted to user ${recipient.id}`);
      }
    } catch (error) {
      this.logger.error('Error in send_message:', error.message);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Typing indicator
   * Broadcasts typing status to other users in the chat
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { chatId, isTyping } = data;
      const userId = client.data.userId;

      if (!chatId) {
        return;
      }

      // Broadcast to others in room (not to self)
      client.to(chatId).emit('user_typing', {
        userId,
        isTyping,
        chatId,
      });
    } catch (error) {
      this.logger.error('Error in typing:', error.message);
    }
  }

  /**
   * Mark messages as read
   * Optional: Track read receipts
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { chatId } = data;
      const userId = client.data.userId;

      this.logger.log(`User ${userId} marked messages as read in chat ${chatId}`);

      // Broadcast to others in room
      client.to(chatId).emit('messages_read', {
        userId,
        chatId,
      });
    } catch (error) {
      this.logger.error('Error in mark_read:', error.message);
    }
  }

  /**
   * Handle sending negotiation offer via Socket.IO
   */
  @SubscribeMessage('send_negotiation_offer')
  async handleSendNegotiationOffer(
    @MessageBody()
    data: {
      jobId: number;
      proposed_price?: number;
      proposed_date?: string;
      notes?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;

      if (!data.jobId) {
        client.emit('error', {
          message: 'Job ID is required',
        });
        return;
      }

      this.logger.log(`User ${userId} sending negotiation offer for job ${data.jobId}`);

      // Get chat to broadcast
      const chat = await this.prisma.chat.findFirst({
        where: { job_id: data.jobId },
      });

      if (!chat) {
        client.emit('error', { message: 'Chat not found' });
        return;
      }

      // Broadcast to chat room
      this.server.to(chat.id).emit('negotiation_offer_sent', {
        job_id: data.jobId,
        proposed_price: data.proposed_price,
        proposed_date: data.proposed_date,
        notes: data.notes,
        timestamp: new Date(),
        sender_id: userId,
      });

      this.logger.log(`Negotiation offer broadcast for job ${data.jobId}`);
    } catch (error) {
      this.logger.error('Error sending negotiation offer:', error);
      client.emit('error', { message: 'Failed to send offer' });
    }
  }

  /**
   * Handle responding to negotiation offer via Socket.IO
   */
  @SubscribeMessage('respond_to_negotiation')
  async handleRespondToNegotiation(
    @MessageBody()
    data: {
      jobId: number;
      action: 'accept' | 'decline' | 'counter';
      counter_proposed_price?: number;
      counter_proposed_date?: string;
      counter_notes?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;

      if (!data.jobId || !data.action) {
        client.emit('error', {
          message: 'Job ID and action are required',
        });
        return;
      }

      this.logger.log(`User ${userId} responding to negotiation: ${data.action} for job ${data.jobId}`);

      // Get chat to broadcast
      const chat = await this.prisma.chat.findFirst({
        where: { job_id: data.jobId },
      });

      if (!chat) {
        client.emit('error', { message: 'Chat not found' });
        return;
      }

      // Broadcast to chat room
      this.server.to(chat.id).emit('negotiation_response', {
        job_id: data.jobId,
        action: data.action,
        counter_proposed_price: data.counter_proposed_price,
        counter_proposed_date: data.counter_proposed_date,
        counter_notes: data.counter_notes,
        timestamp: new Date(),
        sender_id: userId,
      });

      this.logger.log(`Negotiation response (${data.action}) broadcast for job ${data.jobId}`);
    } catch (error) {
      this.logger.error('Error responding to negotiation:', error);
      client.emit('error', { message: 'Failed to respond' });
    }
  }
}

