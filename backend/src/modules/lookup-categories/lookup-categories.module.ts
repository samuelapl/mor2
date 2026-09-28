import { Module } from '@nestjs/common';
import { LookupCategoriesController } from './lookup-categories.controller';
import { LookupCategoriesService } from './lookup-categories.service';
import { PrismaService } from '@config/prisma.service';

@Module({
  controllers: [LookupCategoriesController],
  providers: [LookupCategoriesService, PrismaService],
  exports: [LookupCategoriesService],
})
export class LookupCategoriesModule {}
