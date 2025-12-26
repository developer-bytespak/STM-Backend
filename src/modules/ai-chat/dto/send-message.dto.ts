import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'User message to AI assistant', example: 'I need plumbing services' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}

