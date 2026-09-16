import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class LessonDto {
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

  @ApiPropertyOptional({
    enum: ['VIDEO', 'DOCUMENT', 'PRESENTATION', 'INTERACTIVE', 'SCORM', 'EXTERNAL_LINK', 'AUDIO'],
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ type: () => [LessonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonDto)
  subLessons?: LessonDto[];
}

export class CreateModuleDto {
  @ApiProperty({ example: 'Module 1: Fundamentals' })
  @IsString()
  @MinLength(2)
  titleEn: string;

  @ApiProperty({ example: 'ሞዱል 1፡ መሰረታዊ' })
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  passingScore?: number;

  @ApiPropertyOptional({ type: [LessonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonDto)
  lessons?: LessonDto[];
}
