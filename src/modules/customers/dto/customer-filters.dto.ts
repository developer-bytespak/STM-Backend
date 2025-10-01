import { IsOptional, IsString, IsEmail, IsInt, Min, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { RetentionStatus } from '@prisma/client';

export class CustomerFiltersDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Filter by phone number' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Filter by retention status' })
  @IsOptional()
  @IsEnum(RetentionStatus)
  retention_status?: RetentionStatus;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  is_email_verified?: boolean;

  @ApiPropertyOptional({ description: 'Filter by minimum total jobs' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_total_jobs?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum total jobs' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_total_jobs?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum total spent' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_total_spent?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum total spent' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_total_spent?: number;

  @ApiPropertyOptional({ description: 'Filter by created date from' })
  @IsOptional()
  @IsDateString()
  created_from?: string;

  @ApiPropertyOptional({ description: 'Filter by created date to' })
  @IsOptional()
  @IsDateString()
  created_to?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['created_at', 'first_name', 'last_name', 'email', 'total_jobs', 'total_spent'] })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'desc';
}
