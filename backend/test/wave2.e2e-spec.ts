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

describe('Wave 2 e2e: assessments → progress → certificates → notifications', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  let trainerToken: string;
  let adminToken: string;
  let learnerToken: string;
  let learnerUserId: string;
  let assessmentId: string;
  let courseId: string;

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

    trainerToken = await login('trainer@gmail.com', 'password');
    adminToken = await login('sadministrator@gmail.com', 'password');
  });

  afterAll(async () => {
    if (assessmentId) {
      await prisma.assessmentAttempt.deleteMany({ where: { assessmentId } });
      await prisma.assessment.delete({ where: { id: assessmentId } });
    }
    if (learnerUserId) {
      await prisma.user.delete({ where: { id: learnerUserId } });
    }
    await app.close();
  });

  it('blocks unauthenticated access to Wave-2 endpoints', async () => {
    const [progress, certs, notifs] = await Promise.all([
      api('/progress/courses/x'),
      api('/certificates/me'),
      api('/notifications/me'),
    ]);
    expect([progress.status, certs.status, notifs.status]).toEqual([401, 401, 401]);
  });

  it('runs the full learner journey (enroll → quiz → complete → certificate)', async () => {
    // 1. Register a fresh learner (auto-activated per Wave 1 behaviour)
    const email = `wave2.e2e.${Date.now()}@mor.gov.et`;
    const reg = await api<{ user: { id: string } }>('/auth/register', {
      method: 'POST',
      body: {
        firstName: 'Wave',
        lastName: 'Two',
        email,
        password: 'password123',
        locale: 'en',
      },
    });
    expect(reg.status).toBe(201);
    learnerUserId = reg.data!.user.id;
    const approve = await api(`/users/${learnerUserId}/approve-registration`, {
      method: 'POST',
      token: adminToken,
    });
    expect(approve.status).toBe(201);
    learnerToken = await login(email, 'password123');

    // 2. Trainer finds a course with lessons
    const courses = await api<{ data: Array<{ id: string; status: string }> }>('/courses?limit=20', {
      token: trainerToken,
    });
    const list = courses.data!.data;
    const candidate = list.find((c) => c.status === 'PUBLISHED' || c.status === 'APPROVED');
    courseId = candidate?.id ?? list[0].id;
    const t = await api<{ modules: Array<{ lessons: Array<{ id: string }> }> }>(
      `/courses/${courseId}`,
      { token: trainerToken },
    );
    const modules = t.data!.modules;
    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    expect(lessonIds.length).toBeGreaterThan(0);

    // 3. Trainer creates an assessment; verify questions stored intact
    const created = await api<{ id: string }>(`/courses/${courseId}/assessments`, {
      method: 'POST',
      token: trainerToken,
      body: {
        titleEn: `E2E Quiz ${Date.now()}`,
        titleAm: 'ባለ ሙከራ ፈተና',
        passingScore: 60,
        maxAttempts: 2,
        questions: [
          { id: 'q1', type: 'mcq', question: '2+2?', options: ['3', '4', '5'], correctAnswer: 1 },
          { id: 'q2', type: 'mcq', question: 'Capital?', options: ['A', 'B'], correctAnswer: 1 },
        ],
      },
    });
    assessmentId = created.data!.id;

    const staffView = await api<{ questions: Array<{ correctAnswer: number }> }>(
      `/assessments/${assessmentId}?includeAnswers=true`,
      { token: trainerToken },
    );
    expect(staffView.data!.questions[0].correctAnswer).toBe(1);

    const learnerView = await api<{ questions: Array<Record<string, unknown>> }>(
      `/assessments/${assessmentId}`,
      { token: learnerToken },
    );
    expect(learnerView.data!.questions[0].correctAnswer).toBeUndefined();

    // 4. Learner enrols and takes the quiz
    const enroll = await api('/enrollments/self', {
      method: 'POST',
      token: learnerToken,
      body: { courseId },
    });
    expect([201, 202, 200]).toContain(enroll.status);

    const started = await api<{ attemptNumber: number }>(`/assessments/${assessmentId}/start`, {
      method: 'POST',
      token: learnerToken,
    });
    expect(started.data!.attemptNumber).toBe(1);

    const submitted = await api<{ score: number; passed: boolean }>(
      `/assessments/${assessmentId}/submit`,
      {
        method: 'POST',
        token: learnerToken,
        body: {
          answers: [
            { questionId: 'q1', selectedOption: 1 },
            { questionId: 'q2', selectedOption: 1 },
          ],
        },
      },
    );
    expect(submitted.data!.score).toBe(100);
    expect(submitted.data!.passed).toBe(true);

    // maxAttempts = 2 → starting a third attempt is forbidden after two submissions
    const second = await api<{ attemptNumber: number }>(`/assessments/${assessmentId}/start`, {
      method: 'POST',
      token: learnerToken,
    });
    expect(second.data!.attemptNumber).toBe(2);

    const secondSubmit = await api<{ score: number }>(`/assessments/${assessmentId}/submit`, {
      method: 'POST',
      token: learnerToken,
      body: {
        answers: [
          { questionId: 'q1', selectedOption: 0 },
          { questionId: 'q2', selectedOption: 0 },
        ],
      },
    });
    expect(secondSubmit.data!.score).toBe(0);

    const third = await api(`/assessments/${assessmentId}/start`, {
      method: 'POST',
      token: learnerToken,
    });
    expect([403, 400]).toContain(third.status);

    // 5. Complete every lesson → course 100% → certificate issues with PDF
    // Lessons are time-gated (must spend ≥50% of their configured duration
    // before they can be marked complete) — send heartbeats until satisfied.
    for (const lessonId of lessonIds) {
      let satisfied = false;
      for (let i = 0; i < 20 && !satisfied; i++) {
        const heartbeat = await api<{ satisfied: boolean }>(
          `/progress/lessons/${lessonId}/time`,
          { method: 'PATCH', token: learnerToken, body: { secondsDelta: 300 } },
        );
        satisfied = heartbeat.data?.satisfied ?? true;
      }

      const done = await api(`/progress/lessons/${lessonId}/complete`, {
        method: 'PATCH',
        token: learnerToken,
        body: { completed: true },
      });
      expect([200, 201]).toContain(done.status);
    }

    const progress = await api<{ stats: { overallPercent: number } }>(
      `/progress/courses/${courseId}`,
      { token: learnerToken },
    );
    expect(progress.data!.stats.overallPercent).toBe(100);

    const certs = await api<Array<{ certificateNumber: string; downloadUrl: string | null }>>(
      '/certificates/me',
      { token: learnerToken },
    );
    const cert = certs.data!.find((c) => c.downloadUrl);
    expect(cert).toBeDefined();
    expect(cert!.certificateNumber).toMatch(/^ELTMS-\d{4}-\d{6}$/);

    const pdfRes = await fetch(cert!.downloadUrl!);
    expect(pdfRes.ok).toBe(true);
    const pdfBytes = await pdfRes.arrayBuffer();
    const head = Buffer.from(pdfBytes.slice(0, 8)).toString('ascii');
    expect(head).toBe('%PDF-1.7');

    // 6. Enrollment is completed
    const mine = await api<{ data: Array<{ courseId: string; status: string }> }>(
      '/enrollments/me',
      { token: learnerToken },
    );
    const enrollment = mine.data!.data.find((e) => e.courseId === courseId);
    expect(enrollment?.status).toBe('COMPLETED');

    // 7. Notifications fired
    const notifs = await api<{ data: Array<{ type: string }> }>('/notifications/me?limit=20', {
      token: learnerToken,
    });
    const types = notifs.data!.data.map((n) => n.type);
    expect(types).toContain('ASSESSMENT_GRADED');
    expect(types).toContain('CERTIFICATE_ISSUED');

    // 8. Trainer sees per-learner progress
    const learners = await api<{ learners: Array<{ userId: string; progressPercent: number }> }>(
      `/progress/courses/${courseId}/learners`,
      { token: trainerToken },
    );
    const learnerRow = learners.data!.learners.find((l) => l.userId === learnerUserId);
    expect(learnerRow).toBeDefined();
    expect(learnerRow!.progressPercent).toBe(100);
  });
});