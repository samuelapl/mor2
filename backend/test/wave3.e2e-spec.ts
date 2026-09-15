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
  headers?: Record<string, string>;
}

describe('Wave 3 e2e: live sessions → attendance → audit → health', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let trainerToken: string;
  let adminToken: string;
  let courseId: string;
  let sessionId: string;
  const learners: string[] = [];

  const api = async <T = Record<string, unknown>>(path: string, opts: ApiOpts = {}): Promise<{
    status: number;
    data?: T;
    text?: string;
  }> => {
    const res = await fetch(`${base}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(opts.headers ?? {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let body: Record<string, unknown> | undefined;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }
    return { status: res.status, data: body?.data as T | undefined, text };
  };

  const login = async (email: string, password: string) => {
    const res = await api<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (!res.data?.accessToken) {
      throw new Error(`Login failed for ${email}`);
    }
    return res.data!.accessToken;
  };

  const registerLearner = async () => {
    const email = `wave3.e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@mor.gov.et`;
    const reg = await api<{ user: { id: string } }>('/auth/register', {
      method: 'POST',
      body: { firstName: 'Wave', lastName: 'Three', email, password: 'password123', locale: 'en' },
    });
    expect(reg.status).toBe(201);
    // Public registrations start pending — approve as system admin before login.
    const approved = await api<{ user: { registrationStatus: string } }>(
      `/users/${reg.data!.user.id}/approve-registration`,
      { method: 'POST', token: adminToken },
    );
    expect(approved.status).toBe(201);
    expect(approved.data?.user.registrationStatus).toBe('APPROVED');
    const token = await login(email, 'password123');
    learners.push(reg.data!.user.id);
    return { id: reg.data!.user.id, token };
  };

  const pickPublishedCourse = async () => {
    const courses = await api<{ data: Array<{ id: string; status: string }> }>(
      '/courses?limit=30',
      { token: trainerToken },
    );
    const published = courses.data!.data.find((c) => c.status === 'PUBLISHED');
    if (!published) {
      throw new Error('No PUBLISHED course available for the live-session flow');
    }
    return published.id;
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

    trainerToken = await login('trainer@gmail.com', 'password');
    adminToken = await login('sadministrator@gmail.com', 'password');
    courseId = await pickPublishedCourse();
  });

  afterAll(async () => {
    if (sessionId) {
      await prisma.attendance.deleteMany({ where: { sessionId } });
      await prisma.liveSession.delete({ where: { id: sessionId } });
    }
    for (const userId of learners) {
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  it('public registration is pending until approved by a system admin', async () => {
    const email = `wave3.pending.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@mor.gov.et`;
    const reg = await api<{ user: { id: string; registrationStatus?: string } }>('/auth/register', {
      method: 'POST',
      body: { firstName: 'Pending', lastName: 'User', email, password: 'password123', locale: 'en' },
    });
    expect(reg.status).toBe(201);
    expect(reg.data!.user.registrationStatus).toBe('PENDING');
    learners.push(reg.data!.user.id);

    const blocked = await api('/auth/login', {
      method: 'POST',
      body: { email, password: 'password123' },
    });
    expect(blocked.status).toBe(401);
    expect(blocked.text).toContain('approval');

    const approved = await api<{ user: { registrationStatus: string } }>(
      `/users/${reg.data!.user.id}/approve-registration`,
      { method: 'POST', token: adminToken },
    );
    expect(approved.data?.user.registrationStatus).toBe('APPROVED');

    const loggedIn = await login(email, 'password123');
    expect(loggedIn.length).toBeGreaterThan(10);
  });

  it('blocks unauthenticated and unauthorized access', async () => {
    const [sessions, attendance, audit, health] = await Promise.all([
      api('/live-sessions'),
      api('/attendance/me'),
      api('/audit'),
      api('/health'),
    ]);
    expect([sessions.status, attendance.status, audit.status]).toEqual([401, 401, 401]);
    expect(health.status).toBe(200);
    expect(health.data).toHaveProperty('checks');
  });

  it('schedules a live session and exposes it to enrolled learners', async () => {
    const created = await api<{ id: string; status: string }>(
      `/courses/${courseId}/live-sessions`,
      {
        method: 'POST',
        token: trainerToken,
        body: {
          titleEn: `E2E Session ${Date.now()}`,
          titleAm: 'የሙከራ ስብሰባ',
          platform: 'GOOGLE_MEET',
          externalUrl: 'https://meet.google.com/test',
          scheduledAt: '2026-10-01T10:00:00.000Z',
          durationMinutes: 45,
        },
      },
    );
    expect(created.status).toBe(201);
    sessionId = created.data!.id;

    // Trainer (not only owner) can start the session → LIVE
    const started = await api<{ status: string }>(`/live-sessions/${sessionId}/status`, {
      method: 'PATCH',
      token: trainerToken,
      body: { status: 'LIVE' },
    });
    expect(started.data?.status).toBe('LIVE');

    // Learner self-enrolls → sees session in upcoming/me
    const learner = await registerLearner();
    const enroll = await api('/enrollments/self', {
      method: 'POST',
      token: learner.token,
      body: { courseId },
    });
    expect([200, 201, 202]).toContain(enroll.status);

    const upcoming = await api<{ data: Array<{ id: string }> }>('/live-sessions/upcoming/me', {
      token: learner.token,
    });
    expect(upcoming.data!.data.some((s) => s.id === sessionId)).toBe(true);
  });

  it('lets a learner self check-in, makes it immutable, and lets system-admin override it', async () => {
    const first = await registerLearner();
    await api('/enrollments/self', {
      method: 'POST',
      token: first.token,
      body: { courseId },
    });

    const checkin = await api<{
      id: string;
      status: string;
      checkInMethod: string;
    }>(`/attendance/checkin/${sessionId}`, {
      method: 'POST',
      token: first.token,
      headers: { 'Accept-Language': 'am' },
    });
    expect(checkin.status).toBe(201);
    expect(checkin.data!.status).toBe('PRESENT');
    expect(checkin.data!.checkInMethod).toBe('VIRTUAL');

    // Trainer cannot edit an immutable check-in record
    const trainerEdit = await api(`/attendance`, {
      method: 'POST',
      token: trainerToken,
      body: { sessionId, userId: first.id, status: 'LATE' },
    });
    expect(trainerEdit.status).toBe(400);

    // System-admin override + audit trail
    const override = await api<{ status: string }>(
      `/attendance/${checkin.data!.id}/override`,
      {
        method: 'POST',
        token: adminToken,
        body: { status: 'EXCUSED' },
      },
    );
    expect(override.status).toBe(201);
    expect(override.data!.status).toBe('EXCUSED');

    const audit = await api<{ byAction: Record<string, number> }>('/audit/stats', {
      token: adminToken,
    });
    expect(audit.data!.byAction.ATTENDANCE_OVERRIDE).toBeGreaterThanOrEqual(1);
  });

  it('lets a trainer mark attendance for a second learner and correct it, then audit export works', async () => {
    const second = await registerLearner();
    await api('/enrollments/self', {
      method: 'POST',
      token: second.token,
      body: { courseId },
    });

    const marked = await api('/attendance', {
      method: 'POST',
      token: trainerToken,
      body: { sessionId, userId: second.id, status: 'PRESENT' },
    });
    expect(marked.status).toBe(201);

    const corrected = await api('/attendance', {
      method: 'POST',
      token: trainerToken,
      body: { sessionId, userId: second.id, status: 'LATE' },
    });
    expect(corrected.status).toBe(201);
    expect(corrected.data! as { status?: string }).toMatchObject({ status: 'LATE' });

    // Summary reflects recording
    const summary = await api<{ totalRecorded: number; present: number }>(
      `/attendance/sessions/${sessionId}/summary`,
      { token: trainerToken },
    );
    expect(summary.data!.totalRecorded).toBeGreaterThanOrEqual(2);

    // My history for the learner
    const mine = await api<Array<{ sessionId: string }>>('/attendance/me', {
      token: second.token,
    });
    expect(mine.data!.some((r) => r.sessionId === sessionId)).toBe(true);

    // Audit list + CSV export (system admin only)
    const auditList = await api<{ data: Array<{ action: string }> }>(
      `/audit?entity=attendance&limit=10`,
      { token: adminToken },
    );
    expect(auditList.status).toBe(200);

    const csv = await api('/audit/export', { token: adminToken });
    expect(csv.data).toBeUndefined(); // raw CSV body, not enveloped
    expect(csv.text).toContain('action');
    expect(csv.text).toContain('attendance');

    // Non-system-admin is rejected
    const forbidden = await api('/audit', { token: trainerToken });
    expect([403, 401]).toContain(forbidden.status);
  });
});