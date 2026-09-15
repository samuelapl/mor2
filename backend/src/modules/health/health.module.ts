import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '@config/prisma.service';
import { FilesModule } from '@modules/files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [HealthController],
  providers: [HealthService, PrismaService],
})
export class HealthModule {}
