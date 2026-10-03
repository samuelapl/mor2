import { Injectable, Logger } from '@nestjs/common';
import { EnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { ProgressService } from '@modules/progress/progress.service';

interface QuizResponseMeta {
  questionId?: string;
  isCorrect?: boolean;
  score?: number;
}

/**
 * Turns live answers into graded results. Learners answer session quizzes one question at a
 * time (logged as QUIZ_RESPONSE in attendanceLog); when the session ends, every weighted quiz
 * becomes one AssessmentAttempt per enrolled learner, so it counts in the course grade like
 * any other assessment. A learner with no answers is recorded as 0 (a missed quiz).
 */
@Injectable()
export class SessionQuizGradingService {
  private readonly logger = new Logger(SessionQuizGradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  /** Idempotent: re-grading replaces the previous result for each learner. */
  async gradeSession(sessionId: string): Promise<{ quizzes: number; learners: number }> {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: {
        courseId: true,
        preparedQuizzes: {
          where: { assessmentId: { not: null } },
          select: {
            assessmentId: true,
            assessment: { select: { passingScore: true } },
            questions: { select: { questionId: true, points: true } },
          },
        },
      },
    });
    if (!session || session.preparedQuizzes.length === 0) return { quizzes: 0, learners: 0 };

    const [enrollments, logs] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          courseId: session.courseId,
          status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
        },
        select: { userId: true },
      }),
      this.prisma.attendanceLog.findMany({
        where: { sessionId, eventType: 'QUIZ_RESPONSE' },
        orderBy: { timestamp: 'asc' },
        select: { userId: true, metadata: true },
      }),
    ]);

    // Latest answer per learner per question (a learner may re-submit before the reveal).
    const latest = new Map<string, Map<string, QuizResponseMeta>>();
    for (const log of logs) {
      const meta = (log.metadata ?? {}) as QuizResponseMeta;
      if (!meta.questionId) continue;
      if (!latest.has(log.userId)) latest.set(log.userId, new Map());
      latest.get(log.userId)!.set(meta.questionId, meta);
    }

    const now = new Date();
    for (const quiz of session.preparedQuizzes) {
      // Trainer-set points per question. If none were assigned, every question counts the same
      // rather than everyone scoring 0.
      const allZero = quiz.questions.every((q) => !q.points);
      const pointsOf = (q: { points: number }) => (allZero ? 1 : q.points);
      const totalPoints = quiz.questions.reduce((sum, q) => sum + pointsOf(q), 0);
      const passingScore = quiz.assessment?.passingScore ?? 0;

      for (const { userId } of enrollments) {
        const answers = latest.get(userId);
        const answered = quiz.questions.filter((q) => answers?.has(q.questionId));
        const earned = answered.reduce(
          (sum, q) => sum + (answers!.get(q.questionId)!.isCorrect ? pointsOf(q) : 0),
          0,
        );
        const score = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;
        const missed = answered.length === 0;

        await this.prisma.$transaction([
          this.prisma.assessmentAttempt.deleteMany({
            where: { assessmentId: quiz.assessmentId!, userId },
          }),
          this.prisma.assessmentAttempt.create({
            data: {
              assessmentId: quiz.assessmentId!,
              userId,
              attemptNumber: 1,
              score,
              passed: !missed && score >= passingScore,
              answers: {
                source: 'LIVE_SESSION',
                sessionId,
                missed,
                answered: answered.length,
              } as Prisma.InputJsonValue,
              startedAt: now,
              submittedAt: now,
            },
          }),
        ]);
      }
    }

    // A session result can complete the course (or tell the learner the grade fell short).
    for (const { userId } of enrollments) {
      try {
        await this.progressService.maybeCompleteCourse(userId, session.courseId);
      } catch (err) {
        this.logger.warn(`Completion check failed for ${userId}: ${(err as Error).message}`);
      }
    }

    return { quizzes: session.preparedQuizzes.length, learners: enrollments.length };
  }
}
