import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RoleName } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { RedisConfig } from '@config/app.config';

const CACHE_TTL_SECONDS = 15;
const PERMISSION_MANAGE_CODE = 'permission.manage';

function cacheKeyForRole(role: string): string {
  return `perm:role:${role}`;
}

@Injectable()
export class PermissionsService implements OnModuleDestroy {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    // Best-effort cache: every read falls back to the DB on any Redis error,
    // so permission correctness never depends on Redis being up.
    this.redis = new Redis({
      host: RedisConfig.host,
      port: RedisConfig.port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => undefined);
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }

  private async ensureConnected(): Promise<void> {
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      await this.redis.connect();
    }
  }

  private async getCachedRolePermissions(role: string): Promise<string[] | null> {
    try {
      await this.ensureConnected();
      const raw = await this.redis.get(cacheKeyForRole(role));
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch (err) {
      this.logger.debug(`Permission cache read failed for role ${role}: ${err}`);
      return null;
    }
  }

  private async setCachedRolePermissions(role: string, codes: string[]): Promise<void> {
    try {
      await this.ensureConnected();
      await this.redis.set(cacheKeyForRole(role), JSON.stringify(codes), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.debug(`Permission cache write failed for role ${role}: ${err}`);
    }
  }

  /** Permission codes granted to a single role, cached with a ~15s TTL. */
  async getPermissionCodesForRole(role: RoleName): Promise<string[]> {
    const cached = await this.getCachedRolePermissions(role);
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.rolePermission.findMany({
      where: { role: { name: role } },
      include: { permission: true },
    });
    const codes = rows.map((r) => r.permission.code);
    await this.setCachedRolePermissions(role, codes);
    return codes;
  }

  /** Union of permission codes across every role a user holds. */
  async effectivePermissions(roles: string[]): Promise<string[]> {
    const perRole = await Promise.all(
      roles.map((role) => this.getPermissionCodesForRole(role as RoleName)),
    );
    return Array.from(new Set(perRole.flat()));
  }

  async effectivePermissionsForUser(userId: string): Promise<{ userId: string; roles: string[]; permissions: string[] }> {
    const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
    if (userRoles.length === 0) {
      throw new NotFoundException('User has no roles assigned');
    }
    const roles = userRoles.map((r) => r.role);
    const permissions = await this.effectivePermissions(roles);
    return { userId, roles, permissions };
  }

  /** Invalidate the cache after any grant/revoke — Phase 1 invalidates the whole role at once. */
  async invalidateRole(role: RoleName): Promise<void> {
    try {
      await this.ensureConnected();
      await this.redis.del(cacheKeyForRole(role));
    } catch (err) {
      this.logger.debug(`Permission cache invalidation failed for role ${role}: ${err}`);
    }
  }

  async listPermissionsGroupedByResource(): Promise<Record<string, unknown[]>> {
    const all = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    const grouped: Record<string, unknown[]> = {};
    for (const p of all) {
      (grouped[p.resource] ??= []).push(p);
    }
    return grouped;
  }

  async listRolesWithPermissions() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { permissions: { include: { permission: true } } },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label,
      dashboardPath: r.dashboardPath,
      isSystem: r.isSystem,
      permissionCodes: r.permissions.map((rp) => rp.permission.code),
    }));
  }

  private async getRoleOrThrow(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  /** Reject any save that would leave zero roles holding permission.manage (admin lock-out protection). */
  private async assertNotLockingOutPermissionManage(roleId: string, nextPermissionIds: string[]) {
    const permissionManage = await this.prisma.permission.findUnique({
      where: { code: PERMISSION_MANAGE_CODE },
    });
    if (!permissionManage) {
      return; // registry not seeded yet — nothing to protect
    }
    if (nextPermissionIds.includes(permissionManage.id)) {
      return; // this role keeps it
    }
    const otherHolders = await this.prisma.rolePermission.count({
      where: { permissionId: permissionManage.id, roleId: { not: roleId } },
    });
    if (otherHolders === 0) {
      throw new ForbiddenException(
        'Cannot remove the last role holding permission.manage — this would lock everyone out of the permission matrix.',
      );
    }
  }

  async setRolePermissions(roleId: string, permissionIds: string[]) {
    const role = await this.getRoleOrThrow(roleId);
    if (role.name === RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('System Administrator permissions are locked and cannot be edited.');
    }

    await this.assertNotLockingOutPermissionManage(roleId, permissionIds);

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);

    await this.invalidateRole(role.name);
    return this.listRolesWithPermissions().then((roles) => roles.find((r) => r.id === roleId));
  }

  async revokeRolePermission(roleId: string, permissionId: string) {
    const role = await this.getRoleOrThrow(roleId);
    if (role.name === RoleName.SYSTEM_ADMIN) {
      throw new ForbiddenException('System Administrator permissions are locked and cannot be edited.');
    }

    const current = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const remaining = current.map((c) => c.permissionId).filter((id) => id !== permissionId);
    await this.assertNotLockingOutPermissionManage(roleId, remaining);

    await this.prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
    await this.invalidateRole(role.name);
    return this.listRolesWithPermissions().then((roles) => roles.find((r) => r.id === roleId));
  }
}
