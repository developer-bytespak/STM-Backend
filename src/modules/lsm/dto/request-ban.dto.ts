import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestBanDto {
  @ApiProperty({
    description: 'Detailed reason why provider should be banned',
    example: 'Multiple fraud complaints, poor service quality, customer disputes',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Set provider to inactive immediately while admin reviews',
    example: true,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  immediateInactivate?: boolean;
}

