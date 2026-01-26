import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: any) {
    this.logger.log(`Notification client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Notification client disconnected: ${client.id}`);
  }

  /**
   * Emit notification to a specific user
   */
  async emitNotificationToUser(
    userId: number,
    notification: any,
    totalUnreadCount?: number,
  ) {
    const userRoom = `user:${userId}`;
    
    const payload = {
      notification,
      ...(totalUnreadCount !== undefined && { totalUnreadCount }),
    };

    this.server.to(userRoom).emit('notification:created', payload);
    this.logger.log(`Notification emitted to user ${userId} in room ${userRoom}`);
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
