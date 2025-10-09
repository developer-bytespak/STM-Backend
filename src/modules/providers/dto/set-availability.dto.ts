import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAvailabilityDto {
  @ApiProperty({
    description: 'Provider availability status',
    enum: ['active', 'inactive'],
    example: 'active',
  })
  @IsEnum(['active', 'inactive'])
  status: 'active' | 'inactive';
}

