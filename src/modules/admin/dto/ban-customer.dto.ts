import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BanCustomerDto {
  @ApiProperty({
    description: 'Reason for banning the customer',
    example: 'Multiple complaints, fraudulent behavior',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

