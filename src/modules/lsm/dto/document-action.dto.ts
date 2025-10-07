import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';

export enum DocumentAction {
  VERIFY = 'verify',
  REJECT = 'reject',
}

export class DocumentActionDto {
  @ApiProperty({
    description: 'Action to take on document',
    enum: DocumentAction,
    example: 'verify',
  })
  @IsEnum(DocumentAction)
  action: DocumentAction;

  @ApiPropertyOptional({
    description: 'Rejection reason (required if action is reject)',
    example: 'Document is not clear enough',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
