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

export class CurriculumAttachmentDto {
  @ApiProperty({ example: 'syllabus.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'http://localhost:9000/eltms-files/attachments/123.pdf' })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ example: 102400 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}

export class LessonDto {
  @ApiProperty({ example: 'Introduction to Computers' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

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

  @ApiPropertyOptional({ type: () => [CurriculumAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumAttachmentDto)
  attachments?: CurriculumAttachmentDto[];
}

export class CreateModuleDto {
  @ApiProperty({ example: 'Module 1: Fundamentals' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Understand the basic concepts of revenue assessment' })
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

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

  @ApiPropertyOptional({ type: [CurriculumAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumAttachmentDto)
  attachments?: CurriculumAttachmentDto[];
}
