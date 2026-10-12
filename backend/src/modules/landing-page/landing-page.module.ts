import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { AuditModule } from '@modules/audit/audit.module';
import { LandingPageController } from './landing-page.controller';
import { LandingPageService } from './landing-page.service';

@Module({
  imports: [AuditModule],
  controllers: [LandingPageController],
  providers: [LandingPageService, PrismaService],
  exports: [LandingPageService],
})
export class LandingPageModule {}

