import { Module } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { VirtualSessionsService } from './virtual/virtual-sessions.service';
import { BigBlueButtonProvider } from './virtual/providers/bigbluebutton.provider';
import { ExternalLinkProvider } from './virtual/providers/external-link.provider';
import { JitsiProvider } from './virtual/providers/jitsi.provider';
import { LiveKitProvider } from './virtual/providers/livekit.provider';
import { PrismaService } from '@config/prisma.service';
import { AttendanceModule } from '@modules/attendance/attendance.module';
import { InPersonSessionsModule } from './in-person/in-person-sessions.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';

@Module({
  imports: [AttendanceModule, InPersonSessionsModule, PermissionsModule],
  controllers: [LiveSessionsController],
  providers: [
    LiveSessionsService,
    VirtualSessionsService,
    BigBlueButtonProvider,
    JitsiProvider,
    ExternalLinkProvider,
    LiveKitProvider,
    PrismaService,
  ],
  exports: [LiveSessionsService, BigBlueButtonProvider, LiveKitProvider],
})
export class LiveSessionsModule {}
