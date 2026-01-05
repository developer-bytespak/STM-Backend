import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateLsmDto {
  @ApiProperty({
    description: 'Email address',
    example: 'lsm@newyork.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecurePass123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Phone number (US format)',
    example: '+1 (555) 123-4567 or 555-123-4567 or 5551234567',
  })
  @Matches(
    /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$|^\+1\d{10}$|^\d{10,11}$/,
    {
      message: 'Phone number must be a valid US phone number (e.g., +1 (555) 123-4567, 555-123-4567, or 5551234567)',
    },
  )
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Region assigned to LSM',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiProperty({
    description: 'Specific area within region assigned to LSM',
    example: 'Manhattan North',
  })
  @IsString()
  @IsNotEmpty()
  area: string;
}
