import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateChatFromAiDto {
  @ApiProperty({ description: 'Provider ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  providerId: number;

  @ApiProperty({ description: 'AI session ID', example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  aiSessionId: string;
}

