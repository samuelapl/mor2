import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+251911000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['en', 'am'] })
  @IsOptional()
  @IsEnum(['en', 'am'])
  locale?: 'en' | 'am';

  @ApiPropertyOptional({ example: '9000123456' })
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'venue_uuid' })
  @IsOptional()
  @IsString()
  primaryVenueId?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class AdminResetPasswordDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
