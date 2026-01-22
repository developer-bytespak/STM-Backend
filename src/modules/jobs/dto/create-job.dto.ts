import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobDto {
  @ApiProperty({
    description: 'Service ID',
    example: 5,
  })
  @IsNumber()
  @Type(() => Number)
  serviceId: number;

  @ApiProperty({
    description: 'Service Provider ID',
    example: 42,
  })
  @IsNumber()
  @Type(() => Number)
  providerId: number;

  @ApiPropertyOptional({
    description: 'Answers to service-specific questions',
    example: { urgency: 'Emergency', toilet_type: 'Standard' },
  })
  @IsObject()
  @IsOptional()
  answers?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Service location',
    example: '123 Main St, New York, NY',
  })
  @IsString()
  @IsOptional()
  location?: string;

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
  @Type(() => Number)
  inPersonVisitCost?: number;

  @ApiPropertyOptional({
    description: 'Customer budget/price for the service',
    example: 150.00,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  customerBudget?: number;

  @ApiPropertyOptional({
    description: 'Flag to indicate job created from AI flow',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  fromAI?: boolean;

  @ApiPropertyOptional({
    description: 'Array of image URLs from Vercel Blob (customer uploaded)',
    example: ['https://blob.vercelusercontent.com/image1.jpg'],
  })
  @IsOptional()
  images?: string[];
}
