import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { LawCategoriesController } from './law-categories.controller';
import { LawCategoriesService } from './law-categories.service';
import { LegalDocumentsController } from './legal-documents.controller';
import { LegalDocumentsService } from './legal-documents.service';

@Module({
  controllers: [LawCategoriesController, LegalDocumentsController],
  providers: [LawCategoriesService, LegalDocumentsService, PrismaService],
  exports: [LawCategoriesService, LegalDocumentsService],
})
export class LegalDocumentsModule {}

