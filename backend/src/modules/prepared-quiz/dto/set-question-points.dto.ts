import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class PreparedQuestionPointsItem {
  @ApiProperty({ description: 'Question bank question ID' })
  @IsString()
  questionId!: string;

  @ApiProperty({ example: 2, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  points!: number;
}

export class SetPreparedQuestionPointsDto {
  @ApiProperty({ type: [PreparedQuestionPointsItem] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreparedQuestionPointsItem)
  points!: PreparedQuestionPointsItem[];
}
