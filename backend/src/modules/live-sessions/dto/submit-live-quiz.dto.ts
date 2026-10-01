import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class SubmitLiveQuizDto {
  @ApiProperty({ description: 'ID of the question from question bank or live quiz' })
  @IsString()
  questionId: string;

  @ApiProperty({ type: [String], description: 'Selected option IDs or indices' })
  @IsArray()
  @IsString({ each: true })
  selectedOptionIds: string[];

  @ApiProperty({ description: 'Seconds taken by learner to respond' })
  @IsNumber()
  responseDurationSeconds: number;

  @ApiProperty({ description: 'Question title if available', required: false })
  @IsOptional()
  @IsString()
  questionTitle?: string;

  @ApiProperty({ type: [String], description: 'Options if available', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ description: 'Correct answer if available', required: false })
  @IsOptional()
  @IsString()
  correctAnswer?: string;
}
