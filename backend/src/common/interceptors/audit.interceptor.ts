import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap } from 'rxjs';
import { Request } from 'express';
import { CURRENT_USER_KEY } from '@config/constants';
import { AuditService } from '@modules/audit/audit.service';
import type { AuthenticatedUser } from '@common/interfaces';

const SKIP_PATHS = ['health', 'audit'];
// attendance `*:id/override` is audited inside the service (with oldValues)
const SKIP_OVERRIDES = true;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strip the IPv4-mapped IPv6 prefix (`::ffff:127.0.0.1` -> `127.0.0.1`) and
 * normalize the IPv6 loopback address so logged IPs are plain and readable. */
function normalizeIp(ip: string | undefined): string | undefined {
  if (!ip) return ip;
  if (ip === '::1') return '127.0.0.1';
  return ip.replace(/^::ffff:/, '');
}

function toActionBase(req: Request): string {
  const segments = req.path
    .replace(/^\/api\/v1\//, '')
    .split('/')
    .filter((s) => s && !UUID_RE.test(s))
    .map((s) => s.replace(/-/g, '_').toUpperCase());
  return segments.join('_');
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const rawPath = (req.path || '').replace(/^\/api\/v1\//, '');

    const isMutation = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);
    const shouldSkip =
      !isMutation ||
      SKIP_PATHS.some((p) => rawPath === p || rawPath.startsWith(`${p}/`)) ||
      (SKIP_OVERRIDES && rawPath.endsWith('/override'));

    if (shouldSkip) {
      return next.handle();
    }

    const actor = (req as Request & Record<string, unknown>)[CURRENT_USER_KEY] as
      AuthenticatedUser | undefined;
    const action = `${method}_${toActionBase(req)}`;

    const record = (success: boolean) => {
      const entity = rawPath.split('/')[0] || 'unknown';
      const params = req.params as Record<string, string>;
      const entityId = Object.values(params).find((v) => UUID_RE.test(v)) || null;

      this.auditService
        .record({
          userId: actor?.id,
          action: `${action}${success ? '' : '_FAILED'}`,
          entity,
          entityId: entityId ?? undefined,
          newValues: (req.body as Record<string, unknown>) ?? {},
          ipAddress: normalizeIp(req.ip),
          userAgent: req.headers['user-agent'],
        })
        .catch((err) => this.logger.error(`Failed to write audit log: ${err.message}`));
    };

    return next.handle().pipe(
      tap(() => record(true)),
      catchError((err) => {
        record(false);
        throw err;
      }),
    );
  }
}
