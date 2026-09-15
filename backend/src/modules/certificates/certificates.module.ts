import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { CertificateTemplatesService } from './templates/certificate-templates.service';
import { CertificateTemplatesController } from './templates/certificate-templates.controller';
import { PrismaService } from '@config/prisma.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { FilesModule } from '@modules/files/files.module';

@Module({
  imports: [NotificationsModule, FilesModule],
  controllers: [CertificatesController, CertificateTemplatesController],
  providers: [CertificatesService, CertificateTemplatesService, PrismaService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
