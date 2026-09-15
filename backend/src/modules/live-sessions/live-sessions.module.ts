import { Module } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { PrismaService } from '@config/prisma.service';

@Module({
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService, PrismaService],
  exports: [LiveSessionsService],
})
export class LiveSessionsModule {}
