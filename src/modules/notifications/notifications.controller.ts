import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../oauth/guards/jwt-auth.guard';
import { RolesGuard } from '../oauth/guards/roles.guard';
import { Roles, CurrentUser } from '../oauth/decorators';
import { UserRole } from '../users/enums/user-role.enum';
import {
  GetNotificationsQueryDto,
  AdminNotificationsQueryDto,
  CombinedNotificationsQueryDto,
  NotificationResponseDto,
  NotificationsListResponseDto,
  UnreadCountResponseDto,
} from './dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Smart endpoint for all users:
   * - Regular users: Get their own notifications
   * - Admins without filters: Get their own notifications
   * - Admins with recipient_type/recipient_id: Get platform-wide filtered notifications
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
    @Query() query: CombinedNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    return this.notificationsService.getCombinedNotifications(
      userId,
      userRole,
      query,
    );
  }

  /**
   * GET /notifications/unread-count
   * Get count of unread notifications
   */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationsService.getUnreadCount(userId, userRole);
  }

  /**
   * PATCH /notifications/mark-all-read
   * Mark all notifications as read for current user
   */
  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(userId, userRole);
  }

  /**
   * DELETE /notifications/clear-read
   * Clear all read notifications for current user
   */
  @Delete('clear-read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async clearReadNotifications(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ): Promise<{ count: number }> {
    return this.notificationsService.clearReadNotifications(userId, userRole);
  }


  /**
   * GET /notifications/:id
   * Get single notification by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getNotificationById(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.getNotificationById(id, userId, userRole);
  }

  /**
   * PATCH /notifications/:id/read
   * Mark notification as read
   */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, userId, userRole);
  }

  /**
   * DELETE /notifications/:id
   * Delete a notification (permanent delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: string,
  ): Promise<{ message: string }> {
    return this.notificationsService.deleteNotification(id, userId, userRole);
  }
}
