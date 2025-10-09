import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'Response deadline in minutes for service providers',
    example: 60,
    minimum: 15,
    maximum: 1440, // 24 hours max
  })
  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(1440)
  responseDeadlineMinutes?: number;

  @ApiPropertyOptional({
    description: 'Warning threshold before LSM review',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  warningThreshold?: number;

  @ApiPropertyOptional({
    description: 'Popularity threshold (number of jobs to mark service as popular)',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  popularityThreshold?: number;

  @ApiPropertyOptional({
    description: 'Cancellation fee percentage (0-100)',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  cancellationFeePercentage?: number;

  @ApiPropertyOptional({
    description: 'Default in-person visit cost in USD',
    example: 50.00,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  defaultInPersonVisitCost?: number;
}

