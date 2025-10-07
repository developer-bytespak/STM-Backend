import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Description of the document',
    example: 'Plumbing License Certificate',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}

