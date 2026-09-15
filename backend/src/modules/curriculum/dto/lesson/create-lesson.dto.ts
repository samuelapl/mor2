import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { LessonContentType } from '@prisma/client';

export class CreateLessonDto {
  @ApiProperty({ example: 'Introduction to Computers' })
  @IsString()
  @MinLength(2)
  titleEn: string;

  @ApiPropertyOptional({ example: 'የኮምፒውተር መግቢያ' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  titleAm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentAm?: string;

  @ApiProperty({ enum: LessonContentType, default: LessonContentType.DOCUMENT })
  @IsEnum(LessonContentType)
  contentType: LessonContentType;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resourceUrl?: string;
}
