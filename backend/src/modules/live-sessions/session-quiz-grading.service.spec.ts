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
        assessment: { passingScore: 60 },
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
          .mockResolvedValue([{ userId: 'full' }, { userId: 'half' }, { userId: 'absent' }]),
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
        deleteMany: jest.fn((x) => ({ op: 'delete', x })),
        create: jest.fn((x) => ({ op: 'create', x })),
      },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };
    progress = { maybeCompleteCourse: jest.fn().mockResolvedValue(undefined) };
    service = new SessionQuizGradingService(prisma, progress);
  });

  const created = () => prisma.assessmentAttempt.create.mock.calls.map(([arg]: any[]) => arg.data);

  it('scores each learner from their latest answers and records a missed quiz as 0', async () => {
    await service.gradeSession('s1');

    const byUser = Object.fromEntries(created().map((d: any) => [d.userId, d]));
    expect(byUser.full).toMatchObject({ assessmentId: 'a1', score: 100, passed: true });
    expect(byUser.half).toMatchObject({ score: 50, passed: false });
    expect(byUser.absent).toMatchObject({ score: 0, passed: false });
    expect(byUser.absent.answers).toMatchObject({ missed: true });
  });

  it('replaces any earlier result, so grading can be re-run', async () => {
    await service.gradeSession('s1');
    expect(prisma.assessmentAttempt.deleteMany).toHaveBeenCalledWith({
      where: { assessmentId: 'a1', userId: 'full' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('re-checks course completion for every learner afterwards', async () => {
    await service.gradeSession('s1');
    expect(progress.maybeCompleteCourse).toHaveBeenCalledTimes(3);
    expect(progress.maybeCompleteCourse).toHaveBeenCalledWith('absent', 'c1');
  });

  it('does nothing for a session without weighted quizzes', async () => {
    prisma.liveSession.findUnique.mockResolvedValue({ courseId: 'c1', preparedQuizzes: [] });
    await expect(service.gradeSession('s1')).resolves.toEqual({ quizzes: 0, learners: 0 });
    expect(prisma.assessmentAttempt.create).not.toHaveBeenCalled();
  });
});
