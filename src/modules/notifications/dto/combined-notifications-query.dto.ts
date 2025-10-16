import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RecipientTypeFilter } from './admin-notifications-query.dto';
import { NotificationTypeFilter } from './get-notifications-query.dto';

/**
 * Combined DTO for both user and admin notification queries
 * - Regular users: Only type, is_read, limit, offset work (other fields ignored)
 * - Admins: All fields work to filter across platform
 */
export class CombinedNotificationsQueryDto {
  // Admin-specific filters (ignored for non-admins)
  @IsOptional()
  @IsEnum(RecipientTypeFilter)
  recipient_type?: RecipientTypeFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  recipient_id?: number;

  // Common filters (work for all users)
  @IsOptional()
  @IsEnum(NotificationTypeFilter)
  type?: NotificationTypeFilter;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

