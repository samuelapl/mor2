import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, IS_OPTIONAL_AUTH_KEY, CURRENT_USER_KEY } from '@config/constants';
import type { AuthenticatedUser } from '@common/interfaces';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (this.isOptionalAuth(context)) {
      const request = context.switchToHttp().getRequest();
      if (!request.headers?.authorization) {
        return true;
      }
      // A bad or expired token on an optional route is treated as anonymous,
      // not rejected — handleRequest returns null instead of throwing.
      try {
        await super.canActivate(context);
      } catch {
        // fall through as anonymous
      }
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | null,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      if (this.isOptionalAuth(context)) {
        return null as TUser;
      }
      throw err instanceof Error ? err : new UnauthorizedException('Invalid or expired token');
    }
    // RolesGuard, @CurrentUser(), and all route handlers read the principal from
    // request[currentUserKey] — Passport only attaches it at req.user, so we
    // promote it here so role checks and current-user lookups work on every route.
    const request = context.switchToHttp().getRequest();
    const existing = request[CURRENT_USER_KEY] as AuthenticatedUser | undefined;
    if (existing?.permissions) {
      (user as unknown as AuthenticatedUser).permissions = existing.permissions;
    }
    request[CURRENT_USER_KEY] = user;
    return user;
  }

  private isOptionalAuth(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}
