import { PartialType } from '@nestjs/swagger';
import { CreateQuestionBankQuestionDto } from './create-question-bank-question.dto';

export class UpdateQuestionBankQuestionDto extends PartialType(CreateQuestionBankQuestionDto) {}
