import { IsOptional, IsString, IsEmail, IsInt, Min, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ProviderTier, ProviderStatus } from '@prisma/client';

export class ProviderFiltersDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or location' })
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

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by provider tier', enum: ProviderTier })
  @IsOptional()
  @IsEnum(ProviderTier)
  tier?: ProviderTier;

  @ApiPropertyOptional({ description: 'Filter by provider status', enum: ProviderStatus })
  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Filter by Local Service Manager ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lsm_id?: number;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_email_verified?: boolean;

  @ApiPropertyOptional({ description: 'Filter by minimum rating' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_rating?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum rating' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_rating?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum experience' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_experience?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum experience' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_experience?: number;

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

  @ApiPropertyOptional({ description: 'Filter by minimum earnings' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_earnings?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum earnings' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_earnings?: number;

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

  @ApiPropertyOptional({ description: 'Sort field', enum: ['created_at', 'first_name', 'last_name', 'email', 'rating', 'experience', 'total_jobs', 'earnings'] })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'desc';
}
