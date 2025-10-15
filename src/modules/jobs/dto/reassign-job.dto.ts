import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ReassignJobDto {
  @ApiProperty({
    description: 'New Service Provider ID',
    example: 43,
  })
  @IsNumber()
  @Type(() => Number)
  newProviderId: number;
}
