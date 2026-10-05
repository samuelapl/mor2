import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CURRENT_USER_KEY } from '@config/constants';
import type { AuthenticatedUser } from '@common/interfaces';

/** Rate-limits per logged-in user when known, otherwise per client IP. */
@Injectable()
export class NewsThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req[CURRENT_USER_KEY] as AuthenticatedUser | null | undefined;
    return user?.id ?? req.ip;
  }
}
