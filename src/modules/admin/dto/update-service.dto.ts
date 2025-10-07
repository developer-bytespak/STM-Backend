import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdateServiceDto {
  @ApiPropertyOptional({
    description: 'Service name',
    example: 'Toilet Clog',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Professional toilet clog removal service',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Service category',
    example: 'Plumber',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Dynamic form questions JSON',
  })
  @IsObject()
  @IsOptional()
  questions_json?: any;

  @ApiPropertyOptional({
    description: 'Is this a popular service',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_popular?: boolean;
}
