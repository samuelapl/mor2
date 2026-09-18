import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyController } from './policy.controller';
import { PrismaService } from '@config/prisma.service';

@Module({
  controllers: [PolicyController],
  providers: [PolicyService, PrismaService],
  exports: [PolicyService],
})
export class PolicyModule {}
