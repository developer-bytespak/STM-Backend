import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SearchFiltersDto {
  @ApiPropertyOptional({ description: 'Minimum provider rating (0-5)', example: 4.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Maximum price', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;
}

export class SearchProvidersDto {
  @ApiProperty({ description: 'Service name', example: 'House Cleaning' })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({ description: 'ZIP code', example: '75001' })
  @IsString()
  @IsNotEmpty()
  zipcode: string;

  @ApiPropertyOptional({ description: 'Optional filters', type: SearchFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;
}

