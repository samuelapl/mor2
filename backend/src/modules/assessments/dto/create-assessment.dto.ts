import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AssessmentQuestionDto {
  @ApiProperty({ example: 'q1' })
  @IsString()
  id: string;

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
}

export class CreateAssessmentDto {
  @ApiProperty({ example: 'Module 1 Quiz' })
  @IsString()
  @MinLength(2)
  titleEn: string;

  @ApiProperty({ example: 'የሞዱል 1 ፈተና' })
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

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(1)
  passingScore: number;

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
  questions: AssessmentQuestionDto[];
}
