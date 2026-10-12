import { SessionQuizGradingService } from './session-quiz-grading.service';

describe('SessionQuizGradingService.gradeSession', () => {
  let prisma: any;
  let progress: any;
  let service: SessionQuizGradingService;

  const session = {
    courseId: 'c1',
    preparedQuizzes: [
      {
        assessmentId: 'a1',
        questions: [
          { questionId: 'q1', question: { points: 10 } },
          { questionId: 'q2', question: { points: 10 } },
        ],
      },
    ],
  };
  const log = (userId: string, questionId: string, isCorrect: boolean) => ({
    userId,
    metadata: { questionId, isCorrect },
  });

  beforeEach(() => {
    prisma = {
      liveSession: { findUnique: jest.fn().mockResolvedValue(session) },
      enrollment: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { userId: 'full' },
            { userId: 'half' },
            { userId: 'silent' },
            { userId: 'absent' },
          ]),
      },
      // 'silent' attended without answering; 'absent' was not in this round.
      attendance: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'full' }, { userId: 'silent' }]),
      },
      attendanceLog: {
        findMany: jest.fn().mockResolvedValue([
          log('full', 'q1', true),
          log('full', 'q2', true),
          log('half', 'q1', false),
          log('half', 'q1', true), // latest answer wins
          log('half', 'q2', false),
        ]),
      },
      assessmentAttempt: {
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn((x) => ({ op: 'delete', x })),
        create: jest.fn((x) => ({ op: 'create', x })),
      },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };
    progress = { maybeCompleteCourse: jest.fn().mockResolvedValue(undefined) };
    service = new SessionQuizGradingService(prisma, progress);
  });

  const created = () => prisma.assessmentAttempt.create.mock.calls.map(([arg]: any[]) => arg.data);

  it('scores learners in the session from their latest answers; attending without answering is 0', async () => {
    await service.gradeSession('s1');

    const byUser = Object.fromEntries(created().map((d: any) => [d.userId, d]));
    // Formative: the score is feedback only, never "passed".
    expect(byUser.full).toMatchObject({ assessmentId: 'a1', score: 100, passed: false });
    expect(byUser.half).toMatchObject({ score: 50, passed: false });
    expect(byUser.silent).toMatchObject({ score: 0, passed: false });
    expect(byUser.silent.answers).toMatchObject({ missed: true, sessionId: 's1' });
  });

  it('leaves learners who were not in this round alone (their earlier round result stays)', async () => {
    await service.gradeSession('s1');
    expect(created().map((d: any) => d.userId)).not.toContain('absent');
    expect(prisma.assessmentAttempt.deleteMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'absent' }) }),
    );
  });

  it("replaces only this session's earlier result, so grading can be re-run", async () => {
    await service.gradeSession('s1');
    expect(prisma.assessmentAttempt.deleteMany).toHaveBeenCalledWith({
      where: { assessmentId: 'a1', userId: 'full', answers: { path: ['sessionId'], equals: 's1' } },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('numbers the attempt after results from other rounds', async () => {
    prisma.assessmentAttempt.count.mockResolvedValue(1);
    await service.gradeSession('s1');
    expect(created()[0]).toMatchObject({ attemptNumber: 2 });
  });

  it('re-checks course completion for the learners it graded', async () => {
    await service.gradeSession('s1');
    expect(progress.maybeCompleteCourse).toHaveBeenCalledTimes(3);
    expect(progress.maybeCompleteCourse).not.toHaveBeenCalledWith('absent', 'c1');
  });

  it('records no scores for a session without quizzes, but still checks completion (attendance counts)', async () => {
    prisma.liveSession.findUnique.mockResolvedValue({ courseId: 'c1', preparedQuizzes: [] });
    await expect(service.gradeSession('s1')).resolves.toEqual({ quizzes: 0, learners: 3 });
    expect(prisma.assessmentAttempt.create).not.toHaveBeenCalled();
    expect(progress.maybeCompleteCourse).toHaveBeenCalledWith('full', 'c1');
    expect(progress.maybeCompleteCourse).not.toHaveBeenCalledWith('absent', 'c1');
  });

  it('does nothing for an unknown session', async () => {
    prisma.liveSession.findUnique.mockResolvedValue(null);
    await expect(service.gradeSession('s1')).resolves.toEqual({ quizzes: 0, learners: 0 });
    expect(progress.maybeCompleteCourse).not.toHaveBeenCalled();
  });
});
