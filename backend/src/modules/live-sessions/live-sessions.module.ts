import { Module } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { BigBlueButtonProvider } from './providers/bigbluebutton.provider';
import { LiveKitProvider } from './providers/livekit.provider';
import { PrismaService } from '@config/prisma.service';
import { AttendanceModule } from '@modules/attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService, BigBlueButtonProvider, LiveKitProvider, PrismaService],
  exports: [LiveSessionsService, BigBlueButtonProvider, LiveKitProvider],
})
export class LiveSessionsModule {}
