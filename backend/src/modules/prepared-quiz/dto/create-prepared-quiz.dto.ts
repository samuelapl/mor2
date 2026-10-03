import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePreparedQuizDto {
  @ApiPropertyOptional({
    description: 'Quiz group title/label (e.g., "Lesson 1 Quiz")',
    default: 'Quiz 1',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Time limit in minutes for the whole quiz (e.g. 1, 3, 5, 7, 10)',
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  timeLimitMinutes?: number;
}
