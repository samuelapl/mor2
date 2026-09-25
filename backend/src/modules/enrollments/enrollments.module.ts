import { Module } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { PrismaService } from '@config/prisma.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { InPersonSessionsModule } from '@modules/live-sessions/in-person/in-person-sessions.module';

@Module({
  imports: [NotificationsModule, InPersonSessionsModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, PrismaService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
