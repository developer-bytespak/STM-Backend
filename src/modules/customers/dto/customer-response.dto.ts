import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

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

export class CustomerRetentionMetricsDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  first_job_date: Date;

  @ApiPropertyOptional()
  @Expose()
  last_job_date: Date;

  @ApiProperty()
  @Expose()
  total_jobs: number;

  @ApiPropertyOptional()
  @Expose()
  total_spent: number;

  @ApiProperty()
  @Expose()
  retention_status: string;

  @ApiPropertyOptional()
  @Expose()
  days_since_last_job: number;

  @ApiProperty()
  @Expose()
  created_at: Date;
}

export class CustomerResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  address: string;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  @Expose()
  user: UserResponseDto;

  @ApiPropertyOptional({ type: [CustomerRetentionMetricsDto] })
  @Type(() => CustomerRetentionMetricsDto)
  @Expose()
  customer_retention_metrics?: CustomerRetentionMetricsDto[];

  @ApiPropertyOptional()
  @Expose()
  total_jobs?: number;

  @ApiPropertyOptional()
  @Expose()
  total_spent?: number;

  @ApiPropertyOptional()
  @Expose()
  average_rating?: number;
}
