import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  MinLength, 
  IsEnum, 
  IsPhoneNumber, 
  IsOptional, 
  IsArray, 
  ArrayMinSize, 
  IsNumber, 
  Min, 
  IsBoolean 
} from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum';
import { Type } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsPhoneNumber('US')
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CUSTOMER,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({
    description: 'City (derived from ZIP if not provided)',
    example: 'Dallas',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'State (2-letter, derived from ZIP if not provided)',
    example: 'TX',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Specific area within region (required for LSM role, optional for others)',
    example: 'Manhattan North',
  })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional({
    description: 'Zipcode for location-based assignment',
    example: '10001',
  })
  @IsString()
  @IsOptional()
  zipcode?: string;

  @ApiPropertyOptional({
    description: 'Address (required for CUSTOMER role)',
    example: '123 Main St, New York, NY 10001',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Deprecated: will be removed after migration',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: 'Experience in years (for PROVIDER role)',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  experience?: number;

  // ==================== SERVICE PROVIDER SPECIFIC FIELDS ====================

  @ApiPropertyOptional({
    description: 'Business name (for PROVIDER role)',
    example: 'ABC Plumbing Services',
  })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Primary service type (for PROVIDER role)',
    example: 'Plumbing',
  })
  @IsString()
  @IsOptional()
  serviceType?: string;

  @ApiPropertyOptional({
    description: 'Experience level string (for PROVIDER role)',
    example: '3-5 years',
    enum: [
      'Less than 1 year',
      '1-2 years',
      '3-5 years',
      '6-10 years',
      'More than 10 years',
    ],
  })
  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @ApiPropertyOptional({
    description: 'Service description (for PROVIDER role)',
    example: 'Professional plumbing services with 10+ years experience',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Provider website URL (for PROVIDER role)',
    example: 'https://www.example.com',
  })
  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Array of service zip codes (for PROVIDER role)',
    example: ['10001', '10002', '10003'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @IsString({ each: true })
  zipCodes?: string[];

  @ApiPropertyOptional({
    description: 'Minimum service price in USD (for PROVIDER role)',
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum service price in USD (for PROVIDER role)',
    example: 500,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Terms and conditions acceptance (for PROVIDER role)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  acceptedTerms?: boolean;
}