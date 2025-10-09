import { IsInt, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FileDisputeDto {
  @ApiProperty({
    description: 'Job ID for the dispute',
    example: 50,
  })
  @IsInt()
  jobId: number;

  @ApiProperty({
    description: 'Dispute description/reason',
    example: 'Work not completed according to agreement',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

