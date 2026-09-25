import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { InPersonSessionsService } from './in-person-sessions.service';

/** Standalone so enrollments and venues can use the in-person rules without importing all of live-sessions. */
@Module({
  providers: [InPersonSessionsService, PrismaService],
  exports: [InPersonSessionsService],
})
export class InPersonSessionsModule {}
