import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentType,
  CourseDeliveryMode,
  CourseStatus,
  Prisma,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { startsInSeconds } from '@common/utils';
import { AddSessionQuizDto, ReplaceSessionPlansDto } from './dto';

const planInclude = {
  assessments: {
    where: { type: AssessmentType.SESSION_ASSESSMENT },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      titleEn: true,
      timeLimitMinutes: true,
      questions: true,
    },
  },
  liveSession: {
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      trainerId: true,
      platform: true,
      durationMinutes: true,
      deletedAt: true,
    },
  },
} satisfies Prisma.CourseSessionPlanInclude;

type PlanRow = Prisma.CourseSessionPlanGetPayload<{ include: typeof planInclude }>;

/** Planned online sessions (placeholders) and their formative quizzes, owned by the course. */
@Injectable()
export class SessionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCourse(courseId: string) {
    const plans = await this.prisma.courseSessionPlan.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: planInclude,
    });
    return plans.map((p) => this.format(p));
  }

  /**
   * Replaces every planned session (and its quizzes) in one transaction, mirroring
   * curriculum replaceAll. Only while the course is being prepared (DRAFT / REJECTED).
   */
  async replaceAll(courseId: string, dto: ReplaceSessionPlansDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.deletedAt) throw new NotFoundException('Course not found');
    if (course.status !== CourseStatus.DRAFT && course.status !== CourseStatus.REJECTED) {
      throw new ForbiddenException(
        'Session plans can only be edited while the course is in DRAFT or REJECTED state',
      );
    }
    // Session plans can be added to both Online Self-Paced and In-Person Classroom courses.
    // (A course with IN_PERSON_ONLY plans physical branch sessions, while ONLINE_ONLY plans virtual sessions).

    await this.prisma.$transaction(async (tx) => {
      // Session quizzes cascade with their plan.
      await tx.courseSessionPlan.deleteMany({ where: { courseId } });

      for (const [order, plan] of dto.plans.entries()) {
        await tx.courseSessionPlan.create({
          data: {
            courseId,
            order,
            titleEn: plan.titleEn.trim(),
            descriptionEn: plan.descriptionEn,
            objectivesEn: plan.objectivesEn,
            assessments: {
              create: plan.quizzes.map((quiz) => ({
                courseId,
                type: AssessmentType.SESSION_ASSESSMENT,
                titleEn: quiz.titleEn.trim(),
                titleAm: quiz.titleEn.trim(),
                // Formative: score shown to learners, never graded.
                weight: 0,
                passingScore: 0,
                timeLimitMinutes: quiz.timeLimitMinutes,
                // Questions are prepared from the question bank once the session is scheduled.
                questions: [] as Prisma.InputJsonValue,
              })),
            },
          },
        });
      }

      await tx.course.update({
        where: { id: courseId },
        data: { hasOnlineSessions: dto.plans.length > 0 },
      });
    });

    return this.findByCourse(courseId);
  }

  /**
   * Removes a planned session and its quizzes. Session quizzes carry no weight, so the course
   * grade is unaffected. A quiz that already has learner results cannot be removed.
   * `alsoDeleteSessionId` soft-deletes the scheduled session in the same transaction.
   */
  async removePlan(courseId: string, planId: string, alsoDeleteSessionId?: string) {
    const plan = await this.prisma.courseSessionPlan.findUnique({
      where: { id: planId },
      include: { assessments: { include: { _count: { select: { attempts: true } } } } },
    });
    if (!plan || plan.courseId !== courseId) throw new NotFoundException('Session plan not found');
    if (plan.assessments.some((a) => a._count.attempts > 0)) {
      throw new ForbiddenException(
        'This session already has graded quiz results and cannot be removed',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (alsoDeleteSessionId) {
        await tx.liveSession.update({
          where: { id: alsoDeleteSessionId },
          data: { deletedAt: new Date() },
        });
      }
      await tx.courseSessionPlan.delete({ where: { id: planId } });
      const remaining = await tx.courseSessionPlan.count({ where: { courseId } });
      if (remaining === 0)
        await tx.course.update({ where: { id: courseId }, data: { hasOnlineSessions: false } });
    });

    return this.findByCourse(courseId);
  }

  /**
   * Adds a formative quiz to a planned session of an approved course. It carries no weight, so
   * the course grade is unaffected. If the session is already scheduled, its linked prepared
   * quiz is created too.
   */
  async addQuiz(courseId: string, planId: string, dto: AddSessionQuizDto) {
    const plan = await this.prisma.courseSessionPlan.findUnique({
      where: { id: planId },
      include: { course: true, liveSession: true },
    });
    if (!plan || plan.courseId !== courseId) throw new NotFoundException('Session plan not found');
    if (
      plan.course.status !== CourseStatus.APPROVED &&
      plan.course.status !== CourseStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        'While the course is being prepared, edit its sessions in the course studio',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          courseId,
          sessionPlanId: planId,
          type: AssessmentType.SESSION_ASSESSMENT,
          titleEn: dto.titleEn.trim(),
          titleAm: dto.titleEn.trim(),
          weight: 0,
          passingScore: 0,
          timeLimitMinutes: dto.timeLimitMinutes,
          questions: [] as Prisma.InputJsonValue,
        },
      });
      if (plan.liveSession) {
        const last = await tx.sessionPreparedQuiz.findFirst({
          where: { sessionId: plan.liveSession.id },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        await tx.sessionPreparedQuiz.create({
          data: {
            sessionId: plan.liveSession.id,
            assessmentId: created.id,
            title: created.titleEn,
            timeLimitMinutes: created.timeLimitMinutes ?? 10,
            order: last ? last.order + 1 : 0,
          },
        });
      }
    });

    return this.findByCourse(courseId);
  }

  /**
   * Assigns (or with `null` clears) the trainer who will host a planned session, before or after
   * it is scheduled. The trainer also becomes a course trainer, so they can schedule and run it.
   * A session that is already scheduled and not yet held moves to the new trainer too.
   */
  async assignTrainer(courseId: string, planId: string, trainerId: string | null) {
    const plan = await this.prisma.courseSessionPlan.findUnique({
      where: { id: planId },
      include: { liveSession: { select: { id: true, status: true, deletedAt: true } } },
    });
    if (!plan || plan.courseId !== courseId) throw new NotFoundException('Session plan not found');
    if (trainerId) {
      const trainer = await this.prisma.user.findUnique({
        where: { id: trainerId },
        select: { isActive: true, deletedAt: true },
      });
      if (!trainer || trainer.deletedAt || !trainer.isActive) {
        throw new BadRequestException('Trainer not found or inactive');
      }
    }

    const session = plan.liveSession && !plan.liveSession.deletedAt ? plan.liveSession : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.courseSessionPlan.update({ where: { id: planId }, data: { trainerId } });
      if (trainerId) {
        await tx.trainerAssignment.upsert({
          where: { courseId_userId: { courseId, userId: trainerId } },
          create: { courseId, userId: trainerId },
          update: {},
        });
      }
      if (session && session.status !== SessionStatus.COMPLETED) {
        await tx.liveSession.update({ where: { id: session.id }, data: { trainerId } });
      }
    });

    return this.findByCourse(courseId);
  }

  private format(p: PlanRow) {
    return {
      id: p.id,
      courseId: p.courseId,
      order: p.order,
      titleEn: p.titleEn,
      descriptionEn: p.descriptionEn,
      objectivesEn: p.objectivesEn,
      trainerId: p.trainerId,
      quizzes: p.assessments.map(({ questions, ...quiz }) => ({
        ...quiz,
        questionCount: Array.isArray(questions) ? questions.length : 0,
      })),
      liveSession: p.liveSession
        ? { ...p.liveSession, startsInSeconds: startsInSeconds(p.liveSession) }
        : null,
    };
  }
}
