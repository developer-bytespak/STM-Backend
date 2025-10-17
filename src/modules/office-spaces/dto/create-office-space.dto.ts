import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsObject,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({ example: '123 Main St, Suite 500' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  address: string;

  @ApiProperty({ example: 'Miami' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'FL' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  state: string;

  @ApiProperty({ example: '33101' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;
}

class AvailabilityDayDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  start: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  end: string;

  @ApiProperty({ example: true })
  available: boolean;
}

export class CreateOfficeSpaceDto {
  @ApiProperty({ example: 'Executive Private Office' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Modern workspace in the heart of Miami' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 'private_office', default: 'private_office' })
  @IsString()
  @IsOptional()
  type?: string = 'private_office'; // Only private_office for MVP

  @ApiProperty({ type: LocationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: 10, minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;

  @ApiProperty({ example: 500, minimum: 10, maximum: 100000 })
  @IsInt()
  @Min(10)
  @Max(100000)
  area: number;

  @ApiProperty({ example: 350.0, minimum: 0.01, maximum: 10000 })
  @IsNumber()
  @Min(0.01)
  @Max(10000)
  dailyPrice: number;

  @ApiProperty({
    example: {
      monday: { start: '09:00', end: '18:00', available: true },
      tuesday: { start: '09:00', end: '18:00', available: true },
      wednesday: { start: '09:00', end: '18:00', available: true },
      thursday: { start: '09:00', end: '18:00', available: true },
      friday: { start: '09:00', end: '18:00', available: true },
      saturday: { start: '00:00', end: '00:00', available: false },
      sunday: { start: '00:00', end: '00:00', available: false },
    },
  })
  @IsObject()
  availability: {
    monday: AvailabilityDayDto;
    tuesday: AvailabilityDayDto;
    wednesday: AvailabilityDayDto;
    thursday: AvailabilityDayDto;
    friday: AvailabilityDayDto;
    saturday: AvailabilityDayDto;
    sunday: AvailabilityDayDto;
  };

  @ApiPropertyOptional({ example: [], type: [String] })
  @IsArray()
  @IsOptional()
  images?: string[] = [];
}

