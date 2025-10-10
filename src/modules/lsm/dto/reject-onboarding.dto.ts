import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectOnboardingDto {
  @ApiProperty({
    description: 'Reason for rejecting the provider onboarding application',
    example: 'Insufficient documentation or business does not meet service standards',
  })
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  reason: string;
}

