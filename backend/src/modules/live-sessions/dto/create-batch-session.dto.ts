import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class VenueSessionItemDto {
  @ApiProperty({ example: 'venue-uuid-1' })
  @IsString()
  @IsNotEmpty()
  venueId: string;

  @ApiPropertyOptional({ example: 'trainer-uuid-1' })
  @IsOptional()
  @IsString()
  trainerId?: string;

  @ApiProperty({ example: '2026-10-15T09:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: 180 })
  @IsInt()
  @Min(5)
  durationMinutes: number;
}

export class CreateBatchSessionDto {
  @ApiProperty({ example: 'course-uuid-1' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ example: 'Practical Tax Auditing Lab' })
  @IsString()
  @MinLength(2)
  titleEn: string;

  @ApiPropertyOptional({ example: 'የግብር ኦዲት የተግባር ልምምድ' })
  @IsOptional()
  @IsString()
  titleAm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAm?: string;

  @ApiProperty({ type: [VenueSessionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueSessionItemDto)
  venueSessions: VenueSessionItemDto[];
}

