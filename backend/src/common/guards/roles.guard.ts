import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { ROLES_KEY, IS_PUBLIC_KEY, CURRENT_USER_KEY } from '@config/constants';
import { AuthenticatedUser } from '@common/interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
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

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
