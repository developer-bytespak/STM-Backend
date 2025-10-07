import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class BanProviderDto {
  @ApiProperty({
    description: 'Reason for banning the provider',
    example: 'Multiple customer complaints and poor service quality',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
