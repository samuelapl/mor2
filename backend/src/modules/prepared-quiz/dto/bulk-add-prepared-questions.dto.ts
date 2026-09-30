import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class BulkAddPreparedQuestionsDto {
  @ApiProperty({
    type: [String],
    description: 'Array of question bank question IDs to add to the prepared quiz',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  questionIds: string[];
}
