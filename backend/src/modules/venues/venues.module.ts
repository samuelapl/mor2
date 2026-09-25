import { Module } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { VenuesController } from './venues.controller';
import { PrismaService } from '@config/prisma.service';

@Module({
  controllers: [VenuesController],
  providers: [VenuesService, PrismaService],
  exports: [VenuesService],
})
export class VenuesModule {}

