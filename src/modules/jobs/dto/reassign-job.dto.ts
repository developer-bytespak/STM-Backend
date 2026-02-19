import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReassignJobDto {
  @ApiProperty({
    description: 'New Service Provider ID',
    example: 43,
  })
  @IsNumber()
  @Type(() => Number)
  newProviderId: number;

  @ApiPropertyOptional({
    description: 'Optional updated customer budget for the job',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerBudget?: number;

  @ApiPropertyOptional({
    description: 'Optional updated preferred service date (ISO string)',
    example: '2025-03-15',
  })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;
}
