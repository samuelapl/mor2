import { SessionReschedulerService } from './session-rescheduler.service';

describe('SessionReschedulerService.handleSessionEnded with a session quiz', () => {
  let tx: any;
  let prisma: any;
  let grading: any;
  let service: SessionReschedulerService;
  const calls: string[] = [];

  const ended = {
    id: 'round-1',
    courseId: 'c1',
    sessionPlanId: 'p1',
    originalPlanId: null,
    plannedOrder: null,
    deletedAt: null,
    titleEn: 'Session 1',
    titleAm: null,
    descriptionEn: null,
    descriptionAm: null,
    objectivesEn: null,
    sessionType: 'VIRTUAL',
    platform: 'LIVEKIT',
    venueId: null,
    externalUrl: null,
    meetingId: null,
    meetingPassword: null,
    scheduledAt: new Date('2026-10-12T08:00:00Z'),
    durationMinutes: 60,
    trainerId: 't1',
    allowViewAttendance: false,
    attendanceThreshold: 60,
    course: { id: 'c1', status: 'PUBLISHED', title: 'VAT101', code: 'VAT101', deletedAt: null },
    sessionPlan: {
      order: 0,
      assessments: [{ id: 'quiz-1', titleEn: 'Session 1 quiz', timeLimitMinutes: 10 }],
    },
  };

  beforeEach(() => {
    calls.length = 0;
    tx = {
      liveSession: {
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'round-2' }),
      },
      sessionPreparedQuiz: {
        upsert: jest.fn(() => calls.push('move-quiz')),
        create: jest.fn(),
      },
      systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    prisma = {
      liveSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(ended),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: (t: any) => Promise<unknown>) => fn(tx)),
    };
    grading = { gradeSession: jest.fn(() => calls.push('grade')) };
    const resolver = { resolveNextValidWorkingDay: jest.fn((d: Date) => Promise.resolve(d)) };
    service = new SessionReschedulerService(prisma, resolver as any, grading, {
      schedule: jest.fn(),
    } as any);
  });

  it('moves the existing prepared quiz to the new round instead of creating a second one', async () => {
    await service.handleSessionEnded({
      sessionId: 'round-1',
      courseId: 'c1',
      sessionPlanId: 'p1',
      endedAt: new Date(),
    });

    expect(tx.liveSession.create).toHaveBeenCalled();
    expect(tx.sessionPreparedQuiz.create).not.toHaveBeenCalled();
    expect(tx.sessionPreparedQuiz.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assessmentId: 'quiz-1' },
        update: { sessionId: 'round-2', order: 0 },
      }),
    );
  });

  it('grades the ended round before its quiz moves on', async () => {
    await service.handleSessionEnded({
      sessionId: 'round-1',
      courseId: 'c1',
      sessionPlanId: 'p1',
      endedAt: new Date(),
    });
    expect(grading.gradeSession).toHaveBeenCalledWith('round-1');
    expect(calls).toEqual(['grade', 'move-quiz']);
  });
});
