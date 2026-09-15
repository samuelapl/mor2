import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, CURRENT_USER_KEY } from '@config/constants';
import type { AuthenticatedUser } from '@common/interfaces';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | null,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('Invalid or expired token');
    }
    // RolesGuard, @CurrentUser(), and all route handlers read the principal from
    // request[currentUserKey] — Passport only attaches it at req.user, so we
    // promote it here so role checks and current-user lookups work on every route.
    const request = context.switchToHttp().getRequest();
    request[CURRENT_USER_KEY] = user;
    return user;
  }
}
