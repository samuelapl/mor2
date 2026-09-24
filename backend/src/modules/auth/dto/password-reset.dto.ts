import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john.doe@mor.gov.et' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'john.doe@mor.gov.et' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits.' })
  code: string;

  @ApiProperty({ example: 'NewPass123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class FirstLoginResendCodeDto {
  @ApiProperty({ description: 'Challenge token returned by /auth/login' })
  @IsString()
  @IsNotEmpty()
  challengeToken: string;
}

export class FirstLoginCompleteDto {
  @ApiProperty({ description: 'Challenge token returned by /auth/login' })
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits.' })
  code: string;

  @ApiProperty({ example: 'NewPass123' })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'NewPass123' })
  @IsString()
  confirmPassword: string;
}
