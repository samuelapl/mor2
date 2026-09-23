import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryQuestionBankDto {
  @ApiPropertyOptional({ description: 'Filter by Course ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by Curriculum Module ID' })
  @IsOptional()
  @IsString()
  moduleId?: string;

  @ApiPropertyOptional({ description: 'Filter by Lesson ID' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Filter by Sub-lesson ID' })
  @IsOptional()
  @IsString()
  subLessonId?: string;

  @ApiPropertyOptional({ description: 'Include global / reusable questions when courseId is provided', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeGlobal?: boolean;

  @ApiPropertyOptional({ description: 'Filter only global / reusable questions (courseId is null)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  globalOnly?: boolean;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search term for question text or category' })
  @IsOptional()
  @IsString()
  search?: string;
}
