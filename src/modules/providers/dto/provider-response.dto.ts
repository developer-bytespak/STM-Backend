import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { ProviderStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  first_name: string;

  @ApiProperty()
  @Expose()
  last_name: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  phone_number: string;

  @ApiProperty()
  @Expose()
  role: string;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty()
  @Expose()
  updated_at: Date;

  @ApiPropertyOptional()
  @Expose()
  is_email_verified: boolean;

  @ApiPropertyOptional()
  @Expose()
  last_login: Date;

  @Exclude()
  password: string;

  @Exclude()
  refresh_token: string;
}

export class LSMResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  region: string;

  @ApiProperty()
  @Expose()
  area: string;

  @ApiProperty()
  @Expose()
  status: string;

  @ApiPropertyOptional()
  @Expose()
  closed_deals_count: number;

  @ApiPropertyOptional()
  @Expose()
  earnings: number;

  @ApiProperty()
  @Expose()
  created_at: Date;
}

export class PerformanceMetricsDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiPropertyOptional()
  @Expose()
  job_count: number;

  @ApiPropertyOptional()
  @Expose()
  avg_rating: number;

  @ApiPropertyOptional()
  @Expose()
  punctuality_score: number;

  @ApiPropertyOptional()
  @Expose()
  avg_response_time: number;

  @ApiProperty()
  @Expose()
  created_at: Date;
}

export class ProviderResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  experience: number;

  @ApiPropertyOptional()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  rating: number;

  @ApiProperty()
  @Expose()
  tier: string;

  @ApiProperty()
  @Expose()
  location: string;

  @ApiProperty()
  @Expose()
  is_active: boolean;

  @ApiProperty({ enum: ProviderStatus })
  @Expose()
  status: ProviderStatus;

  @ApiPropertyOptional()
  @Expose()
  earning: number;

  @ApiPropertyOptional()
  @Expose()
  total_jobs: number;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  @Expose()
  user: UserResponseDto;

  @ApiProperty({ type: LSMResponseDto })
  @Type(() => LSMResponseDto)
  @Expose()
  local_service_manager: LSMResponseDto;

  @ApiPropertyOptional({ type: [PerformanceMetricsDto] })
  @Type(() => PerformanceMetricsDto)
  @Expose()
  performance_metrics?: PerformanceMetricsDto[];

  @ApiPropertyOptional()
  @Expose()
  latest_performance?: PerformanceMetricsDto;

  @ApiPropertyOptional()
  @Expose()
  total_services_created?: number;

  @ApiPropertyOptional()
  @Expose()
  total_available_services?: number;
}
