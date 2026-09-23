import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  BulkCreateQuestionBankDto,
  CreateQuestionBankQuestionDto,
  QueryQuestionBankDto,
  UpdateQuestionBankQuestionDto,
} from './dto';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateQuestionBankQuestionDto) {
    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) {
        throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
      }
    }

    return this.prisma.questionBankQuestion.create({
      data: {
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
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: {
          select: { id: true, titleEn: true, titleAm: true, code: true },
        },
        module: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        lesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        subLesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
      },
    });
  }

  async bulkCreate(userId: string, dto: BulkCreateQuestionBankDto) {
    const created: any[] = [];
    for (const q of dto.questions) {
      const res = await this.create(userId, q);
      created.push(res);
    }
    return created;
  }

  async findAll(query: QueryQuestionBankDto) {
    const where: Prisma.QuestionBankQuestionWhereInput = {};

    if (query.globalOnly) {
      where.courseId = null;
    } else if (query.courseId) {
      if (query.includeGlobal !== false) {
        where.OR = [
          { courseId: query.courseId },
          { courseId: null },
        ];
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
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    return this.prisma.questionBankQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: {
          select: { id: true, titleEn: true, titleAm: true, code: true },
        },
        module: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        lesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        subLesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const question = await this.prisma.questionBankQuestion.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: {
          select: { id: true, titleEn: true, titleAm: true, code: true },
        },
        module: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        lesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        subLesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found in Question Bank`);
    }

    return question;
  }

  async update(id: string, dto: UpdateQuestionBankQuestionDto) {
    await this.findOne(id);

    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      if (!course) {
        throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
      }
    }

    return this.prisma.questionBankQuestion.update({
      where: { id },
      data: {
        ...(dto.courseId !== undefined ? { courseId: dto.courseId } : {}),
        ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId } : {}),
        ...(dto.lessonId !== undefined ? { lessonId: dto.lessonId } : {}),
        ...(dto.subLessonId !== undefined ? { subLessonId: dto.subLessonId } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.question !== undefined ? { question: dto.question } : {}),
        ...(dto.options !== undefined ? { options: dto.options as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.correctAnswer !== undefined ? { correctAnswer: dto.correctAnswer } : {}),
        ...(dto.points !== undefined ? { points: dto.points } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: {
          select: { id: true, titleEn: true, titleAm: true, code: true },
        },
        module: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        lesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
        subLesson: {
          select: { id: true, titleEn: true, titleAm: true, order: true },
        },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.questionBankQuestion.delete({
      where: { id },
    });
  }
}
