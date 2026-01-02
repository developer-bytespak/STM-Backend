import { IsDateString, IsInt, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleMeetingDto {
  @ApiProperty({ description: 'Provider ID', example: 1 })
  @IsInt()
  provider_id: number;

  @ApiProperty({
    description: 'Meeting scheduled start time (ISO 8601)',
    example: '2024-01-15T14:00:00Z',
  })
  @IsDateString()
  scheduled_start: string;

  @ApiProperty({
    description: 'Meeting scheduled end time (ISO 8601)',
    example: '2024-01-15T14:30:00Z',
  })
  @IsDateString()
  scheduled_end: string;

  @ApiPropertyOptional({
    description: 'Meeting title',
    example: 'Provider Onboarding Meeting',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Meeting description',
    example: 'Discussing provider onboarding and requirements',
  })
  @IsOptional()
  @IsString()
  meeting_description?: string;

  @ApiPropertyOptional({
    description: 'Timezone (default: UTC)',
    example: 'America/Chicago',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
