import { SessionQuizResultsService } from './session-quiz-results.service';

describe('SessionQuizResultsService for a held round whose quiz moved to a later round', () => {
  const keyed = [1, 2, 3, 4, 5].map((n) => ({
    id: `q${n}`,
    type: 'MULTIPLE_CHOICE',
    question: `Question ${n}`,
    options: ['A', 'B'],
    correctAnswer: 0,
    points: 2,
  }));

  const prisma: any = {
    liveSession: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'round-1',
        titleEn: 'Session 1',
        status: 'COMPLETED',
        courseId: 'c1',
        // The weighted quiz moved on; only an empty, never-used group is left.
        preparedQuizzes: [
          { id: 'empty', title: 'Quiz 1', assessmentId: null, assessment: null, questions: [] },
        ],
      }),
    },
    attendanceLog: {
      findMany: jest.fn().mockResolvedValue(
        ['q1', 'q2', 'q3', 'q4'].map((questionId, i) => ({
          userId: 'u1',
          timestamp: new Date(),
          metadata: { questionId, isCorrect: i < 4, selectedOptionIds: ['0'] },
        })),
      ),
    },
    assessmentAttempt: {
      findMany: jest
        .fn()
        // 1st call: weighted quizzes this round graded; 2nd: the learners' recorded results.
        .mockResolvedValueOnce([{ assessmentId: 'quiz-1' }])
        .mockResolvedValueOnce([
          {
            assessmentId: 'quiz-1',
            userId: 'u1',
            score: 80,
            passed: true,
            answers: { source: 'LIVE_SESSION', sessionId: 'round-1' },
          },
        ]),
    },
    assessment: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: 'quiz-1',
            titleEn: 'Session 1 quiz',
            weight: 10,
            passingScore: 70,
            questions: keyed,
          },
        ]),
    },
    questionBankQuestion: { findMany: jest.fn().mockResolvedValue([]) },
    enrollment: { findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }]) },
    user: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'u1', firstName: 'A', lastName: 'B', email: 'a@b.c' }]),
    },
    attendance: { findMany: jest.fn().mockResolvedValue([{ userId: 'u1', status: 'PRESENT' }]) },
  };

  it('rebuilds the graded quiz with the per-question points, not the bank default', async () => {
    const results = await new SessionQuizResultsService(prisma).forStaff('round-1');

    expect(results.quizzes.map((q) => q.title)).toEqual(['Session 1 quiz']); // empty group hidden
    const quiz = results.quizzes[0]!;
    expect(quiz.graded).toBe(true);
    expect(quiz.questions.map((q) => q.points)).toEqual([2, 2, 2, 2, 2]);
    expect(quiz.questions[0]!.correctAnswer).toBe('A');

    const mine = results.learners[0]!.quizzes[0]!;
    expect(mine).toMatchObject({ earnedPoints: 8, totalPoints: 10, scorePercent: 80 });
    expect(mine.recorded).toEqual({ score: 80, passed: true });
  });
});
