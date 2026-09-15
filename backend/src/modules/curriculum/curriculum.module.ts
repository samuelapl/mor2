import { Module } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { PrismaService } from '@config/prisma.service';

@Module({
  controllers: [CurriculumController],
  providers: [CurriculumService, PrismaService],
  exports: [CurriculumService],
})
export class CurriculumModule {}
