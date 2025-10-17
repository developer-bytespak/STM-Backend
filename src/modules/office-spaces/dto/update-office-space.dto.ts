import { PartialType } from '@nestjs/swagger';
import { CreateOfficeSpaceDto } from './create-office-space.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OfficeStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  BOOKED = 'booked',
  MAINTENANCE = 'maintenance',
}

export class UpdateOfficeSpaceDto extends PartialType(CreateOfficeSpaceDto) {
  @ApiPropertyOptional({ enum: OfficeStatus, example: OfficeStatus.AVAILABLE })
  @IsEnum(OfficeStatus)
  @IsOptional()
  status?: OfficeStatus;
}

