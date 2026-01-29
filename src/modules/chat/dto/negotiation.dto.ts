import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class SendNegotiationOfferDto {
  @ApiProperty({
    description: 'Job ID',
    example: 1,
  })
  @IsNumber()
  job_id: number;

  @ApiPropertyOptional({
    description: 'Proposed price',
    example: 150,
  })
  @IsNumber()
  @IsOptional()
  proposed_price?: number;

  @ApiPropertyOptional({
    description: 'Proposed completion date',
    example: '2026-02-15',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  proposed_date?: Date;

  @ApiPropertyOptional({
    description: 'Notes for the other party',
    example: 'Need more time for quality work',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RespondToNegotiationDto {
  @ApiProperty({
    description: 'Job ID',
    example: 1,
  })
  @IsNumber()
  job_id: number;

  @ApiProperty({
    description: 'Response action',
    enum: ['accept', 'decline', 'counter'],
    example: 'counter',
  })
  @IsEnum(['accept', 'decline', 'counter'])
  action: 'accept' | 'decline' | 'counter';

  @ApiPropertyOptional({
    description: 'Counter proposed price (required if action is counter)',
    example: 120,
  })
  @IsNumber()
  @IsOptional()
  counter_proposed_price?: number;

  @ApiPropertyOptional({
    description: 'Counter proposed date (required if action is counter)',
    example: '2026-02-20',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  counter_proposed_date?: Date;

  @ApiPropertyOptional({
    description: 'Counter notes',
    example: 'Can we split the difference?',
  })
  @IsString()
  @IsOptional()
  counter_notes?: string;
}
