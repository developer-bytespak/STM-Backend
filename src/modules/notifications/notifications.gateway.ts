import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';

/**
 * NotificationsGateway - Handles real-time notifications via Socket.IO
 * 
 * This service uses the ChatGateway's socket server to emit notifications
 * because users are already authenticated and connected to the /chat namespace.
 */
@Injectable()
export class NotificationsGateway implements OnModuleInit {
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly chatGateway: ChatGateway) {}

  onModuleInit() {
    this.logger.log('✅ NotificationsGateway initialized - using ChatGateway for socket emissions');
  }

  /**
   * Emit notification to a specific user
   */
  async emitNotificationToUser(
    userId: number,
    notification: any,
    totalUnreadCount?: number,
  ) {
    if (!this.chatGateway || !this.chatGateway.server) {
      this.logger.error('ChatGateway not initialized - cannot emit notification');
      return;
    }

    const userRoom = `user:${userId}`;
    
    const payload = {
      notification,
      ...(totalUnreadCount !== undefined && { totalUnreadCount }),
    };

    this.chatGateway.server.to(userRoom).emit('notification:created', payload);
    this.logger.log(`✅ Notification emitted to user ${userId} in room ${userRoom}`);
  }

  /**
   * Emit notification to multiple users
   */
  async emitNotificationToUsers(
    userIds: number[],
    notification: any,
  ) {
    for (const userId of userIds) {
      await this.emitNotificationToUser(userId, notification);
    }
  }
}
