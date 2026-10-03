import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';

interface QuizResponseMeta {
  questionId?: string;
  questionTitle?: string;
  options?: unknown[];
  correctAnswer?: string;
  selectedOptionIds?: string[];
  isCorrect?: boolean;
}

export interface SessionQuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  /** Correct answer as text (option label for choice questions). */
  correctAnswer: string | null;
  points: number;
}

export interface SessionQuizGroup {
  /** Prepared quiz id, or `other` for questions broadcast outside a prepared group. */
  id: string;
  title: string;
  graded: boolean;
  weight: number | null;
  passingScore: number | null;
  questions: SessionQuizQuestion[];
}

export interface LearnerAnswer {
  questionId: string;
  /** What the learner picked, as text; null when they did not answer. */
  answer: string | null;
  isCorrect: boolean | null;
  answeredAt: Date | null;
}

export interface LearnerQuizResult {
  quizId: string;
  answered: number;
  correct: number;
  earnedPoints: number;
  totalPoints: number;
  scorePercent: number;
  /** The result recorded in the course grade when the session was completed (graded quizzes). */
  recorded: { score: number; passed: boolean } | null;
  answers: LearnerAnswer[];
}

export interface LearnerSessionResult {
  userId: string;
  name: string;
  email: string;
  attendance: string | null;
  quizzes: LearnerQuizResult[];
}

export interface SessionQuizResults {
  sessionId: string;
  title: string;
  status: SessionStatus;
  completed: boolean;
  quizzes: SessionQuizGroup[];
  learners: LearnerSessionResult[];
}

const OTHER_QUIZ_ID = 'other';

/** Index answers ("0") become the option text; anything else (short answers) stays as typed. */
function asText(value: string | null | undefined, options: string[]): string | null {
  if (value === null || value === undefined || value === '') return null;
  return /^\d+$/.test(value) && options[Number(value)] !== undefined
    ? options[Number(value)]!
    : value;
}

/**
 * Per-learner results of a session's live quizzes, built from the QUIZ_RESPONSE log. Like
 * grading, each learner's latest answer to a question counts. Questions are grouped by the
 * session's prepared quiz groups (with their per-question points); questions broadcast
 * outside a group are listed under "Other questions".
 */
@Injectable()
export class SessionQuizResultsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every enrolled learner (plus anyone who answered). For trainers and attendance viewers. */
  async forStaff(sessionId: string): Promise<SessionQuizResults> {
    return this.build(sessionId);
  }

  /** The user's own results, only once the session is completed. */
  async forLearner(
    sessionId: string,
    userId: string,
  ): Promise<SessionQuizResults & { available: boolean }> {
    const results = await this.build(sessionId, userId);
    if (!results.completed) return { ...results, quizzes: [], learners: [], available: false };
    return { ...results, available: true };
  }

  private async build(sessionId: string, onlyUserId?: string): Promise<SessionQuizResults> {
    const session = await this.prisma.liveSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: {
        id: true,
        titleEn: true,
        status: true,
        courseId: true,
        preparedQuizzes: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            assessmentId: true,
            assessment: { select: { weight: true, passingScore: true } },
            questions: {
              orderBy: [{ order: 'asc' }, { addedAt: 'asc' }],
              select: {
                points: true,
                question: {
                  select: {
                    id: true,
                    type: true,
                    question: true,
                    options: true,
                    correctAnswer: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Live session not found');

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        sessionId,
        eventType: 'QUIZ_RESPONSE',
        ...(onlyUserId ? { userId: onlyUserId } : {}),
      },
      orderBy: { timestamp: 'asc' },
      select: { userId: true, timestamp: true, metadata: true },
    });

    // Latest answer per learner per question.
    const latest = new Map<string, Map<string, { meta: QuizResponseMeta; at: Date }>>();
    const metaByQuestion = new Map<string, QuizResponseMeta>();
    for (const log of logs) {
      const meta = (log.metadata ?? {}) as QuizResponseMeta;
      if (!meta.questionId) continue;
      if (!latest.has(log.userId)) latest.set(log.userId, new Map());
      latest.get(log.userId)!.set(meta.questionId, { meta, at: log.timestamp });
      if (!metaByQuestion.has(meta.questionId)) metaByQuestion.set(meta.questionId, meta);
    }

    const quizzes: SessionQuizGroup[] = session.preparedQuizzes.map((pq) => ({
      id: pq.id,
      title: pq.title,
      graded: Boolean(pq.assessmentId),
      weight: pq.assessment?.weight ?? null,
      passingScore: pq.assessment?.passingScore ?? null,
      questions: pq.questions.map(({ points, question: q }) => {
        const options = Array.isArray(q.options) ? (q.options as unknown[]).map(String) : [];
        return {
          id: q.id,
          type: q.type,
          question: q.question,
          options,
          correctAnswer: asText(q.correctAnswer, options),
          points,
        };
      }),
    }));

    // Questions answered live that are not in any prepared group (broadcast straight from the bank).
    const grouped = new Set(quizzes.flatMap((quiz) => quiz.questions.map((q) => q.id)));
    const otherIds = [...metaByQuestion.keys()].filter((id) => !grouped.has(id));
    if (otherIds.length > 0) {
      const bank = await this.prisma.questionBankQuestion.findMany({
        where: { id: { in: otherIds } },
        select: {
          id: true,
          type: true,
          question: true,
          options: true,
          correctAnswer: true,
          points: true,
        },
      });
      const bankById = new Map(bank.map((q) => [q.id, q]));
      quizzes.push({
        id: OTHER_QUIZ_ID,
        title: 'Other questions',
        graded: false,
        weight: null,
        passingScore: null,
        questions: otherIds.map((id) => {
          const q = bankById.get(id);
          const meta = metaByQuestion.get(id)!;
          const options = (
            Array.isArray(q?.options) ? (q!.options as unknown[]) : (meta.options ?? [])
          ).map(String);
          return {
            id,
            type: q?.type ?? 'MULTIPLE_CHOICE',
            question: q?.question ?? meta.questionTitle ?? 'Live question',
            options,
            correctAnswer: asText(q?.correctAnswer ?? meta.correctAnswer, options),
            points: q?.points ?? 1,
          };
        }),
      });
    }

    // Learners: everyone enrolled plus anyone who answered (staff view), or just the requester.
    const enrolledIds = onlyUserId
      ? [onlyUserId]
      : (
          await this.prisma.enrollment.findMany({
            where: {
              courseId: session.courseId,
              status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
            },
            select: { userId: true },
          })
        ).map((e) => e.userId);
    const userIds = [...new Set([...enrolledIds, ...latest.keys()])];

    const gradedAssessmentIds = session.preparedQuizzes
      .map((pq) => pq.assessmentId)
      .filter((id): id is string => Boolean(id));
    const [users, attendance, attempts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      this.prisma.attendance.findMany({
        where: { sessionId, userId: { in: userIds } },
        select: { userId: true, status: true },
      }),
      gradedAssessmentIds.length > 0
        ? this.prisma.assessmentAttempt.findMany({
            where: { assessmentId: { in: gradedAssessmentIds }, userId: { in: userIds } },
            select: { assessmentId: true, userId: true, score: true, passed: true, answers: true },
          })
        : Promise.resolve([]),
    ]);
    const attendanceByUser = new Map(attendance.map((a) => [a.userId, a.status]));
    const recordedBy = new Map<string, { score: number; passed: boolean }>();
    for (const attempt of attempts) {
      const source = (attempt.answers ?? {}) as { source?: string; sessionId?: string };
      if (source.source !== 'LIVE_SESSION' || source.sessionId !== sessionId) continue;
      recordedBy.set(`${attempt.assessmentId}:${attempt.userId}`, {
        score: attempt.score,
        passed: attempt.passed,
      });
    }
    const assessmentOf = new Map(session.preparedQuizzes.map((pq) => [pq.id, pq.assessmentId]));

    const learners: LearnerSessionResult[] = users
      .map((user) => {
        const answers = latest.get(user.id);
        return {
          userId: user.id,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
          email: user.email,
          attendance: attendanceByUser.get(user.id) ?? null,
          quizzes: quizzes.map((quiz): LearnerQuizResult => {
            // Graded like the course result: trainer points, or equal weight if none were set.
            const allZero = quiz.questions.every((q) => !q.points);
            const pointsOf = (q: SessionQuizQuestion) => (allZero ? 1 : q.points);
            let answered = 0;
            let correct = 0;
            let earnedPoints = 0;
            const rows = quiz.questions.map((q): LearnerAnswer => {
              const entry = answers?.get(q.id);
              if (!entry)
                return { questionId: q.id, answer: null, isCorrect: null, answeredAt: null };
              answered += 1;
              const isCorrect = Boolean(entry.meta.isCorrect);
              if (isCorrect) {
                correct += 1;
                earnedPoints += pointsOf(q);
              }
              const picked = (entry.meta.selectedOptionIds ?? []).map(
                (v) => asText(v, q.options) ?? v,
              );
              return {
                questionId: q.id,
                answer: picked.join(', ') || null,
                isCorrect,
                answeredAt: entry.at,
              };
            });
            const totalPoints = quiz.questions.reduce((sum, q) => sum + pointsOf(q), 0);
            const assessmentId = assessmentOf.get(quiz.id);
            return {
              quizId: quiz.id,
              answered,
              correct,
              earnedPoints,
              totalPoints,
              scorePercent: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
              recorded: assessmentId
                ? (recordedBy.get(`${assessmentId}:${user.id}`) ?? null)
                : null,
              answers: rows,
            };
          }),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      sessionId,
      title: session.titleEn,
      status: session.status,
      completed: session.status === SessionStatus.COMPLETED,
      quizzes,
      learners,
    };
  }
}
