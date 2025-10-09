import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerProfileDto {
  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Address',
    example: '123 Main St, Apt 4B',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Zipcode',
    example: '10001',
    required: false,
  })
  @IsString()
  @IsOptional()
  zipcode?: string;

  @ApiProperty({
    description: 'Region',
    example: 'NYC',
    required: false,
  })
  @IsString()
  @IsOptional()
  region?: string;
}

