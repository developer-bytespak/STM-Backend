import { IsDateString, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleMeetingDto {
  @ApiProperty({
    description: 'New meeting start time (ISO 8601)',
    example: '2024-01-20T15:00:00Z',
  })
  @IsDateString()
  scheduled_start: string;

  @ApiProperty({
    description: 'New meeting end time (ISO 8601)',
    example: '2024-01-20T15:30:00Z',
  })
  @IsDateString()
  scheduled_end: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling',
    example: 'Conflict with another meeting',
  })
  @IsOptional()
  @IsString()
  reschedule_reason?: string;
}
