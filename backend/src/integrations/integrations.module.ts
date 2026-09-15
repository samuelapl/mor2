import { Module } from '@nestjs/common';
import { SsoService } from './sso.service';
import { HrService } from './hr.service';
import { PrismaService } from '@config/prisma.service';

@Module({
  providers: [SsoService, HrService, PrismaService],
  exports: [SsoService, HrService],
})
export class IntegrationsModule {}
