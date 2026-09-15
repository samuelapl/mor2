import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class SubmitAssessmentDto {
  @ApiProperty({
    example: [
      { questionId: 'q1', selectedOption: 1 },
      { questionId: 'q2', textAnswer: 'Hello' },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  answers: Array<Record<string, unknown>>;
}
