import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SessionQuizPlanDto {
  @ApiProperty({ example: 'Session 1 knowledge check' })
  @IsString()
  @MinLength(2)
  titleEn!: string;

  @ApiProperty({
    example: 10,
    description: 'Share of the course grade (%). All course weights total 100%.',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  weight!: number;

  @ApiPropertyOptional({ example: 60, description: 'Omit to use the global policy pass mark.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;
}

export class SessionPlanDto {
  @ApiProperty({ example: 'Kick-off: tax audit fundamentals' })
  @IsString()
  @MinLength(2)
  titleEn!: string;

  @ApiPropertyOptional({ description: 'Description (rich text)' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Learning objectives (rich text)' })
  @IsOptional()
  @IsString()
  objectivesEn?: string;

  @ApiProperty({
    type: [SessionQuizPlanDto],
    description: 'Weighted quizzes for this session; [] for none.',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SessionQuizPlanDto)
  quizzes!: SessionQuizPlanDto[];
}

export class ReplaceSessionPlansDto {
  @ApiProperty({
    type: [SessionPlanDto],
    description: 'The complete, ordered list of planned sessions; [] removes them all.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SessionPlanDto)
  plans!: SessionPlanDto[];
}

/** New weight for another session quiz, so the course total stays at exactly 100%. */
export class WeightRebalanceDto {
  @ApiProperty()
  @IsString()
  assessmentId!: string;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(0)
  @Max(100)
  weight!: number;
}

export class RemoveSessionPlanDto {
  @ApiPropertyOptional({
    type: [WeightRebalanceDto],
    description:
      'Required after approval when the session has weighted quizzes: where their weight goes.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightRebalanceDto)
  rebalance?: WeightRebalanceDto[];
}

export class AddSessionQuizDto extends SessionQuizPlanDto {
  @ApiPropertyOptional({
    type: [WeightRebalanceDto],
    description: 'Weight taken from other session quizzes to make room.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightRebalanceDto)
  rebalance?: WeightRebalanceDto[];
}
