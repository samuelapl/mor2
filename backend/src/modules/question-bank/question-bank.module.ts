import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';

@Module({
  controllers: [QuestionBankController],
  providers: [QuestionBankService, PrismaService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
