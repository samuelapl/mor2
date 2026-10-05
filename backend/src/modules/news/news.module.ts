import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '@config/prisma.service';
import { FilesModule } from '@modules/files/files.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { NewsAdminController } from './news-admin.controller';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsEngagementService } from './news-engagement.service';

@Module({
  imports: [
    // Default limit for the public news routes; tighter per-route limits use @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      errorMessage: 'Too many requests — please wait a moment and try again',
    }),
    FilesModule,
    NotificationsModule,
  ],
  // Admin first: its static `news/admin` routes must register before `news/:slug`.
  controllers: [NewsAdminController, NewsController],
  providers: [NewsService, NewsEngagementService, PrismaService],
})
export class NewsModule {}
