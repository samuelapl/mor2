import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuestionBankQuestionDto {
  @ApiPropertyOptional({
    example: 'c1-uuid',
    description: 'Course ID or null if reusable across courses',
  })
  @IsOptional()
  @IsString()
  courseId?: string | null;

  @ApiPropertyOptional({ example: 'm1-uuid', description: 'Curriculum Module ID or null' })
  @IsOptional()
  @IsString()
  moduleId?: string | null;

  @ApiPropertyOptional({ example: 'l1-uuid', description: 'Lesson ID or null' })
  @IsOptional()
  @IsString()
  lessonId?: string | null;

  @ApiPropertyOptional({ example: 'sub1-uuid', description: 'Sub-lesson ID or null' })
  @IsOptional()
  @IsString()
  subLessonId?: string | null;

  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ example: 'What is the primary function of an inverter?' })
  @IsString()
  question: string;

  @ApiProperty({
    example: ['Convert DC to AC', 'Convert AC to DC', 'Store charge'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiPropertyOptional({
    example: '0',
    description: 'Correct answer index or text. Nullable for open-ended questions.',
  })
  @IsOptional()
  @IsString()
  correctAnswer?: string | null;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ example: 'General', default: 'General' })
  @IsOptional()
  @IsString()
  category?: string;
}
