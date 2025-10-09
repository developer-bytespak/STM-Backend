import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({
    description: 'Service ID',
    example: 5,
  })
  @IsNumber()
  serviceId: number;

  @ApiProperty({
    description: 'Service Provider ID',
    example: 42,
  })
  @IsNumber()
  providerId: number;

  @ApiProperty({
    description: 'Answers to service-specific questions',
    example: { urgency: 'Emergency', toilet_type: 'Standard' },
  })
  @IsObject()
  answers: Record<string, any>;

  @ApiProperty({
    description: 'Service location',
    example: '123 Main St, New York, NY',
  })
  @IsString()
  location: string;

  @ApiProperty({
    description: 'Service zipcode',
    example: '10001',
  })
  @IsString()
  zipcode: string;

  @ApiPropertyOptional({
    description: 'Preferred service date',
    example: '2025-10-10',
  })
  @IsDateString()
  @IsOptional()
  preferredDate?: string;

  @ApiPropertyOptional({
    description: 'Request in-person visit (additional cost applies)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresInPersonVisit?: boolean;

  @ApiPropertyOptional({
    description: 'Additional cost for in-person visit (if requested)',
    example: 50.00,
  })
  @IsNumber()
  @IsOptional()
  inPersonVisitCost?: number;
}
