import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { CacheService } from '@common/cache';

const CACHE_TTL_SECONDS = 15;
const PERMISSION_MANAGE_CODE = 'permission.manage';

function cacheKeyForRole(role: string): string {
  return `perm:role:${role}`;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /** Permission codes granted to a single role, cached with a ~15s TTL. */
  async getPermissionCodesForRole(role: RoleName): Promise<string[]> {
    return this.cacheService.getOrSet(
      cacheKeyForRole(role),
      async () => {
        const rows = await this.prisma.rolePermission.findMany({
          where: { role: { name: role } },
          include: { permission: true },
        });
        return rows.map((r) => r.permission.code);
      },
      CACHE_TTL_SECONDS,
    );
  }

  /** Union of permission codes across every role a user holds. */
  async effectivePermissions(roles: string[]): Promise<string[]> {
    const perRole = await Promise.all(
      roles.map((role) => this.getPermissionCodesForRole(role as RoleName)),
    );
    return Array.from(new Set(perRole.flat()));
  }

  async effectivePermissionsForUser(
    userId: string,
  ): Promise<{ userId: string; roles: string[]; permissions: string[] }> {
    const userRoles = await this.prisma.userRole.findMany({ where: { userId } });
    if (userRoles.length === 0) {
      throw new NotFoundException('User has no roles assigned');
    }
    const roles = userRoles.map((r) => r.role);
    const permissions = await this.effectivePermissions(roles);
    return { userId, roles, permissions };
  }

  /** Invalidate the cache after any grant/revoke — Phase 1 invalidates the whole role at once. */
  async invalidateRole(role: string): Promise<void> {
    await this.cacheService.del(cacheKeyForRole(role));
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
      description: r.description,
      dashboardPath: r.dashboardPath,
      isSystem: r.isSystem,
      permissionCodes: r.permissions.map((rp) => rp.permission.code),
    }));
  }

  async createRole(input: { name: string; label: string; description?: string }) {
    const name = input.name.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        label: input.label.trim(),
        description: input.description?.trim() || null,
        dashboardPath: '',
        isSystem: false,
      },
    });

    return { ...role, permissionCodes: [] as string[] };
  }

  async deleteRole(roleId: string) {
    const role = await this.getRoleOrThrow(roleId);
    if (role.isSystem) {
      throw new ForbiddenException('Built-in roles cannot be deleted.');
    }

    const holders = await this.prisma.userRole.count({ where: { role: role.name } });
    if (holders > 0) {
      throw new ConflictException(
        `${holders} user(s) still hold this role — remove it from them first.`,
      );
    }

    await this.prisma.role.delete({ where: { id: roleId } });
    await this.invalidateRole(role.name);
    return { message: 'Role deleted' };
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
      throw new ForbiddenException(
        'System Administrator permissions are locked and cannot be edited.',
      );
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
      throw new ForbiddenException(
        'System Administrator permissions are locked and cannot be edited.',
      );
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
