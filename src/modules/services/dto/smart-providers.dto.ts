import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SmartProvidersDto {
  @ApiProperty({
    description: 'Service ID',
    example: 5,
  })
  @IsNumber()
  @Type(() => Number)
  serviceId: number;

  @ApiProperty({
    description: 'Zipcode / location',
    example: '10001',
  })
  @IsString()
  zipcode: string;

  @ApiProperty({
    description: 'Customer budget',
    example: 200,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  budget: number;

  @ApiPropertyOptional({
    description: 'Project size in square feet (sent with job to provider, not used for matching)',
    example: 250,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  projectSizeSqft?: number;
}
