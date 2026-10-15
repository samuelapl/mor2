import { Reflector } from '@nestjs/core';
import { AppThrottlerGuard } from './app-throttler.guard';
import { CURRENT_USER_KEY } from '@config/constants';

describe('AppThrottlerGuard', () => {
  let guard: AppThrottlerGuard;

  beforeEach(() => {
    const options = {
      throttlers: [{ name: 'default', ttl: 60000, limit: 120 }],
    };
    const storageService = {} as any;
    const reflector = new Reflector();
    guard = new AppThrottlerGuard(options as any, storageService, reflector);
  });

  describe('getTracker', () => {
    it('tracks by user ID when authenticated via CURRENT_USER_KEY', async () => {
      const req = {
        [CURRENT_USER_KEY]: { id: 'usr-123', email: 'test@example.com' },
        ip: '192.168.1.100',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('user_usr-123');
    });

    it('tracks by user ID when authenticated via req.user', async () => {
      const req = {
        user: { id: 'usr-456' },
        ip: '192.168.1.100',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('user_usr-456');
    });

    it('tracks by x-forwarded-for when client is behind a proxy', async () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        },
        ip: '10.0.0.1',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('ip_203.0.113.195');
    });

    it('tracks by req.ips when multiple IPs are present in express', async () => {
      const req = {
        ips: ['198.51.100.4', '10.0.0.1'],
        ip: '10.0.0.1',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('ip_198.51.100.4');
    });

    it('tracks by req.ip when no proxy header is set', async () => {
      const req = {
        ip: '192.0.2.1',
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('ip_192.0.2.1');
    });

    it('falls back to unknown_ip if no user or IP can be detected', async () => {
      const req = {};

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('ip_unknown_ip');
    });
  });
});

