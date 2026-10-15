import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
import { PaginationQuery } from '@common/interfaces';

export interface AuditEntry {
  userId?: string;
  actorRole?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  reason?: string;
}

export function computeChangesDiff(
  oldVals?: Record<string, unknown> | null,
  newVals?: Record<string, unknown> | null,
): string {
  if (!oldVals && !newVals) return '-';
  const diffs: string[] = [];
  const keys = new Set([...Object.keys(oldVals || {}), ...Object.keys(newVals || {})]);
  for (const k of keys) {
    if (k === '_meta') continue;
    const oldV = oldVals ? (oldVals as Record<string, unknown>)[k] : undefined;
    const newV = newVals ? (newVals as Record<string, unknown>)[k] : undefined;
    if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
      const oldStr = oldV !== undefined ? JSON.stringify(oldV) : 'none';
      const newStr = newV !== undefined ? JSON.stringify(newV) : 'none';
      diffs.push(`${k}: ${oldStr} → ${newStr}`);
    }
  }
  return diffs.length > 0 ? diffs.join('; ') : '-';
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry) {
    const meta = {
      actorRole: entry.actorRole,
      outcome: entry.outcome || (entry.action.endsWith('_FAILED') ? 'FAILURE' : 'SUCCESS'),
      requestId: entry.requestId,
      reason: entry.reason,
    };
    const combinedNewValues = {
      ...(entry.newValues || {}),
      _meta: meta,
    };

    return this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValues: entry.oldValues as Prisma.InputJsonValue | undefined,
        newValues: combinedNewValues as Prisma.InputJsonValue | undefined,
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
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              roles: { select: { role: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const formatted = logs.map((log) => {
      const meta = (log.newValues as Record<string, unknown>)?._meta as
        | { actorRole?: string; outcome?: string; requestId?: string; reason?: string }
        | undefined;
      const userRoles = (log.user as any)?.roles as
        | Array<{ role?: string }>
        | undefined;
      const primaryRole = userRoles?.[0]?.role;
      const actorRole = meta?.actorRole || primaryRole || 'SYSTEM';
      const outcome = meta?.outcome || (log.action.endsWith('_FAILED') ? 'FAILURE' : 'SUCCESS');
      const resource = `${log.entity}${log.entityId ? `_${log.entityId.slice(0, 8)}` : ''}`;
      const source =
        [log.ipAddress, log.userAgent ? log.userAgent.slice(0, 40) : undefined, meta?.requestId]
          .filter(Boolean)
          .join(', ') || 'Direct';
      const reason = meta?.reason || (outcome === 'FAILURE' ? 'Operation failed' : '');
      const changes = computeChangesDiff(
        log.oldValues as Record<string, unknown> | null,
        log.newValues as Record<string, unknown> | null,
      );

      return {
        ...log,
        actor: log.user ? `${log.user.firstName} ${log.user.lastName}` : (log.userId || 'SYSTEM'),
        actorRole,
        outcome,
        resource,
        source,
        reason,
        changes,
        timestampUtc: log.createdAt.toISOString(),
      };
    });

    return buildPaginatedResponse(formatted, total, page, limit);
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
      'Timestamp (UTC)',
      'Actor',
      'Actor Role',
      'Action',
      'Resource',
      'Outcome',
      'Changes',
      'Source',
      'Reason',
    ];
    const rows = logs.map((log) => {
      const meta = (log.newValues as Record<string, unknown>)?._meta as
        | { actorRole?: string; outcome?: string; requestId?: string; reason?: string }
        | undefined;
      const actor = log.user
        ? `${log.user.firstName} ${log.user.lastName}`
        : (log.userId || 'SYSTEM');
      const actorRole = meta?.actorRole || 'SYSTEM';
      const outcome = meta?.outcome || (log.action.endsWith('_FAILED') ? 'FAILURE' : 'SUCCESS');
      const resource = `${log.entity}${log.entityId ? `_${log.entityId}` : ''}`;
      const changes = computeChangesDiff(
        log.oldValues as Record<string, unknown> | null,
        log.newValues as Record<string, unknown> | null,
      );
      const source =
        [log.ipAddress, meta?.requestId].filter(Boolean).join(' | ') || 'Direct';
      const reason = meta?.reason || (outcome === 'FAILURE' ? 'Operation failed' : '');

      return [
        log.createdAt.toISOString(),
        actor,
        actorRole,
        log.action,
        resource,
        outcome,
        changes,
        source,
        reason,
      ]
        .map(escape)
        .join(',');
    });

    return [header.map(escape).join(','), ...rows].join('\n');
  }

  async update(id: string, dto: { reason?: string; action?: string }) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log entry ${id} not found`);
    }

    const currentNew = (log.newValues as Record<string, unknown>) || {};
    const currentMeta = (currentNew._meta as Record<string, unknown>) || {};

    const updatedNew = {
      ...currentNew,
      _meta: {
        ...currentMeta,
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
      },
    };

    return this.prisma.auditLog.update({
      where: { id },
      data: {
        ...(dto.action ? { action: dto.action } : {}),
        newValues: updatedNew,
      },
    });
  }

  async remove(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log entry ${id} not found`);
    }
    await this.prisma.auditLog.delete({ where: { id } });
    return { success: true, deletedId: id };
  }
}
