import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CURRENT_USER_KEY } from '@config/constants';
import type { AuthenticatedUser } from '@common/interfaces';

/**
 * Global rate-limiting guard.
 * Tracks requests per authenticated user ID when logged in, or by client IP for anonymous traffic.
 * This prevents entire organizations or campuses sharing a NAT gateway from being mutually throttled.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = (req[CURRENT_USER_KEY] ?? req.user) as AuthenticatedUser | null | undefined;
    if (user?.id) {
      return `user_${user.id}`;
    }

    const forwarded = req.headers?.['x-forwarded-for'];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.toString().split(',')[0]?.trim()) ||
      req.ips?.[0] ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown_ip';

    return `ip_${clientIp}`;
  }
}

