import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard, PrismaService],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
