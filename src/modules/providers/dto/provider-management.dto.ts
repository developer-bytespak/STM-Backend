import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderTier, ProviderStatus } from '@prisma/client';

export class ProviderManagementDto {
  @ApiPropertyOptional({ description: 'Provider status', enum: ProviderStatus })
  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;

  @ApiPropertyOptional({ description: 'Provider tier', enum: ProviderTier })
  @IsOptional()
  @IsEnum(ProviderTier)
  tier?: ProviderTier;

  @ApiPropertyOptional({ description: 'Local Service Manager ID for assignment/reassignment' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lsm_id?: number;
}
