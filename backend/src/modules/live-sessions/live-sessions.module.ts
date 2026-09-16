import { Module } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { BigBlueButtonProvider } from './providers/bigbluebutton.provider';
import { PrismaService } from '@config/prisma.service';

@Module({
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService, BigBlueButtonProvider, PrismaService],
  exports: [LiveSessionsService, BigBlueButtonProvider],
})
export class LiveSessionsModule {}
