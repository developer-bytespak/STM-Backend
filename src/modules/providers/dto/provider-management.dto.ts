import { IsOptional, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderStatus } from '@prisma/client';

export class ProviderManagementDto {
  @ApiPropertyOptional({ description: 'Provider status', enum: ProviderStatus })
  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;

  @ApiPropertyOptional({ description: 'Provider tier' })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({ description: 'Local Service Manager ID for assignment/reassignment' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lsm_id?: number;
}
