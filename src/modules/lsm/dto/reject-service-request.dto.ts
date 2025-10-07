import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectServiceRequestDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Service too niche for our region',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
