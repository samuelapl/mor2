import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdatePreparedQuizDto {
  @ApiPropertyOptional({ description: 'Updated title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated time limit in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ description: 'Order index of quiz group' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
