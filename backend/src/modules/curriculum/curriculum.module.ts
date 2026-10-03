import { CoursesModule } from '@modules/courses/courses.module';
import { Module } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { PrismaService } from '@config/prisma.service';
import { ProgressModule } from '@modules/progress/progress.module';

@Module({
  imports: [ProgressModule, CoursesModule],
  controllers: [CurriculumController],
  providers: [CurriculumService, PrismaService],
  exports: [CurriculumService],
})
export class CurriculumModule {}
