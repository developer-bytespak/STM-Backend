import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CustomerJobAction {
  APPROVE_EDITS = 'approve_edits',
  CLOSE_DEAL = 'close_deal',
  CANCEL = 'cancel',
}

export class JobActionDto {
  @ApiProperty({
    description: 'Action to perform on the job',
    enum: CustomerJobAction,
    example: CustomerJobAction.CLOSE_DEAL,
  })
  @IsEnum(CustomerJobAction)
  action: CustomerJobAction;

  @ApiProperty({
    description: 'Cancellation reason (required for cancel action)',
    example: 'No longer needed',
    required: false,
  })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}

