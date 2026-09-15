import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class MarkLessonCompleteDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  completed: boolean;

  @ApiPropertyOptional({ description: 'Video position in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  lastPosition?: number;
}
