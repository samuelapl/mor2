import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class SubmitAssessmentDto {
  @ApiProperty({
    example: [
      { questionId: 'q1', selectedOption: 1 },
      { questionId: 'q2', textAnswer: 'Hello' },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  answers!: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'True if submitted automatically upon timer expiration' })
  @IsBoolean()
  @IsOptional()
  isAuto?: boolean;
}
