import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';

export enum JobResponseAction {
  ACCEPT = 'accept',
  REJECT = 'reject',
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
}
