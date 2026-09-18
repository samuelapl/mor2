import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { PrismaService } from '@config/prisma.service';
import { ProgressModule } from '@modules/progress/progress.module';
import { CertificatesModule } from '@modules/certificates/certificates.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PolicyModule } from '@modules/policy/policy.module';

@Module({
  imports: [ProgressModule, CertificatesModule, NotificationsModule, PolicyModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, PrismaService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
