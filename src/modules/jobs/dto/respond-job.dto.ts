import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, ValidateNested, IsObject, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum JobResponseAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
  NEGOTIATE = 'negotiate',
}

export class NegotiationDto {
  @ApiPropertyOptional({
    description: 'Edited form answers with proposed changes',
    example: { when: 'Friday instead of Monday', additionalWork: 'Add bathroom' },
  })
  @IsObject()
  @IsOptional()
  editedAnswers?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Proposed new price',
    example: 350.00,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  editedPrice?: number;

  @ApiPropertyOptional({
    description: 'Proposed new schedule date',
    example: '2025-10-15',
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

export class RespondJobDto {
  @ApiProperty({
    description: 'Action to take on the job',
    enum: JobResponseAction,
    example: 'accept',
  })
  @IsEnum(JobResponseAction)
  action: JobResponseAction;

  @ApiPropertyOptional({
    description: 'Rejection reason (required if action is reject)',
    example: 'Not available at that time',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Negotiation details (required if action is negotiate)',
    type: NegotiationDto,
  })
  @ValidateNested()
  @Type(() => NegotiationDto)
  @IsOptional()
  negotiation?: NegotiationDto;
}

