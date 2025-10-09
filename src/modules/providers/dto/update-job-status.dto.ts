import { IsEnum, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum JobStatusAction {
  MARK_COMPLETE = 'mark_complete',
  MARK_PAYMENT = 'mark_payment',
}

export class PaymentDetailsDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['cash', 'card', 'bank_transfer', 'online'],
    example: 'cash',
  })
  @IsEnum(['cash', 'card', 'bank_transfer', 'online'])
  method: string;

  @ApiProperty({
    description: 'Payment notes',
    example: 'Paid in full via cash',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateJobStatusDto {
  @ApiProperty({
    description: 'Action to perform',
    enum: JobStatusAction,
    example: JobStatusAction.MARK_COMPLETE,
  })
  @IsEnum(JobStatusAction)
  action: JobStatusAction;

  @ApiProperty({
    description: 'Payment details (required only for mark_payment action)',
    type: PaymentDetailsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  @IsOptional()
  paymentDetails?: PaymentDetailsDto;
}

