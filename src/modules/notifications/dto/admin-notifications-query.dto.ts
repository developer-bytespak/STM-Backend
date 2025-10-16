import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationTypeFilter } from './get-notifications-query.dto';

export enum RecipientTypeFilter {
  CUSTOMER = 'customer',
  SERVICE_PROVIDER = 'service_provider',
  LOCAL_SERVICE_MANAGER = 'local_service_manager',
  ADMIN = 'admin',
}

export class AdminNotificationsQueryDto {
  @IsOptional()
  @IsEnum(RecipientTypeFilter)
  recipient_type?: RecipientTypeFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  recipient_id?: number;

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
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

