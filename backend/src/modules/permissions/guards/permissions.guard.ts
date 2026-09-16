import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { PERMISSIONS_KEY, IS_PUBLIC_KEY, CURRENT_USER_KEY } from '@config/constants';
import { AuthenticatedUser } from '@common/interfaces';
import { PermissionsService } from '../permissions.service';

// Runs in parallel with RolesGuard (not a replacement) — see ROLE-PERMISSION-SPEC.md §7.1.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request[CURRENT_USER_KEY];

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN has access to everything
    if (user.roles.includes(RoleName.SYSTEM_ADMIN)) {
      return true;
    }

    const effective = await this.permissionsService.effectivePermissions(user.roles);
    return requiredPermissions.some((code) => effective.includes(code));
  }
}
