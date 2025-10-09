import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveBanRequestDto {
  @ApiProperty({
    description: 'Admin notes (optional)',
    example: 'Ban approved after reviewing evidence',
    required: false,
  })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class RejectBanRequestDto {
  @ApiProperty({
    description: 'Admin notes explaining why ban request was rejected',
    example: 'Insufficient evidence, recommend monitoring for 30 days',
  })
  @IsString()
  @IsNotEmpty()
  adminNotes: string;
}

