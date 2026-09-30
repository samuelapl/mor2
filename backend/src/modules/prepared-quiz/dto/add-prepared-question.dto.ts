import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddPreparedQuestionDto {
  @ApiProperty({ description: 'ID of the question from the question bank' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ description: 'Display/broadcast order (0-based)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
