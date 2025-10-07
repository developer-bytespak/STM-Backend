import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ReassignJobDto {
  @ApiProperty({
    description: 'New Service Provider ID',
    example: 43,
  })
  @IsNumber()
  newProviderId: number;
}
