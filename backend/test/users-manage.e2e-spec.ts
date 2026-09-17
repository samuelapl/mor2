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

describe('User management e2e: deactivate/reactivate, permission gating', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let adminToken: string;
  let learnerToken: string;
  let targetUserId: string;
  let targetEmail: string;

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

    adminToken = await login('sadministrator@gmail.com', 'password');
    learnerToken = await login('learner@gmail.com', 'password');

    targetEmail = `users.manage.e2e.${Date.now()}@mor.gov.et`;
    const reg = await api<{ user: { id: string } }>('/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Manage',
        lastName: 'Target',
        email: targetEmail,
        password: 'password123',
        phone: '+251911000002',
        locale: 'en',
      },
    });
    expect(reg.status).toBe(201);
    targetUserId = reg.data!.user.id;
    await api(`/users/${targetUserId}/approve-registration`, {
      method: 'POST',
      token: adminToken,
    });
  });

  afterAll(async () => {
    if (targetUserId) {
      await prisma.user.delete({ where: { id: targetUserId } });
    }
    await app.close();
  });

  it('blocks unauthenticated access to deactivate/reactivate/delete', async () => {
    const [deactivate, reactivate, remove] = await Promise.all([
      api(`/users/${targetUserId}/deactivate`, { method: 'POST' }),
      api(`/users/${targetUserId}/reactivate`, { method: 'POST' }),
      api(`/users/${targetUserId}`, { method: 'DELETE' }),
    ]);
    expect([deactivate.status, reactivate.status, remove.status]).toEqual([401, 401, 401]);
  });

  it('denies deactivate/reactivate/delete for an actor without user.manage', async () => {
    const [deactivate, reactivate, remove] = await Promise.all([
      api(`/users/${targetUserId}/deactivate`, { method: 'POST', token: learnerToken }),
      api(`/users/${targetUserId}/reactivate`, { method: 'POST', token: learnerToken }),
      api(`/users/${targetUserId}`, { method: 'DELETE', token: learnerToken }),
    ]);
    expect([deactivate.status, reactivate.status, remove.status]).toEqual([403, 403, 403]);
  });

  it('deactivates then reactivates a user, leaving registrationStatus untouched', async () => {
    const deactivate = await api<{ isActive: boolean; registrationStatus: string }>(
      `/users/${targetUserId}/deactivate`,
      { method: 'POST', token: adminToken },
    );
    expect(deactivate.status).toBe(201);

    const afterDeactivate = await api<{ isActive: boolean; registrationStatus: string }>(
      `/users/${targetUserId}`,
      { token: adminToken },
    );
    expect(afterDeactivate.data!.isActive).toBe(false);
    expect(afterDeactivate.data!.registrationStatus).toBe('APPROVED');

    const reactivate = await api(`/users/${targetUserId}/reactivate`, {
      method: 'POST',
      token: adminToken,
    });
    expect(reactivate.status).toBe(201);

    const afterReactivate = await api<{ isActive: boolean; registrationStatus: string }>(
      `/users/${targetUserId}`,
      { token: adminToken },
    );
    expect(afterReactivate.data!.isActive).toBe(true);
    expect(afterReactivate.data!.registrationStatus).toBe('APPROVED');
  });

  it('filters GET /users by registrationStatus=PENDING (regression)', async () => {
    const res = await api<{ data: Array<{ registrationStatus: string }> }>(
      '/users?registrationStatus=PENDING&limit=100',
      { token: adminToken },
    );
    expect(res.status).toBe(200);
    for (const user of res.data?.data ?? []) {
      expect(user.registrationStatus).toBe('PENDING');
    }
  });
});
