import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { SessionPlatform, SessionType } from '@prisma/client';

export class CreateSessionDto {
  @ApiPropertyOptional({ enum: SessionType, default: SessionType.VIRTUAL })
  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType;

  @ApiPropertyOptional({ example: 'venue-uuid-1' })
  @IsOptional()
  @IsString()
  venueId?: string;

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

  @ApiPropertyOptional({ example: 'session-room-101' })
  @IsOptional()
  @IsString()
  meetingId?: string;

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

  @ApiPropertyOptional({ example: 'uuid-of-trainer', description: 'Assigned trainer ID' })
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether participants can view the attendance list' })
  @IsOptional()
  @IsBoolean()
  allowViewAttendance?: boolean;

  @ApiPropertyOptional({ example: 60, description: 'Minimum active stay threshold (%) for Present status' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  attendanceThreshold?: number;
}
