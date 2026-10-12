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

  /** @deprecated Session quizzes are formative and have no weight; ignored. */
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Ignored: session quizzes have no weight.',
  })
  @IsOptional()
  @IsInt()
  weight?: number;

  /** @deprecated Session quizzes are formative and have no pass mark; ignored. */
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Ignored: session quizzes have no pass mark.',
  })
  @IsOptional()
  @IsInt()
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
    description: 'Formative quizzes for this session (score only, not graded); [] for none.',
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

/** @deprecated Session quizzes carry no weight, so nothing needs rebalancing; ignored. */
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
    deprecated: true,
    description: 'Ignored: session quizzes carry no weight.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightRebalanceDto)
  /** @deprecated ignored */
  rebalance?: WeightRebalanceDto[];
}

export class AddSessionQuizDto extends SessionQuizPlanDto {
  @ApiPropertyOptional({
    type: [WeightRebalanceDto],
    deprecated: true,
    description: 'Ignored: session quizzes carry no weight.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightRebalanceDto)
  /** @deprecated ignored */
  rebalance?: WeightRebalanceDto[];
}

export class AssignSessionPlanTrainerDto {
  @ApiPropertyOptional({
    example: 'uuid-of-trainer',
    description: 'Trainer to host this planned session; null removes the assignment',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  trainerId!: string | null;
}
