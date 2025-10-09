import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'LSM resolution notes and decision',
    example: 'Both parties agreed to partial refund. Issue resolved amicably.',
  })
  @IsString()
  @IsNotEmpty()
  resolutionNotes: string;
}

