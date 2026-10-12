import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionPlansService } from './session-plans.service';

describe('SessionPlansService.replaceAll', () => {
  let service: SessionPlansService;
  let tx: any;
  let prisma: any;
  const course = (overrides: Record<string, unknown> = {}) => ({
    id: 'c1',
    status: 'DRAFT',
    deliveryMode: 'ONLINE_ONLY',
    deletedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    tx = {
      courseSessionPlan: { deleteMany: jest.fn(), create: jest.fn() },
      course: { update: jest.fn() },
    };
    prisma = {
      course: { findUnique: jest.fn().mockResolvedValue(course()) },
      courseSessionPlan: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: (t: any) => Promise<unknown>) => fn(tx)),
    };
    service = new SessionPlansService(prisma);
  });

  const twoSessions = {
    plans: [
      // An older client may still send weight / passingScore; both are ignored.
      { titleEn: 'Kick-off', quizzes: [{ titleEn: 'Q1', weight: 10, passingScore: 70 }] },
      { titleEn: 'Wrap-up', quizzes: [] },
    ],
  };

  it('replaces every plan and creates formative SESSION_ASSESSMENT quizzes (no weight, no pass mark)', async () => {
    await service.replaceAll('c1', twoSessions);

    expect(tx.courseSessionPlan.deleteMany).toHaveBeenCalledWith({ where: { courseId: 'c1' } });
    expect(tx.courseSessionPlan.create).toHaveBeenCalledTimes(2);
    const first = tx.courseSessionPlan.create.mock.calls[0][0].data;
    expect(first.order).toBe(0);
    expect(first.assessments.create[0]).toMatchObject({
      type: 'SESSION_ASSESSMENT',
      weight: 0,
      passingScore: 0,
      questions: [],
    });
    expect(tx.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { hasOnlineSessions: true },
    });
  });

  it('clears the toggle when every plan is removed', async () => {
    await service.replaceAll('c1', { plans: [] });
    expect(tx.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { hasOnlineSessions: false },
    });
  });

  it('refuses edits once the course has left preparation', async () => {
    prisma.course.findUnique.mockResolvedValue(course({ status: 'APPROVED' }));
    await expect(service.replaceAll('c1', twoSessions)).rejects.toThrow(ForbiddenException);
  });

  it('refuses planned sessions on a course that is not Online Self-Paced', async () => {
    prisma.course.findUnique.mockResolvedValue(course({ deliveryMode: 'BOTH' }));
    await expect(service.replaceAll('c1', twoSessions)).rejects.toThrow(BadRequestException);
    // ...but removing them is always allowed
    await expect(service.replaceAll('c1', { plans: [] })).resolves.toEqual([]);
  });
});

describe('SessionPlansService after approval', () => {
  let service: SessionPlansService;
  let tx: any;
  let prisma: any;
  const planRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'p1',
    courseId: 'c1',
    course: { status: 'APPROVED' },
    assessments: [{ id: 'a1', _count: { attempts: 0 } }],
    liveSession: null,
    ...overrides,
  });

  beforeEach(() => {
    tx = {
      liveSession: { update: jest.fn() },
      courseSessionPlan: { delete: jest.fn(), count: jest.fn().mockResolvedValue(1) },
      course: { update: jest.fn() },
      assessment: {
        findUnique: jest.fn().mockResolvedValue({ courseId: 'c1', type: 'SESSION_ASSESSMENT' }),
        update: jest.fn(),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'final', type: 'FINAL_ASSESSMENT', weight: 50 }),
        create: jest.fn().mockResolvedValue({ id: 'new', titleEn: 'Extra', timeLimitMinutes: 10 }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ weight: 100, questions: [], type: 'SESSION_ASSESSMENT' }]),
      },
      sessionPreparedQuiz: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    };
    prisma = {
      courseSessionPlan: {
        findUnique: jest.fn().mockResolvedValue(planRow()),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((fn: (t: any) => Promise<unknown>) => fn(tx)),
    };
    service = new SessionPlansService(prisma);
  });

  it('removes the plan and deletes the scheduled session in one transaction, without touching weights', async () => {
    await service.removePlan('c1', 'p1', 'session-1');
    expect(tx.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'session-1' } }),
    );
    expect(tx.courseSessionPlan.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(tx.assessment.update).not.toHaveBeenCalled();
  });

  it('clears the online-sessions flag when the last plan goes', async () => {
    tx.courseSessionPlan.count.mockResolvedValue(0);
    await service.removePlan('c1', 'p1');
    expect(tx.course.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { hasOnlineSessions: false },
    });
  });

  it('refuses to remove a session whose quiz already has results', async () => {
    prisma.courseSessionPlan.findUnique.mockResolvedValue(
      planRow({ assessments: [{ id: 'a1', _count: { attempts: 3 } }] }),
    );
    await expect(service.removePlan('c1', 'p1')).rejects.toThrow(ForbiddenException);
  });

  it('refuses a plan of another course', async () => {
    prisma.courseSessionPlan.findUnique.mockResolvedValue(planRow({ courseId: 'other' }));
    await expect(service.removePlan('c1', 'p1')).rejects.toThrow(NotFoundException);
  });

  it('adds a formative quiz to a scheduled session together with its linked prepared quiz', async () => {
    prisma.courseSessionPlan.findUnique.mockResolvedValue(
      planRow({ liveSession: { id: 'session-1' } }),
    );
    await service.addQuiz('c1', 'p1', {
      titleEn: 'Extra',
      weight: 5, // ignored
      rebalance: [{ assessmentId: 'a1', weight: 5 }], // ignored
    });
    expect(tx.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'SESSION_ASSESSMENT', weight: 0, passingScore: 0 }),
      }),
    );
    expect(tx.assessment.update).not.toHaveBeenCalled();
    expect(tx.sessionPreparedQuiz.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: 'session-1', assessmentId: 'new' }),
    });
  });

  it('refuses to add a quiz while the course is still being prepared', async () => {
    prisma.courseSessionPlan.findUnique.mockResolvedValue(planRow({ course: { status: 'DRAFT' } }));
    await expect(service.addQuiz('c1', 'p1', { titleEn: 'Extra' })).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('SessionPlansService.assignTrainer', () => {
  let service: SessionPlansService;
  let tx: any;
  let prisma: any;

  const setup = (
    liveSession: Record<string, unknown> | null,
    trainer: unknown = { isActive: true, deletedAt: null },
  ) => {
    tx = {
      courseSessionPlan: { update: jest.fn() },
      trainerAssignment: { upsert: jest.fn() },
      liveSession: { update: jest.fn() },
    };
    prisma = {
      courseSessionPlan: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', courseId: 'c1', liveSession }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findUnique: jest.fn().mockResolvedValue(trainer) },
      $transaction: jest.fn((fn: (t: any) => Promise<unknown>) => fn(tx)),
    };
    service = new SessionPlansService(prisma);
  };

  it('assigns an unscheduled plan and makes the trainer a course trainer', async () => {
    setup(null);
    await service.assignTrainer('c1', 'p1', 't1');
    expect(tx.courseSessionPlan.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { trainerId: 't1' },
    });
    expect(tx.trainerAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { courseId: 'c1', userId: 't1' } }),
    );
    expect(tx.liveSession.update).not.toHaveBeenCalled();
  });

  it('moves a scheduled, not yet held session to the new trainer', async () => {
    setup({ id: 's1', status: 'SCHEDULED', deletedAt: null });
    await service.assignTrainer('c1', 'p1', 't2');
    expect(tx.liveSession.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { trainerId: 't2' },
    });
  });

  it('leaves a completed session with the trainer who ran it', async () => {
    setup({ id: 's1', status: 'COMPLETED', deletedAt: null });
    await service.assignTrainer('c1', 'p1', 't2');
    expect(tx.liveSession.update).not.toHaveBeenCalled();
  });

  it('clears the plan trainer with null', async () => {
    setup(null);
    await service.assignTrainer('c1', 'p1', null);
    expect(tx.courseSessionPlan.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { trainerId: null },
    });
    expect(tx.trainerAssignment.upsert).not.toHaveBeenCalled();
  });

  it('rejects an inactive trainer', async () => {
    setup(null, { isActive: false, deletedAt: null });
    await expect(service.assignTrainer('c1', 'p1', 't1')).rejects.toThrow(BadRequestException);
  });

  it('rejects a plan of another course', async () => {
    setup(null);
    await expect(service.assignTrainer('other', 'p1', 't1')).rejects.toThrow(NotFoundException);
  });
});
