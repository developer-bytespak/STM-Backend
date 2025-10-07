import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, when can you start?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Message type',
    enum: MessageType,
    default: 'text',
  })
  @IsEnum(MessageType)
  @IsOptional()
  message_type?: MessageType;
}
