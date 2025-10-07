import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AddServiceDto {
  @ApiProperty({
    description: 'Service ID to add to provider profile',
    example: 5,
  })
  @IsNumber()
  serviceId: number;
}
