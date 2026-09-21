import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateQuestionBankQuestionDto } from './create-question-bank-question.dto';

export class BulkCreateQuestionBankDto {
  @ApiProperty({ type: [CreateQuestionBankQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionBankQuestionDto)
  questions: CreateQuestionBankQuestionDto[];
}
