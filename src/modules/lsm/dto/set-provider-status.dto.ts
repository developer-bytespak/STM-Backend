import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetProviderStatusDto {
  @ApiProperty({
    description: 'New provider status',
    enum: ['active', 'inactive'],
    example: 'inactive',
  })
  @IsEnum(['active', 'inactive'])
  status: 'active' | 'inactive';

  @ApiProperty({
    description: 'Reason for status change',
    example: 'Multiple customer complaints',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({
    description: 'Force deactivation even with active jobs (emergency only)',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  forceDeactivate?: boolean;
}

