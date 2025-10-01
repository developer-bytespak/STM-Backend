import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Minimum price for this service' })
  @IsOptional()
  @IsInt()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum price for this service' })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ description: 'Service documents (certificates, examples)', type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  documents?: any[];
}
