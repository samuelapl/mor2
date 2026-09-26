import { Module } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { VenuesController } from './venues.controller';
import { PrismaService } from '@config/prisma.service';
import { InPersonSessionsModule } from '@modules/live-sessions/in-person/in-person-sessions.module';

@Module({
  imports: [InPersonSessionsModule],
  controllers: [VenuesController],
  providers: [VenuesService, PrismaService],
  exports: [VenuesService],
})
export class VenuesModule {}

