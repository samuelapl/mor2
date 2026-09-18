import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { PrismaService } from '@config/prisma.service';
import { EnrollmentsModule } from '@modules/enrollments/enrollments.module';
import { CertificatesModule } from '@modules/certificates/certificates.module';
import { PolicyModule } from '@modules/policy/policy.module';

@Module({
  imports: [EnrollmentsModule, CertificatesModule, PolicyModule],
  controllers: [ProgressController],
  providers: [ProgressService, PrismaService],
  exports: [ProgressService],
})
export class ProgressModule {}
