import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
import { PaginationQuery } from '@common/interfaces';

interface AuditEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValues: entry.oldValues as Prisma.InputJsonValue | undefined,
        newValues: entry.newValues as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  async findAll(
    query: PaginationQuery & {
      action?: string;
      entity?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const { page, limit, skip } = buildPaginationArgs(query);

    const where = this.buildWhere(query);

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResponse(logs, total, page, limit);
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  private buildWhere(
    query: PaginationQuery & {
      action?: string;
      entity?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
  ): Prisma.AuditLogWhereInput {
    return {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  async stats(query: { from?: string; to?: string }): Promise<{
    total: number;
    byAction: Record<string, number>;
    byEntity: Record<string, number>;
  }> {
    const where = this.buildWhere(query);

    const [total, byAction, byEntity] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { _all: true },
        orderBy: { _count: { entity: 'desc' } },
      }),
    ]);

    return {
      total,
      byAction: Object.fromEntries(byAction.map((r) => [r.action, r._count._all])),
      byEntity: Object.fromEntries(byEntity.map((r) => [r.entity, r._count._all])),
    };
  }

  async exportCsv(
    query: PaginationQuery & {
      action?: string;
      entity?: string;
      userId?: string;
      from?: string;
      to?: string;
    },
  ): Promise<string> {
    const logs = await this.prisma.auditLog.findMany({
      where: this.buildWhere(query),
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const escape = (value: unknown): string => {
      const str = value === null || value === undefined ? '' : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const header = [
      'timestamp',
      'action',
      'entity',
      'entityId',
      'actor',
      'actorEmail',
      'ipAddress',
      'oldValues',
      'newValues',
    ];
    const rows = logs.map((log) =>
      [
        log.createdAt.toISOString(),
        log.action,
        log.entity,
        log.entityId ?? '',
        log.user ? `${log.user.firstName} ${log.user.lastName}` : '',
        log.user?.email ?? '',
        log.ipAddress ?? '',
        JSON.stringify(log.oldValues ?? {}),
        JSON.stringify(log.newValues ?? {}),
      ]
        .map(escape)
        .join(','),
    );

    return [header.map(escape).join(','), ...rows].join('\n');
  }
}
