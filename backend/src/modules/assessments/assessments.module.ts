import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { PrismaService } from '@config/prisma.service';
import { ProgressModule } from '@modules/progress/progress.module';
import { CertificatesModule } from '@modules/certificates/certificates.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [ProgressModule, CertificatesModule, NotificationsModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, PrismaService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
