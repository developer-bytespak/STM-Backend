import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({
    description: 'Overall rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Feedback text',
    example: 'Excellent service, very professional!',
    required: false,
  })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiProperty({
    description: 'Punctuality rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  punctualityRating?: number;

  @ApiProperty({
    description: 'Response time in minutes',
    example: 15,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  responseTime?: number;
}

