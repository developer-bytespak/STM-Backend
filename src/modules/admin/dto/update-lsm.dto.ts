import { IsEmail, IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum LSMStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateLsmDto {
  @ApiPropertyOptional({ example: 'Lisa' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Manager' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'lsm@stm.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+11234567890' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Manhattan North' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ enum: LSMStatus, example: 'active' })
  @IsOptional()
  @IsEnum(LSMStatus)
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ example: 'NewPassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

