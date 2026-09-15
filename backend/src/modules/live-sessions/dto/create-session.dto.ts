import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { SessionPlatform } from '@prisma/client';

export class CreateSessionDto {
  @ApiProperty({ example: 'Live Q&A Session' })
  @IsString()
  @MinLength(2)
  titleEn: string;

  @ApiProperty({ example: 'የቀጥታ ጥያቄና መልስ ክፍለ ጊዜ' })
  @IsString()
  @MinLength(2)
  titleAm: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAm?: string;

  @ApiProperty({ enum: SessionPlatform, default: SessionPlatform.GOOGLE_MEET })
  @IsEnum(SessionPlatform)
  platform: SessionPlatform;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingPassword?: string;

  @ApiProperty({ example: '2026-09-20T10:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(5)
  durationMinutes: number;
}
