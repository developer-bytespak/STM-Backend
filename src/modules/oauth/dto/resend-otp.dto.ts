import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class ResendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}