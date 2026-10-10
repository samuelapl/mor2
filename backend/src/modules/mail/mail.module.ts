import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { MailService } from './mail.service';
import { EmailQueue } from './email.queue';
import { EmailProcessor } from './email.processor';
import { NotificationEmailResolver } from './notification-email.resolver';

@Module({
  providers: [MailService, EmailQueue, EmailProcessor, NotificationEmailResolver, PrismaService],
  exports: [EmailQueue],
})
export class MailModule {}
