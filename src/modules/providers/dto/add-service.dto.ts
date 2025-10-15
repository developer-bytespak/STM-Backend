import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AddServiceDto {
  @ApiProperty({
    description: 'Service ID to add to provider profile',
    example: 5,
  })
  @IsNumber()
  @Type(() => Number)
  serviceId: number;
}
