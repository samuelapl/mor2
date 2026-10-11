import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { LiveSessionsModule } from '@modules/live-sessions/live-sessions.module';
import { WorkingDayResolverService } from './working-day-resolver.service';
import { SessionReschedulerService } from './session-rescheduler.service';
import { PublicHolidaysController } from './public-holidays.controller';

@Module({
  imports: [LiveSessionsModule],
  controllers: [PublicHolidaysController],
  providers: [PrismaService, WorkingDayResolverService, SessionReschedulerService],
  exports: [WorkingDayResolverService, SessionReschedulerService],
})
export class SessionReschedulerModule {}

