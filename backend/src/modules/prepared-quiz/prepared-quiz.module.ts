import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { PreparedQuizController } from './prepared-quiz.controller';
import { PreparedQuizService } from './prepared-quiz.service';

@Module({
  imports: [PermissionsModule],
  controllers: [PreparedQuizController],
  providers: [PreparedQuizService, PrismaService],
  exports: [PreparedQuizService],
})
export class PreparedQuizModule {}
