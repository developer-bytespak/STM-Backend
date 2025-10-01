import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderTier, ProviderStatus } from '@prisma/client';

export class CreateProviderDto {
  @ApiProperty({ description: 'Provider first name' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ description: 'Provider last name' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({ description: 'Provider email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Provider phone number' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Provider password', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Provider experience in years', minimum: 0 })
  @IsInt()
  @Min(0)
  experience: number;

  @ApiPropertyOptional({ description: 'Provider description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Provider location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Local Service Manager ID' })
  @IsInt()
  @Min(1)
  lsm_id: number;

  @ApiPropertyOptional({ description: 'Provider tier', enum: ProviderTier, default: 'Bronze' })
  @IsOptional()
  @IsEnum(ProviderTier)
  tier?: ProviderTier = ProviderTier.Bronze;

  @ApiPropertyOptional({ description: 'Provider status', enum: ProviderStatus, default: 'active' })
  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus = ProviderStatus.active;

  @ApiPropertyOptional({ description: 'Is provider active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @ApiPropertyOptional({ description: 'Profile picture', type: 'string', format: 'binary' })
  @IsOptional()
  profile_picture?: any;

  @ApiPropertyOptional({ description: 'Provider documents (certificates, portfolios)', type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  documents?: any[];
}
