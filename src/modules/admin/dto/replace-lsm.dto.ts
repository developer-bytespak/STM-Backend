import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum OldLsmAction {
  DELETE = 'delete',
  DEACTIVATE = 'deactivate',
  REASSIGN = 'reassign',
}

export class ReplaceLsmDto {
  // New LSM details
  @ApiProperty({ example: 'newlsm@stm.com' })
  @IsEmail()
  newLsmEmail: string;

  @ApiProperty({ example: 'NewLSM123!' })
  @IsString()
  @MinLength(6)
  newLsmPassword: string;

  @ApiProperty({ example: 'Bob' })
  @IsString()
  newLsmFirstName: string;

  @ApiProperty({ example: 'Manager' })
  @IsString()
  newLsmLastName: string;

  @ApiProperty({ example: '+11234567894' })
  @IsString()
  newLsmPhoneNumber: string;

  // What to do with old LSM
  @ApiProperty({ 
    enum: OldLsmAction, 
    example: 'deactivate',
    description: 'delete = deactivate old LSM, deactivate = set to inactive, reassign = move to new area' 
  })
  @IsEnum(OldLsmAction)
  oldLsmAction: 'delete' | 'deactivate' | 'reassign';

  // If reassigning old LSM, provide new region and area
  @ApiPropertyOptional({ 
    example: 'Los Angeles',
    description: 'Required if oldLsmAction is "reassign"' 
  })
  @IsOptional()
  @IsString()
  newRegionForOldLsm?: string;

  @ApiPropertyOptional({ 
    example: 'Downtown',
    description: 'Required if oldLsmAction is "reassign"' 
  })
  @IsOptional()
  @IsString()
  newAreaForOldLsm?: string;
}

