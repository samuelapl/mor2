import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '@config/prisma.service';
import { RedisConfig } from '@config/app.config';
import {
  AddPreparedQuestionDto,
  BulkAddPreparedQuestionsDto,
  ReorderPreparedQuestionsDto,
} from './dto';

/** Redis TTL in seconds — 5 minutes. Prepared quizzes are written pre-session and read on join. */
const CACHE_TTL_SECONDS = 300;

function cacheKey(sessionId: string): string {
  return `prepared_quiz:session:${sessionId}`;
}

@Injectable()
export class PreparedQuizService implements OnModuleDestroy {
  private readonly logger = new Logger(PreparedQuizService.name);
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    // Best-effort cache: every read falls back to DB on any Redis error,
    // so correctness never depends on Redis being up.
    this.redis = new Redis({
      host: RedisConfig.host,
      port: RedisConfig.port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => undefined); // swallow — fallback handles it
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
      // Ignore — cache invalidation is best-effort
    }
  }

  private async assertSessionExists(sessionId: string): Promise<void> {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException(`Live session with ID "${sessionId}" not found`);
    }
  }

  private async assertQuestionExists(questionId: string): Promise<void> {
    const question = await this.prisma.questionBankQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) {
      throw new NotFoundException(`Question bank question with ID "${questionId}" not found`);
    }
  }

  /** Full question include shape reused across all DB reads */
  private get questionInclude() {
    return {
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
    };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Return all prepared questions for a session.
   * Reads from Redis first; falls back to DB and re-populates cache on miss.
   */
  async findAll(sessionId: string) {
    await this.assertSessionExists(sessionId);

    try {
      await this.ensureConnected();
      const cached = await this.redis.get(cacheKey(sessionId));
      if (cached) {
        this.logger.debug(`Cache hit for session ${sessionId}`);
        return JSON.parse(cached);
      }
    } catch {
      this.logger.warn(`Redis read failed for session ${sessionId} — falling back to DB`);
    }

    const rows = await this.prisma.sessionPreparedQuestion.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
      include: this.questionInclude,
    });

    try {
      await this.redis.set(cacheKey(sessionId), JSON.stringify(rows), 'EX', CACHE_TTL_SECONDS);
    } catch {
      // Ignore — DB result is still returned
    }

    return rows;
  }

  /** Add a single question from the bank to the session's prepared quiz. */
  async addQuestion(sessionId: string, dto: AddPreparedQuestionDto) {
    await this.assertSessionExists(sessionId);
    await this.assertQuestionExists(dto.questionId);

    // Check for duplicate
    const existing = await this.prisma.sessionPreparedQuestion.findUnique({
      where: { sessionId_questionId: { sessionId, questionId: dto.questionId } },
    });
    if (existing) {
      throw new ConflictException(
        `Question "${dto.questionId}" is already in the prepared quiz for this session`,
      );
    }

    // Determine order: append at end if not specified
    let order = dto.order;
    if (order === undefined) {
      const last = await this.prisma.sessionPreparedQuestion.findFirst({
        where: { sessionId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = last ? last.order + 1 : 0;
    }

    const created = await this.prisma.sessionPreparedQuestion.create({
      data: { sessionId, questionId: dto.questionId, order },
      include: this.questionInclude,
    });

    await this.invalidateCache(sessionId);
    return created;
  }

  /**
   * Bulk-add multiple questions from the bank.
   * Skips duplicates silently (returns only newly added rows).
   */
  async bulkAdd(sessionId: string, dto: BulkAddPreparedQuestionsDto) {
    await this.assertSessionExists(sessionId);

    // Get the current highest order value
    const last = await this.prisma.sessionPreparedQuestion.findFirst({
      where: { sessionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    let nextOrder = last ? last.order + 1 : 0;

    // Filter out IDs that are already prepared or don't exist in the bank
    const existing = await this.prisma.sessionPreparedQuestion.findMany({
      where: { sessionId, questionId: { in: dto.questionIds } },
      select: { questionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.questionId));

    const validQuestions = await this.prisma.questionBankQuestion.findMany({
      where: { id: { in: dto.questionIds } },
      select: { id: true },
    });
    const validIds = new Set(validQuestions.map((q) => q.id));

    const toCreate = dto.questionIds.filter((id) => !existingIds.has(id) && validIds.has(id));

    if (toCreate.length === 0) {
      return [];
    }

    const created = await this.prisma.$transaction(
      toCreate.map((questionId) =>
        this.prisma.sessionPreparedQuestion.create({
          data: { sessionId, questionId, order: nextOrder++ },
          include: this.questionInclude,
        }),
      ),
    );

    await this.invalidateCache(sessionId);
    return created;
  }

  /** Remove a single question from the prepared quiz. */
  async removeQuestion(sessionId: string, questionId: string) {
    await this.assertSessionExists(sessionId);

    const existing = await this.prisma.sessionPreparedQuestion.findUnique({
      where: { sessionId_questionId: { sessionId, questionId } },
    });
    if (!existing) {
      throw new NotFoundException(
        `Question "${questionId}" is not in the prepared quiz for this session`,
      );
    }

    await this.prisma.sessionPreparedQuestion.delete({
      where: { sessionId_questionId: { sessionId, questionId } },
    });

    await this.invalidateCache(sessionId);
  }

  /** Remove all prepared questions from a session. */
  async clearAll(sessionId: string) {
    await this.assertSessionExists(sessionId);
    await this.prisma.sessionPreparedQuestion.deleteMany({ where: { sessionId } });
    await this.invalidateCache(sessionId);
  }

  /**
   * Reorder the prepared questions by supplying a full ordered list of question IDs.
   * IDs not in the current prepared list are ignored.
   */
  async reorder(sessionId: string, dto: ReorderPreparedQuestionsDto) {
    await this.assertSessionExists(sessionId);

    await this.prisma.$transaction(
      dto.orderedIds.map((questionId, index) =>
        this.prisma.sessionPreparedQuestion.updateMany({
          where: { sessionId, questionId },
          data: { order: index },
        }),
      ),
    );

    await this.invalidateCache(sessionId);

    return this.prisma.sessionPreparedQuestion.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
      include: this.questionInclude,
    });
  }
}
