import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SenderType } from '@prisma/client';
import {
  NotificationResponseDto,
  NotificationsListResponseDto,
  UnreadCountResponseDto,
  GetNotificationsQueryDto,
  AdminNotificationsQueryDto,
  CombinedNotificationsQueryDto,
} from './dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Map user role to recipient_type (SenderType enum in Prisma)
   */
  private mapRoleToRecipientType(role: string): SenderType {
    const roleMap: Record<string, SenderType> = {
      customer: SenderType.customer,
      service_provider: SenderType.service_provider,
      local_service_manager: SenderType.local_service_manager,
      admin: SenderType.admin,
    };

    return roleMap[role] || (role as SenderType);
  }

  /**
   * Get notifications - Smart endpoint that works for all users
   * - Regular users: See only their own notifications
   * - Admins: Can see their own OR filter all platform notifications
   */
  async getCombinedNotifications(
    userId: number,
    userRole: string,
    query: CombinedNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const isAdmin = userRole === 'admin';
    const {
      recipient_type,
      recipient_id,
      type,
      is_read,
      limit = 20,
      offset = 0,
    } = query;

    // Build where clause
    const where: any = {};

    // Determine if admin is filtering platform-wide or viewing their own
    const isAdminFilteringPlatform =
      isAdmin && (recipient_type !== undefined || recipient_id !== undefined);

    if (isAdminFilteringPlatform) {
      // Admin is using admin filters - show platform-wide results
      if (recipient_type) {
        where.recipient_type = recipient_type;
      }
      if (recipient_id) {
        where.recipient_id = recipient_id;
      }
    } else {
      // Regular user OR admin viewing their own notifications
      const recipientType = this.mapRoleToRecipientType(userRole);
      where.recipient_type = recipientType;
      where.recipient_id = userId;
    }

    // Common filters
    if (type) {
      where.type = type;
    }

    if (is_read !== undefined) {
      where.is_read = is_read;
    }

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' }, // Newest first
        take: limit,
        skip: offset,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    // Calculate unread count based on context
    let unreadCount: number;
    if (isAdminFilteringPlatform) {
      // For admin platform view, count unread in current filter
      unreadCount = await this.prisma.notifications.count({
        where: { ...where, is_read: false },
      });
    } else {
      // For personal view, count user's unread
      const recipientType = this.mapRoleToRecipientType(userRole);
      unreadCount = await this.prisma.notifications.count({
        where: {
          recipient_type: recipientType,
          recipient_id: userId,
          is_read: false,
        },
      });
    }

    return new NotificationsListResponseDto(
      notifications,
      total,
      limit,
      offset,
      unreadCount,
    );
  }

  /**
   * Get notifications for the current user (legacy method - kept for backward compatibility)
   */
  async getMyNotifications(
    userId: number,
    userRole: string,
    query: GetNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const recipientType = this.mapRoleToRecipientType(userRole);
    const { type, is_read, limit = 20, offset = 0 } = query;

    // Build where clause
    const where: any = {
      recipient_type: recipientType,
      recipient_id: userId,
    };

    if (type) {
      where.type = type;
    }

    if (is_read !== undefined) {
      where.is_read = is_read;
    }

    // Get notifications with pagination
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' }, // Newest first
        take: limit,
        skip: offset,
      }),
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({
        where: {
          recipient_type: recipientType,
          recipient_id: userId,
          is_read: false,
        },
      }),
    ]);

    return new NotificationsListResponseDto(
      notifications,
      total,
      limit,
      offset,
      unreadCount,
    );
  }

  /**
   * Get single notification by ID
   */
  async getNotificationById(
    notificationId: string,
    userId: number,
    userRole: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notifications.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Verify ownership (users can only access their own notifications)
    const recipientType = this.mapRoleToRecipientType(userRole);
    if (
      notification.recipient_type !== recipientType ||
      notification.recipient_id !== userId
    ) {
      throw new ForbiddenException('Access denied to this notification');
    }

    return new NotificationResponseDto(notification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: number,
    userRole: string,
  ): Promise<NotificationResponseDto> {
    // First verify ownership
    await this.getNotificationById(notificationId, userId, userRole);

    const updated = await this.prisma.notifications.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return new NotificationResponseDto(updated);
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: number, userRole: string): Promise<{ count: number }> {
    const recipientType = this.mapRoleToRecipientType(userRole);

    const result = await this.prisma.notifications.updateMany({
      where: {
        recipient_type: recipientType,
        recipient_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    return { count: result.count };
  }

  /**
   * Delete a notification (permanent delete)
   */
  async deleteNotification(
    notificationId: string,
    userId: number,
    userRole: string,
  ): Promise<{ message: string }> {
    // First verify ownership
    await this.getNotificationById(notificationId, userId, userRole);

    await this.prisma.notifications.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Clear all read notifications for current user
   */
  async clearReadNotifications(
    userId: number,
    userRole: string,
  ): Promise<{ count: number }> {
    const recipientType = this.mapRoleToRecipientType(userRole);

    const result = await this.prisma.notifications.deleteMany({
      where: {
        recipient_type: recipientType,
        recipient_id: userId,
        is_read: true,
      },
    });

    return { count: result.count };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(
    userId: number,
    userRole: string,
  ): Promise<UnreadCountResponseDto> {
    const recipientType = this.mapRoleToRecipientType(userRole);

    const count = await this.prisma.notifications.count({
      where: {
        recipient_type: recipientType,
        recipient_id: userId,
        is_read: false,
      },
    });

    return new UnreadCountResponseDto(count);
  }

  /**
   * ADMIN: Get all notifications across the platform
   */
  async adminGetAllNotifications(
    query: AdminNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const {
      recipient_type,
      recipient_id,
      type,
      is_read,
      limit = 50,
      offset = 0,
    } = query;

    // Build where clause
    const where: any = {};

    if (recipient_type) {
      where.recipient_type = recipient_type;
    }

    if (recipient_id) {
      where.recipient_id = recipient_id;
    }

    if (type) {
      where.type = type;
    }

    if (is_read !== undefined) {
      where.is_read = is_read;
    }

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' }, // Newest first
        take: limit,
        skip: offset,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    // Total unread count for admin view
    const unreadCount = await this.prisma.notifications.count({
      where: { ...where, is_read: false },
    });

    return new NotificationsListResponseDto(
      notifications,
      total,
      limit,
      offset,
      unreadCount,
    );
  }

  /**
   * ADMIN: Get all notifications for a specific user
   */
  async adminGetUserNotifications(
    targetUserId: number,
    query: AdminNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    // First verify the user exists
    const user = await this.prisma.users.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const recipientType = this.mapRoleToRecipientType(user.role);
    const { type, is_read, limit = 50, offset = 0 } = query;

    // Build where clause
    const where: any = {
      recipient_type: recipientType,
      recipient_id: targetUserId,
    };

    if (type) {
      where.type = type;
    }

    if (is_read !== undefined) {
      where.is_read = is_read;
    }

    // Get notifications with pagination
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' }, // Newest first
        take: limit,
        skip: offset,
      }),
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({
        where: { ...where, is_read: false },
      }),
    ]);

    return new NotificationsListResponseDto(
      notifications,
      total,
      limit,
      offset,
      unreadCount,
    );
  }
}
