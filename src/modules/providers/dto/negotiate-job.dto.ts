import { IsObject, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NegotiateJobDto {
  @ApiProperty({
    description: 'Edited form answers with proposed changes',
    example: { when: 'Friday instead of Monday', additionalWork: 'Add bathroom' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  editedAnswers?: Record<string, any>;

  @ApiProperty({
    description: 'Proposed new price',
    example: 350.00,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  editedPrice?: number;

  @ApiProperty({
    description: 'Proposed new schedule date',
    example: '2025-10-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  editedSchedule?: string;

  @ApiProperty({
    description: 'Explanation of proposed changes',
    example: 'Can do Friday instead, added bathroom work for extra $100',
  })
  @IsString()
  notes: string;
}

