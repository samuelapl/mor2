import { Module } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { PrismaService } from '@config/prisma.service';
import { ProgressModule } from '@modules/progress/progress.module';

@Module({
  imports: [ProgressModule],
  controllers: [CurriculumController],
  providers: [CurriculumService, PrismaService],
  exports: [CurriculumService],
})
export class CurriculumModule {}
