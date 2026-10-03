import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { PermissionsService } from '@modules/permissions/permissions.service';
import { assertCanRunSession } from '@modules/live-sessions/session-access';
import type { AuthenticatedUser } from '@common/interfaces';
import { RedisConfig } from '@config/app.config';
import {
  CreatePreparedQuizDto,
  UpdatePreparedQuizDto,
  BulkAddPreparedQuestionsDto,
  ReorderPreparedQuestionsDto,
  SetPreparedQuestionPointsDto,
} from './dto';
import { isEvenSplit, splitEvenly } from './quiz-points';

const CACHE_TTL_SECONDS = 300;

function cacheKey(sessionId: string): string {
  return `prepared_quiz_groups:session:${sessionId}`;
}

@Injectable()
export class PreparedQuizService implements OnModuleDestroy {
  private readonly logger = new Logger(PreparedQuizService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {
    this.redis = new Redis({
      host: RedisConfig.host,
      port: RedisConfig.port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => undefined);
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async ensureConnected(): Promise<void> {
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      await this.redis.connect();
    }
  }

  private async invalidateCache(sessionId: string): Promise<void> {
    try {
      await this.ensureConnected();
      await this.redis.del(cacheKey(sessionId));
    } catch {
      // Ignore
    }
  }

  private async assertSessionExists(sessionId: string): Promise<void> {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException(`Live session "${sessionId}" not found`);
    }
  }

  private async assertQuizExists(sessionId: string, quizId: string) {
    const quiz = await this.prisma.sessionPreparedQuiz.findUnique({
      where: { id: quizId },
      include: { assessment: { select: { weight: true } } },
    });
    if (!quiz || quiz.sessionId !== sessionId) {
      throw new NotFoundException(`Prepared quiz group "${quizId}" not found for this session`);
    }
    return quiz;
  }

  private get quizInclude() {
    return {
      // Weighted course quiz this prepared quiz runs, if any (weight / pass mark shown to the trainer).
      assessment: { select: { id: true, weight: true, passingScore: true } },
      questions: {
        orderBy: { order: 'asc' as const },
        include: {
          question: {
            select: {
              id: true,
              type: true,
              question: true,
              options: true,
              correctAnswer: true,
              points: true,
              category: true,
              courseId: true,
            },
          },
        },
      },
    };
  }

  /**
   * A weighted session quiz keeps its answer key on its Assessment (like every other graded
   * assessment), so its question list is copied there whenever the prepared quiz changes.
   */
  private async syncLinkedAssessment(quizId: string) {
    const quiz = await this.prisma.sessionPreparedQuiz.findUnique({
      where: { id: quizId },
      select: {
        assessmentId: true,
        questions: {
          orderBy: { order: 'asc' },
          select: {
            points: true,
            question: {
              select: {
                id: true,
                type: true,
                question: true,
                options: true,
                correctAnswer: true,
                category: true,
              },
            },
          },
        },
      },
    });
    if (!quiz?.assessmentId) return;

    const questions = quiz.questions.map(({ points, question: q }) => {
      const answer = q.correctAnswer ?? undefined;
      // Choice questions store the correct option index; short answers store the text.
      const correctAnswer =
        q.type !== 'SHORT_ANSWER' && answer !== undefined && /^\d+$/.test(answer)
          ? Number(answer)
          : answer;
      return {
        id: q.id,
        type: q.type,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer,
        points,
        category: q.category,
      };
    });
    await this.prisma.assessment.update({
      where: { id: quiz.assessmentId },
      data: { questions: questions as unknown as Prisma.InputJsonValue },
    });
  }

  /** Points of a quiz's questions in order. */
  private async orderedPoints(quizId: string) {
    return this.prisma.sessionPreparedQuestion.findMany({
      where: { quizId },
      orderBy: [{ order: 'asc' }, { addedAt: 'asc' }],
      select: { id: true, points: true },
    });
  }

  /** Writes the even split of `weight` over the quiz's questions. */
  private async applyEvenSplit(quizId: string, weight: number) {
    const rows = await this.orderedPoints(quizId);
    const split = splitEvenly(weight, rows.length);
    await this.prisma.$transaction(
      rows.map((row, i) =>
        this.prisma.sessionPreparedQuestion.update({
          where: { id: row.id },
          data: { points: split[i] },
        }),
      ),
    );
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** live_session.manage_own users may only prepare quizzes for sessions they run. */
  async assertCanManage(user: AuthenticatedUser, sessionId: string): Promise<void> {
    await assertCanRunSession(this.prisma, this.permissions, user, sessionId);
  }

  /**
   * Return all prepared quiz groups for a session.
   * Reads from Redis first; falls back to DB and repopulates cache on miss.
   */
  async findAll(sessionId: string) {
    await this.assertSessionExists(sessionId);

    try {
      await this.ensureConnected();
      const cached = await this.redis.get(cacheKey(sessionId));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      this.logger.warn(`Redis read failed for session ${sessionId} — falling back to DB`);
    }

    const rows = await this.prisma.sessionPreparedQuiz.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
      include: this.quizInclude,
    });

    try {
      await this.redis.set(cacheKey(sessionId), JSON.stringify(rows), 'EX', CACHE_TTL_SECONDS);
    } catch {
      // Ignore
    }

    return rows;
  }

  /** Create a new named quiz group for a session */
  async createQuiz(sessionId: string, dto: CreatePreparedQuizDto) {
    await this.assertSessionExists(sessionId);

    const last = await this.prisma.sessionPreparedQuiz.findFirst({
      where: { sessionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const order = last ? last.order + 1 : 0;
    const title = dto.title?.trim() || `Quiz ${order + 1}`;
    const timeLimitMinutes = dto.timeLimitMinutes || 3;

    const created = await this.prisma.sessionPreparedQuiz.create({
      data: {
        sessionId,
        title,
        timeLimitMinutes,
        order,
      },
      include: this.quizInclude,
    });

    await this.invalidateCache(sessionId);
    return created;
  }

  /** Update an existing quiz group (e.g. change title, minutes, order) */
  async updateQuiz(sessionId: string, quizId: string, dto: UpdatePreparedQuizDto) {
    await this.assertQuizExists(sessionId, quizId);

    const updated = await this.prisma.sessionPreparedQuiz.update({
      where: { id: quizId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.timeLimitMinutes !== undefined ? { timeLimitMinutes: dto.timeLimitMinutes } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
      include: this.quizInclude,
    });

    await this.invalidateCache(sessionId);
    return updated;
  }

  /** Delete a quiz group and its questions */
  async deleteQuiz(sessionId: string, quizId: string) {
    const quiz = await this.assertQuizExists(sessionId, quizId);
    if (quiz.assessmentId) {
      throw new BadRequestException(
        'This is a weighted course quiz planned with the course. Add questions to it; it cannot be deleted here.',
      );
    }

    await this.prisma.sessionPreparedQuiz.delete({
      where: { id: quizId },
    });

    await this.invalidateCache(sessionId);
  }

  /**
   * Bulk-add questions to a specific quiz group.
   * Silently skips already added questions.
   */
  async bulkAddQuestions(sessionId: string, quizId: string, dto: BulkAddPreparedQuestionsDto) {
    const quiz = await this.assertQuizExists(sessionId, quizId);
    const weight = quiz.assessment?.weight ?? null;
    // A weighted quiz whose points are still the even split stays evenly split; once the
    // trainer has customised them, new questions start at 0 for the trainer to assign.
    const keepEven =
      weight !== null &&
      isEvenSplit(
        (await this.orderedPoints(quizId)).map((r) => r.points),
        weight,
      );

    const last = await this.prisma.sessionPreparedQuestion.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    let nextOrder = last ? last.order + 1 : 0;

    const existing = await this.prisma.sessionPreparedQuestion.findMany({
      where: { quizId, questionId: { in: dto.questionIds } },
      select: { questionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.questionId));

    const validQuestions = await this.prisma.questionBankQuestion.findMany({
      where: { id: { in: dto.questionIds } },
      select: { id: true, points: true },
    });
    const bankPoints = new Map(validQuestions.map((q) => [q.id, q.points]));

    const toCreate = dto.questionIds.filter((id) => !existingIds.has(id) && bankPoints.has(id));

    if (toCreate.length > 0) {
      await this.prisma.$transaction(
        toCreate.map((questionId) =>
          this.prisma.sessionPreparedQuestion.create({
            data: {
              quizId,
              questionId,
              order: nextOrder++,
              // Ungraded quizzes start from the bank question's points.
              points: weight === null ? (bankPoints.get(questionId) ?? 0) : 0,
            },
          }),
        ),
      );
      if (keepEven) await this.applyEvenSplit(quizId, weight);
    }

    await this.syncLinkedAssessment(quizId);
    await this.invalidateCache(sessionId);

    return this.prisma.sessionPreparedQuiz.findUnique({
      where: { id: quizId },
      include: this.quizInclude,
    });
  }

  /** Remove a question from a quiz group */
  async removeQuestion(sessionId: string, quizId: string, questionId: string) {
    const quiz = await this.assertQuizExists(sessionId, quizId);
    const weight = quiz.assessment?.weight ?? null;
    const keepEven =
      weight !== null &&
      isEvenSplit(
        (await this.orderedPoints(quizId)).map((r) => r.points),
        weight,
      );

    await this.prisma.sessionPreparedQuestion.deleteMany({
      where: { quizId, questionId },
    });
    if (keepEven) await this.applyEvenSplit(quizId, weight);

    await this.syncLinkedAssessment(quizId);
    await this.invalidateCache(sessionId);
  }

  /**
   * Sets the points of some questions in a quiz group. For a weighted quiz the total may not
   * exceed its course weight (it must equal it before the quiz can be broadcast or the course
   * published; a lower total is allowed while the trainer is still assigning points).
   */
  async setQuestionPoints(sessionId: string, quizId: string, dto: SetPreparedQuestionPointsDto) {
    const quiz = await this.assertQuizExists(sessionId, quizId);
    const rows = await this.prisma.sessionPreparedQuestion.findMany({
      where: { quizId },
      select: { questionId: true, points: true },
    });
    const next = new Map(rows.map((r) => [r.questionId, r.points]));
    for (const item of dto.points) {
      if (!next.has(item.questionId)) {
        throw new NotFoundException(`Question "${item.questionId}" is not in this quiz group`);
      }
      next.set(item.questionId, item.points);
    }

    const weight = quiz.assessment?.weight;
    if (weight !== undefined) {
      const total = [...next.values()].reduce((sum, p) => sum + p, 0);
      if (total > weight) {
        throw new BadRequestException(
          `Points total ${total} but this quiz is worth ${weight}% of the course grade, so its questions must total ${weight} points.`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.points.map((item) =>
        this.prisma.sessionPreparedQuestion.updateMany({
          where: { quizId, questionId: item.questionId },
          data: { points: item.points },
        }),
      ),
    );

    await this.syncLinkedAssessment(quizId);
    await this.invalidateCache(sessionId);

    return this.prisma.sessionPreparedQuiz.findUnique({
      where: { id: quizId },
      include: this.quizInclude,
    });
  }

  /** Reorder questions inside a quiz group */
  async reorderQuestions(sessionId: string, quizId: string, dto: ReorderPreparedQuestionsDto) {
    await this.assertQuizExists(sessionId, quizId);

    await this.prisma.$transaction(
      dto.orderedIds.map((questionId, index) =>
        this.prisma.sessionPreparedQuestion.updateMany({
          where: { quizId, questionId },
          data: { order: index },
        }),
      ),
    );

    await this.syncLinkedAssessment(quizId);
    await this.invalidateCache(sessionId);

    return this.prisma.sessionPreparedQuiz.findUnique({
      where: { id: quizId },
      include: this.quizInclude,
    });
  }
}
