import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number (US format)' })
  @Matches(
    /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$|^\+1\d{10}$|^\d{10,11}$/,
    {
      message: 'Phone number must be a valid US phone number (e.g., +1 (234) 567-8900, 234-567-8900, or 2345678900)',
    },
  )
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL/path' })
  @IsString()
  @IsOptional()
  profilePicture?: string;
}


