import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * HR integration stub.
 *
 * Planned to consume the Ministry HR feeder for employee/training records:
 *   - INBOUND:  pull employee roster, department, tenure, training eligibility
 *   - OUTBOUND: push training completion/certification records
 *
 * To enable:
 *   1. Define the transport (REST webhook, SFTP file drop, message queue).
 *   2. Implement the mapping between HR payloads and Prisma User/Certificate
 *      models.
 *   3. Store sync health in HrSyncLog for dashboards.
 */
@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncInbound(payload: unknown) {
    const result = await this.prisma.hrSyncLog.create({
      data: {
        direction: 'INBOUND',
        status: 'SUCCESS',
        payload: payload as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`HR inbound sync recorded: ${result.id}`);
    return result;
  }

  async syncOutbound(payload: unknown) {
    const result = await this.prisma.hrSyncLog.create({
      data: {
        direction: 'OUTBOUND',
        status: 'SUCCESS',
        payload: payload as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`HR outbound sync recorded: ${result.id}`);
    return result;
  }

  async checkHealth() {
    const recentFailures = await this.prisma.hrSyncLog.count({
      where: { status: 'FAILURE', createdAt: { gte: new Date(Date.now() - 86400000) } },
    });

    return {
      healthy: recentFailures === 0,
      failures24h: recentFailures,
      stubbed: true,
    };
  }
}
