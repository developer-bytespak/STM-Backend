import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
  import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Business name',
    example: "John's Plumbing Services",
    required: false,
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({
    description: 'Business description',
    example: 'Professional plumbing services with 10 years experience',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Business location/city',
    example: 'New York City',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Minimum service price',
    example: 100.00,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum service price',
    example: 500.00,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @ApiProperty({
    description: 'Years of experience',
    example: 10,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  experience?: number;

  @ApiProperty({
    description: 'Complete list of service area zipcodes (replaces existing)',
    example: ['10001', '10002', '10003'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serviceAreas?: string[];
}

