import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CheckQuestionDuplicatesDto {
  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type!: QuestionType;

  @ApiProperty({ example: 'What is the primary function of an inverter?' })
  @IsString()
  question!: string;

  @ApiProperty({ example: ['Convert DC to AC', 'Convert AC to DC'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @ApiPropertyOptional({
    description:
      'Course of the draft; null/omitted means a reusable question, checked against all courses',
  })
  @IsOptional()
  @IsString()
  courseId?: string | null;

  @ApiPropertyOptional({ description: 'Question being edited, excluded from the matches' })
  @IsOptional()
  @IsString()
  excludeId?: string;
}
