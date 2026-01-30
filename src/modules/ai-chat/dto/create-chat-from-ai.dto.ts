import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsOptional, IsArray } from 'class-validator';

export class CreateChatFromAiDto {
  @ApiProperty({ description: 'Provider ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  providerId: number;

  @ApiProperty({ description: 'AI session ID', example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  aiSessionId: string;

  @ApiPropertyOptional({
    description: 'Array of image URLs uploaded by customer (after zipcode/budget collection)',
    example: ['https://blob.vercelusercontent.com/image1.jpg', 'https://blob.vercelusercontent.com/image2.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

