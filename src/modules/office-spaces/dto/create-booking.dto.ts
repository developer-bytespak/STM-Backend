import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-of-office-space' })
  @IsString()
  @IsNotEmpty()
  officeSpaceId: string;

  @ApiProperty({ example: '2025-11-01T09:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2025-11-05T17:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: 'Need parking space' })
  @IsString()
  @IsOptional()
  specialRequests?: string;
}

