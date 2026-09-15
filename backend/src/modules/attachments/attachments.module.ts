import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaService } from '@config/prisma.service';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrismaService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
