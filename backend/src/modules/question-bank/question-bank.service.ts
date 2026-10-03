import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  BulkCreateQuestionBankDto,
  CheckQuestionDuplicatesDto,
  CreateQuestionBankQuestionDto,
  QueryQuestionBankDto,
  UpdateQuestionBankQuestionDto,
} from './dto';
import {
  BatchMatch,
  DuplicateCandidate,
  SimilarQuestionMatch,
  findBatchDuplicates,
  findSimilarQuestions,
  lockQuestionBank,
} from './question-duplicates';

const QUESTION_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  course: {
    select: { id: true, title: true, code: true },
  },
  module: {
    select: { id: true, title: true, order: true },
  },
  lesson: {
    select: { id: true, title: true, order: true },
  },
  subLesson: {
    select: { id: true, title: true, order: true },
  },
} satisfies Prisma.QuestionBankQuestionInclude;

// Generated duplicate-detection columns; internal, not part of the API.
const QUESTION_OMIT = {
  contentHash: true,
  similarityText: true,
} satisfies Prisma.QuestionBankQuestionOmit;

type BankQuestionWithRelations = Prisma.QuestionBankQuestionGetPayload<{
  include: typeof QUESTION_INCLUDE;
  omit: typeof QUESTION_OMIT;
}>;

/** A bulk-create row rejected because it duplicates existing or batch questions. */
interface BatchDuplicateIssue {
  index: number;
  /** EXACT: identical question, never saved. SIMILAR: saved only when acknowledged. */
  reason: 'EXACT' | 'SIMILAR';
  matches: SimilarQuestionMatch[];
  batchMatches: BatchMatch[];
}

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateQuestionBankQuestionDto) {
    await this.assertCourseExists(dto.courseId);

    return this.prisma.$transaction(async (tx) => {
      await lockQuestionBank(tx);
      this.throwIfDuplicates(await findSimilarQuestions(tx, dto), dto.acknowledgeSimilar);
      return tx.questionBankQuestion.create({
        data: this.toCreateData(userId, dto),
        include: QUESTION_INCLUDE,
        omit: QUESTION_OMIT,
      });
    });
  }

  /**
   * All-or-nothing: if any row duplicates an existing question or an earlier
   * row of the batch, nothing is saved and every offending row is reported.
   */
  async bulkCreate(userId: string, dto: BulkCreateQuestionBankDto) {
    const courseIds = new Set(dto.questions.map((q) => q.courseId).filter(Boolean));
    for (const courseId of courseIds) {
      await this.assertCourseExists(courseId);
    }

    return this.prisma.$transaction(
      async (tx) => {
        await lockQuestionBank(tx);

        const batchDuplicates = await findBatchDuplicates(tx, dto.questions);
        const issues: BatchDuplicateIssue[] = [];
        for (const [index, q] of dto.questions.entries()) {
          const matches = await findSimilarQuestions(tx, q);
          const batchMatches = batchDuplicates.get(index) ?? [];
          const exact = [...matches, ...batchMatches].some((m) => m.severity === 'EXACT');
          const similar = matches.length > 0 || batchMatches.length > 0;
          if (exact || (similar && !q.acknowledgeSimilar)) {
            issues.push({ index, reason: exact ? 'EXACT' : 'SIMILAR', matches, batchMatches });
          }
        }

        if (issues.length > 0) {
          throw new ConflictException({
            message: `${issues.length} of ${dto.questions.length} questions duplicate existing questions or each other. Nothing was saved.`,
            code: 'QUESTION_BATCH_DUPLICATES',
            issues,
          });
        }

        const created: BankQuestionWithRelations[] = [];
        for (const q of dto.questions) {
          const question = await tx.questionBankQuestion.create({
            data: this.toCreateData(userId, q),
            include: QUESTION_INCLUDE,
            omit: QUESTION_OMIT,
          });
          created.push(question);
        }
        return created;
      },
      { timeout: 30_000 },
    );
  }

  /** Existing questions identical or similar to a draft, for live feedback in the editor. */
  async checkDuplicates(dto: CheckQuestionDuplicatesDto) {
    const matches = await findSimilarQuestions(
      this.prisma,
      dto,
      dto.excludeId ? [dto.excludeId] : [],
    );
    return { matches };
  }

  async findAll(query: QueryQuestionBankDto) {
    const where: Prisma.QuestionBankQuestionWhereInput = {};

    if (query.globalOnly) {
      where.courseId = null;
    } else if (query.courseId) {
      if (query.includeGlobal !== false) {
        where.OR = [{ courseId: query.courseId }, { courseId: null }];
      } else {
        where.courseId = query.courseId;
      }
    }

    if (query.subLessonId) {
      where.subLessonId = query.subLessonId;
    } else if (query.lessonId) {
      where.lessonId = query.lessonId;
    } else if (query.moduleId) {
      where.moduleId = query.moduleId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.category) {
      where.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      const searchConditions: Prisma.QuestionBankQuestionWhereInput[] = [
        { question: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    return this.prisma.questionBankQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: QUESTION_INCLUDE,
      omit: QUESTION_OMIT,
    });
  }

  async findOne(id: string) {
    const question = await this.prisma.questionBankQuestion.findUnique({
      where: { id },
      include: QUESTION_INCLUDE,
      omit: QUESTION_OMIT,
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found in Question Bank`);
    }

    return question;
  }

  async update(id: string, dto: UpdateQuestionBankQuestionDto) {
    const existing = await this.findOne(id);
    await this.assertCourseExists(dto.courseId);

    const next: DuplicateCandidate = {
      type: dto.type ?? existing.type,
      question: dto.question ?? existing.question,
      options:
        dto.options ?? (Array.isArray(existing.options) ? (existing.options as string[]) : []),
      courseId: dto.courseId !== undefined ? dto.courseId : existing.courseId,
    };
    // Only re-check when the content or course changes, so editing points or
    // placement of an already-duplicated legacy question still works.
    const contentChanged =
      next.type !== existing.type ||
      next.question !== existing.question ||
      JSON.stringify(next.options) !== JSON.stringify(existing.options) ||
      (next.courseId ?? null) !== existing.courseId;

    return this.prisma.$transaction(async (tx) => {
      if (contentChanged) {
        await lockQuestionBank(tx);
        this.throwIfDuplicates(await findSimilarQuestions(tx, next, [id]), dto.acknowledgeSimilar);
      }

      return tx.questionBankQuestion.update({
        where: { id },
        data: {
          ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
          ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId } : {}),
          ...(dto.lessonId !== undefined ? { lessonId: dto.lessonId } : {}),
          ...(dto.subLessonId !== undefined ? { subLessonId: dto.subLessonId } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.question !== undefined ? { question: dto.question } : {}),
          ...(dto.options !== undefined
            ? { options: dto.options as unknown as Prisma.InputJsonValue }
            : {}),
          ...(dto.correctAnswer !== undefined ? { correctAnswer: dto.correctAnswer } : {}),
          ...(dto.points !== undefined ? { points: dto.points } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
        },
        include: QUESTION_INCLUDE,
        omit: QUESTION_OMIT,
      });
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.questionBankQuestion.delete({
      where: { id },
    });
  }

  private async assertCourseExists(courseId?: string | null) {
    if (!courseId) return;
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
  }

  /** Identical questions are always rejected; similar ones unless acknowledged. */
  private throwIfDuplicates(matches: SimilarQuestionMatch[], acknowledgeSimilar?: boolean) {
    if (matches.some((m) => m.severity === 'EXACT')) {
      throw new ConflictException({
        message: 'An identical question already exists in this course question bank.',
        code: 'QUESTION_DUPLICATE',
        matches,
      });
    }
    if (matches.length > 0 && !acknowledgeSimilar) {
      throw new ConflictException({
        message: 'Similar questions already exist in this course question bank.',
        code: 'QUESTION_SIMILAR',
        matches,
      });
    }
  }

  private toCreateData(
    userId: string,
    dto: CreateQuestionBankQuestionDto,
  ): Prisma.QuestionBankQuestionUncheckedCreateInput {
    return {
      courseId: dto.courseId || null,
      moduleId: dto.moduleId || null,
      lessonId: dto.lessonId || null,
      subLessonId: dto.subLessonId || null,
      createdById: userId,
      type: dto.type,
      question: dto.question,
      options: dto.options as unknown as Prisma.InputJsonValue,
      correctAnswer: dto.correctAnswer ?? null,
      points: dto.points ?? 10,
      category: dto.category || 'General',
    };
  }
}
