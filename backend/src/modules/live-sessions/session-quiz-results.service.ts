import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { isAnswerCorrect } from '@common/utils';

interface QuizResponseMeta {
  questionId?: string;
  questionTitle?: string;
  quizId?: string;
  quizTitle?: string;
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
  /** A course session quiz (formative: the score is recorded as feedback, never graded). */
  graded: boolean;
  /** Points the quiz is out of (sum of its questions' points). */
  totalPoints: number;
  questions: SessionQuizQuestion[];
}

export interface LearnerAnswer {
  questionId: string;
  /** What the learner picked, as text; null when they did not answer. */
  answer: string | null;
  /** The option texts the learner picked (or their typed answer), to mark them in the full list. */
  selected: string[];
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
  /** The score recorded when the session was completed (course session quizzes). */
  recorded: { score: number; missed: boolean } | null;
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
      if (!metaByQuestion.has(meta.questionId)) metaByQuestion.set(meta.questionId, meta);
      if (onlyUserId && log.userId !== onlyUserId) continue;
      if (!latest.has(log.userId)) latest.set(log.userId, new Map());
      latest.get(log.userId)!.set(meta.questionId, { meta, at: log.timestamp });
    }

    // Empty groups (prepared but never given questions) have no results to show.
    const quizzes: SessionQuizGroup[] = session.preparedQuizzes
      .filter((pq) => pq.questions.length > 0)
      .map((pq) => ({
        id: pq.id,
        title: pq.title,
        graded: Boolean(pq.assessmentId),
        totalPoints: 0,
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

    // A held round whose course quiz moved on to a later round (missed sessions are rescheduled)
    // no longer has that prepared quiz. Rebuild it from the assessment's answer key, which keeps
    // the trainer's per-question points, for every course quiz this round scored.
    const preparedAssessmentIds = new Set(
      session.preparedQuizzes
        .map((pq) => pq.assessmentId)
        .filter((id): id is string => Boolean(id)),
    );
    const gradedHere = await this.prisma.assessmentAttempt.findMany({
      where: { answers: { path: ['sessionId'], equals: sessionId } },
      select: { assessmentId: true },
      distinct: ['assessmentId'],
    });
    const movedIds = gradedHere
      .map((a) => a.assessmentId)
      .filter((id) => !preparedAssessmentIds.has(id));
    const moved =
      movedIds.length > 0
        ? await this.prisma.assessment.findMany({
            where: { id: { in: movedIds }, courseId: session.courseId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, titleEn: true, questions: true },
          })
        : [];
    for (const a of moved) {
      const keyed = (Array.isArray(a.questions) ? a.questions : []) as Array<{
        id: string;
        type?: string;
        question?: string;
        options?: unknown[];
        correctAnswer?: string | number | null;
        points?: number;
      }>;
      quizzes.push({
        id: a.id,
        title: a.titleEn,
        graded: true,
        totalPoints: 0,
        questions: keyed.map((q) => {
          const options = Array.isArray(q.options) ? q.options.map(String) : [];
          const answer =
            q.correctAnswer === null || q.correctAnswer === undefined
              ? null
              : String(q.correctAnswer);
          return {
            id: q.id,
            type: q.type ?? 'MULTIPLE_CHOICE',
            question: q.question ?? '',
            options,
            correctAnswer: asText(answer, options),
            points: q.points ?? 0,
          };
        }),
      });
    }

    // Questions answered live that are not in any prepared group (broadcast straight from the bank or ad-hoc).
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

      // Group questions by quiz: by quizId or quizTitle if available, or individually by question/title
      const otherGroups = new Map<string, { id: string; title: string; questionIds: string[] }>();
      let autoIndex = 1;

      for (const qId of otherIds) {
        const meta = metaByQuestion.get(qId);
        const qBank = bankById.get(qId);
        const rawTitle = meta?.quizTitle?.trim();
        const rawQuizId = meta?.quizId?.trim();

        // Check if question's quizId matches an existing prepared quiz that was empty
        const matchingPrepared = rawQuizId
          ? session.preparedQuizzes.find((pq) => pq.id === rawQuizId)
          : null;
        if (matchingPrepared) {
          let target = quizzes.find((q) => q.id === matchingPrepared.id);
          if (!target) {
            target = {
              id: matchingPrepared.id,
              title: matchingPrepared.title,
              graded: Boolean(matchingPrepared.assessmentId),
              totalPoints: 0,
              questions: [],
            };
            quizzes.push(target);
          }
          const options = (
            Array.isArray(qBank?.options) ? (qBank!.options as unknown[]) : (meta?.options ?? [])
          ).map(String);
          target.questions.push({
            id: qId,
            type: qBank?.type ?? 'MULTIPLE_CHOICE',
            question: qBank?.question ?? meta?.questionTitle ?? 'Live question',
            options,
            correctAnswer: asText(qBank?.correctAnswer ?? meta?.correctAnswer, options),
            points: (meta as any)?.points ?? 1,
          });
          continue;
        }

        const groupKey =
          rawQuizId ||
          rawTitle ||
          (otherIds.length === 1 ? OTHER_QUIZ_ID : `live_q_${qId}`);
        const groupTitle =
          rawTitle ||
          (rawQuizId ? `Quiz ${rawQuizId}` : null) ||
          meta?.questionTitle ||
          qBank?.question ||
          (otherIds.length === 1 ? 'Other questions' : `Quiz ${autoIndex++}`);

        if (!otherGroups.has(groupKey)) {
          otherGroups.set(groupKey, {
            id: rawQuizId || (groupKey.startsWith('live_q_') ? groupKey : `live-quiz-${otherGroups.size + 1}`),
            title: groupTitle,
            questionIds: [],
          });
        }
        otherGroups.get(groupKey)!.questionIds.push(qId);
      }

      for (const group of otherGroups.values()) {
        quizzes.push({
          id: group.id,
          title: group.title,
          graded: false,
          totalPoints: 0,
          questions: group.questionIds.map((id) => {
            const q = bankById.get(id);
            const meta = metaByQuestion.get(id)!;
            const options = (
              Array.isArray(q?.options) ? (q!.options as unknown[]) : (meta?.options ?? [])
            ).map(String);
            return {
              id,
              type: q?.type ?? 'MULTIPLE_CHOICE',
              question: q?.question ?? meta?.questionTitle ?? 'Live question',
              options,
              correctAnswer: asText(q?.correctAnswer ?? meta?.correctAnswer, options),
              points: (meta as any)?.points ?? 1,
            };
          }),
        });
      }
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

    const gradedAssessmentIds = [...preparedAssessmentIds, ...moved.map((a) => a.id)];
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
            select: { assessmentId: true, userId: true, score: true, answers: true },
          })
        : Promise.resolve([]),
    ]);
    const attendanceByUser = new Map(attendance.map((a) => [a.userId, a.status]));
    const recordedBy = new Map<string, { score: number; missed: boolean }>();
    for (const attempt of attempts) {
      const source = (attempt.answers ?? {}) as {
        source?: string;
        sessionId?: string;
        missed?: boolean;
      };
      if (source.source !== 'LIVE_SESSION' || source.sessionId !== sessionId) continue;
      recordedBy.set(`${attempt.assessmentId}:${attempt.userId}`, {
        score: attempt.score,
        missed: Boolean(source.missed),
      });
    }
    const assessmentOf = new Map<string, string | null>([
      ...session.preparedQuizzes.map((pq) => [pq.id, pq.assessmentId] as [string, string | null]),
      ...moved.map((a) => [a.id, a.id] as [string, string]),
    ]);

    // Score like grading: the trainer's points, or one point each when none were assigned.
    // The points shown per question are the ones the score uses.
    for (const quiz of quizzes) {
      if (quiz.questions.every((q) => !q.points)) for (const q of quiz.questions) q.points = 1;
      quiz.totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    }

    const learners: LearnerSessionResult[] = users
      .map((user) => {
        const answers = latest.get(user.id);
        return {
          userId: user.id,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
          email: user.email,
          attendance: attendanceByUser.get(user.id) ?? null,
          quizzes: quizzes.map((quiz): LearnerQuizResult => {
            let answered = 0;
            let correct = 0;
            let earnedPoints = 0;
            const rows = quiz.questions.map((q): LearnerAnswer => {
              const entry = answers?.get(q.id);
              if (!entry)
                return {
                  questionId: q.id,
                  answer: null,
                  selected: [],
                  isCorrect: null,
                  answeredAt: null,
                };
              answered += 1;
              const selectedIds = entry.meta.selectedOptionIds ?? [];
              const hasSelected = selectedIds.length > 0;
              // Checked against the answer key (older answers stored a wrong flag), falling back to isCorrect.
              const isCorrect = hasSelected
                ? isAnswerCorrect(
                    { options: q.options, correctAnswer: q.correctAnswer },
                    selectedIds,
                  )
                : Boolean(entry.meta.isCorrect);
              if (isCorrect) {
                correct += 1;
                earnedPoints += q.points;
              }
              const picked = selectedIds.map((v) => asText(v, q.options) ?? v);
              return {
                questionId: q.id,
                answer: picked.join(', ') || null,
                selected: picked,
                isCorrect,
                answeredAt: entry.at,
              };
            });
            const totalPoints = quiz.totalPoints;
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
