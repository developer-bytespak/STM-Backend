import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ApproveServiceRequestDto {
  @ApiPropertyOptional({
    description: 'Optional notes about the approval',
    example: 'Good service for our region',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
