import { IsString, IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer first name' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ description: 'Customer last name' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ description: 'Customer email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Customer address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Customer region' })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({ description: 'Customer password', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Profile picture', type: 'string', format: 'binary' })
  @IsOptional()
  profile_picture?: any;
}
