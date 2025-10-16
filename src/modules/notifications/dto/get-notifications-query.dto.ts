import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationTypeFilter {
  JOB = 'job',
  PAYMENT = 'payment',
  MESSAGE = 'message',
  SYSTEM = 'system',
  FEEDBACK = 'feedback',
}

export class GetNotificationsQueryDto {
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

