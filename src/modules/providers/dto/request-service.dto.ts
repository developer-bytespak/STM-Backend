import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class RequestServiceDto {
  @ApiProperty({
    description: 'Service name',
    example: 'Pool Cleaning',
  })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({
    description: 'Service category',
    example: 'Exterior Cleaner',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Professional pool cleaning and maintenance services',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Suggested dynamic questions for this service',
    example: {
      questions: [
        {
          id: 'pool_size',
          type: 'select',
          label: 'Pool size',
          options: ['Small', 'Medium', 'Large'],
        },
      ],
    },
  })
  @IsObject()
  @IsOptional()
  suggestedQuestions?: any;
}
