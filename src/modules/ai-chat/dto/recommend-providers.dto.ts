import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RecommendProvidersDto {
  @ApiProperty({ description: 'Service name', example: 'Plumbing' })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiProperty({ description: 'Zipcode or location', example: '75001' })
  @IsString()
  @IsNotEmpty()
  zipcode: string;
}

