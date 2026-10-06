import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AssessmentType } from '@prisma/client';
import { CurriculumAttachmentDto } from '@modules/curriculum/dto/module/create-module.dto';

export class AssessmentQuestionDto {
  @ApiProperty({ example: 'q1' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ example: 'mcq' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'What is 2+2?' })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ example: ['3', '4', '5'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ example: 1, description: 'Index (or value) of the correct option' })
  @IsOptional()
  correctAnswer?: string | number;

  @ApiPropertyOptional({ example: 'General' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;
}

export class CreateAssessmentDto {
  @ApiProperty({ example: 'Module 1 Quiz' })
  @IsString()
  @MinLength(2)
  titleEn!: string;

  @ApiProperty({ example: 'የሞዱል 1 ፈተና' })
  @IsString()
  @MinLength(2)
  titleAm!: string;

  @ApiPropertyOptional({ enum: AssessmentType, example: AssessmentType.FINAL_ASSESSMENT })
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAm?: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'Passing score percentage (defaults to global policy)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  passingScore?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Weight % contribution to final course grade (0-100)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  weight?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiProperty({
    example: [
      {
        id: 'q1',
        type: 'mcq',
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctAnswer: 1,
      },
    ],
    description: 'Structured question bank',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  questions!: AssessmentQuestionDto[];

  @ApiPropertyOptional({
    type: [CurriculumAttachmentDto],
    description:
      'Reference files shown with the assessment. Omit to keep the current files; [] removes them.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumAttachmentDto)
  attachments?: CurriculumAttachmentDto[];
}
