import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/config/prisma.service';
import { AppValidationPipe } from '../src/common/pipes';
import { AllExceptionsFilter } from '../src/common/filters';
import { TransformInterceptor } from '../src/common/interceptors';
import { AppModule } from '../src/app.module';

jest.setTimeout(90000);

interface ApiOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
}

describe('Account settings e2e: GET/PATCH /users/me, change-password', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let learnerUserId: string;
  let learnerEmail: string;
  let learnerToken: string;

  const api = async <T = Record<string, unknown>>(path: string, opts: ApiOpts = {}): Promise<{
    status: number;
    data?: T;
  }> => {
    const res = await fetch(`${base}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    let body: Record<string, unknown> | undefined;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }
    return { status: res.status, data: body?.data as T | undefined };
  };

  const login = async (email: string, password: string) => {
    const res = await api<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (!res.data?.accessToken) {
      // eslint-disable-next-line no-console
      console.error('LOGIN FAIL', JSON.stringify(res));
      throw new Error(`Login failed for ${email}`);
    }
    return res.data!.accessToken;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(AppValidationPipe);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address();
    base = `http://127.0.0.1:${address.port}/api/v1`;
    prisma = app.get(PrismaService);

    const adminToken = await login('sadministrator@gmail.com', 'password');

    learnerEmail = `account.settings.e2e.${Date.now()}@mor.gov.et`;
    const reg = await api<{ user: { id: string } }>('/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Account',
        lastName: 'Settings',
        email: learnerEmail,
        password: 'password123',
        phone: '+251911000001',
        locale: 'en',
      },
    });
    expect(reg.status).toBe(201);
    learnerUserId = reg.data!.user.id;
    await api(`/users/${learnerUserId}/approve-registration`, {
      method: 'POST',
      token: adminToken,
    });
    learnerToken = await login(learnerEmail, 'password123');
  });

  afterAll(async () => {
    if (learnerUserId) {
      await prisma.user.delete({ where: { id: learnerUserId } });
    }
    await app.close();
  });

  it('blocks unauthenticated access to GET/PATCH /users/me', async () => {
    const [get, patch] = await Promise.all([
      api('/users/me'),
      api('/users/me', { method: 'PATCH', body: { firstName: 'X' } }),
    ]);
    expect([get.status, patch.status]).toEqual([401, 401]);
  });

  it('updates the current user profile including TIN and returns it', async () => {
    const res = await api<{
      firstName: string;
      phone: string | null;
      tin: string | null;
      locale: string;
    }>('/users/me', {
      method: 'PATCH',
      token: learnerToken,
      body: { firstName: 'Updated', phone: '+251911000000', tin: '9000123456', locale: 'am' },
    });
    expect(res.status).toBe(200);
    expect(res.data!.firstName).toBe('Updated');
    expect(res.data!.phone).toBe('+251911000000');
    expect(res.data!.tin).toBe('9000123456');
    expect(res.data!.locale).toBe('am');

    const fetched = await api<{ lastName: string }>('/users/me', { token: learnerToken });
    expect(fetched.status).toBe(200);
    expect(fetched.data!.lastName).toBe('Settings');
  });

  it('rejects an invalid locale', async () => {
    const res = await api('/users/me', {
      method: 'PATCH',
      token: learnerToken,
      body: { locale: 'xx' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects a password change with the wrong current password', async () => {
    const res = await api('/users/me/change-password', {
      method: 'POST',
      token: learnerToken,
      body: { currentPassword: 'wrong-password', newPassword: 'NewPass123!' },
    });
    expect([400, 401, 403]).toContain(res.status);
  });

  it('changes the password and revokes existing sessions', async () => {
    const res = await api('/users/me/change-password', {
      method: 'POST',
      token: learnerToken,
      body: { currentPassword: 'password123', newPassword: 'NewPass123!' },
    });
    expect(res.status).toBe(201);

    const oldLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: learnerEmail, password: 'password123' },
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await api<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email: learnerEmail, password: 'NewPass123!' },
    });
    expect(newLogin.status).toBe(200);
  });
});
