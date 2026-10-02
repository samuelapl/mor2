import { Module } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { PolicyModule } from '@modules/policy/policy.module';
import { SessionPlansController } from './session-plans.controller';
import { SessionPlansService } from './session-plans.service';

@Module({
  imports: [PolicyModule],
  controllers: [SessionPlansController],
  providers: [SessionPlansService, PrismaService],
  exports: [SessionPlansService],
})
export class SessionPlansModule {}
