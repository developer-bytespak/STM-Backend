import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestNewServiceDto {
  @ApiProperty({
    description: 'Service keyword or name requested',
    example: 'Pool Cleaning',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  keyword: string;

  @ApiProperty({
    description: 'Optional description of the service needed',
    example: 'I need someone to clean my pool weekly',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Customer region/area',
    example: 'Brooklyn, NYC',
  })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({
    description: 'Customer zipcode',
    example: '10001',
  })
  @IsString()
  @IsNotEmpty()
  zipcode: string;
}

