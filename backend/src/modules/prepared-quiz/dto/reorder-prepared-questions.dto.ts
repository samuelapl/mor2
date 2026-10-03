import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderPreparedQuestionsDto {
  @ApiProperty({
    type: [String],
    description: 'Full ordered list of question IDs — determines new question order inside quiz',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}
