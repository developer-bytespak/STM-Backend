export class PushNotificationMetadata {
  deepLink?: string; // e.g., "/jobs/123"
  action?: string; // e.g., "view_job", "accept_job"
  priority?: 'high' | 'normal' | 'low';
}

export class NotificationResponseDto {
  id: string;
  recipient_type: string;
  recipient_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
  
  // For future push notification integration
  metadata?: PushNotificationMetadata;

  constructor(notification: any) {
    this.id = notification.id;
    this.recipient_type = notification.recipient_type;
    this.recipient_id = notification.recipient_id;
    this.type = notification.type;
    this.title = notification.title;
    this.message = notification.message;
    this.is_read = notification.is_read;
    this.created_at = notification.created_at;
    
    // Construct metadata for future push notifications
    this.metadata = this.buildMetadata(notification);
  }

  private buildMetadata(notification: any): PushNotificationMetadata {
    const metadata: PushNotificationMetadata = {
      priority: 'normal',
    };

    // Set priority based on notification type
    switch (notification.type) {
      case 'payment':
        metadata.priority = 'high';
        break;
      case 'job':
        metadata.priority = 'high';
        break;
      case 'message':
        metadata.priority = 'normal';
        break;
      case 'system':
        metadata.priority = 'low';
        break;
      case 'feedback':
        metadata.priority = 'low';
        break;
    }

    // You can extend this to parse job IDs, etc. from the message
    // For now, just structure it for future use
    return metadata;
  }
}

export class NotificationsListResponseDto {
  notifications: NotificationResponseDto[];
  total: number;
  limit: number;
  offset: number;
  unreadCount: number;

  constructor(
    notifications: any[],
    total: number,
    limit: number,
    offset: number,
    unreadCount: number,
  ) {
    this.notifications = notifications.map(n => new NotificationResponseDto(n));
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this.unreadCount = unreadCount;
  }
}

export class UnreadCountResponseDto {
  count: number;

  constructor(count: number) {
    this.count = count;
  }
}

