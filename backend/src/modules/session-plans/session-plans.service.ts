import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentType, CourseDeliveryMode, CourseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { assertCourseWeightsTotal } from '@common/utils';
import { PolicyService } from '@modules/policy/policy.service';
import {
  AddSessionQuizDto,
  RemoveSessionPlanDto,
  ReplaceSessionPlansDto,
  WeightRebalanceDto,
} from './dto';

const planInclude = {
  assessments: {
    where: { type: AssessmentType.SESSION_ASSESSMENT },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      titleEn: true,
      weight: true,
      passingScore: true,
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

/** Planned online sessions (placeholders) and their weighted quizzes, owned by the course. */
@Injectable()
export class SessionPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: PolicyService,
  ) {}

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
    if (dto.plans.length > 0 && course.deliveryMode !== CourseDeliveryMode.ONLINE_ONLY) {
      throw new BadRequestException(
        'Online sessions can only be planned for Online Self-Paced courses',
      );
    }

    const defaultPassMark = await this.policyService.getPassingScorePercent();

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
                weight: quiz.weight,
                passingScore: quiz.passingScore ?? defaultPassMark,
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

      // Lesson, module and final weights are saved before this call; together they may not pass 100%.
      await assertCourseWeightsTotal(tx, courseId, 'atMost');
    });

    return this.findByCourse(courseId);
  }

  /**
   * Removes a planned session and its quizzes. Before approval the plan just goes; after
   * approval its weight moves to other assessments of the course so it still totals exactly
   * 100%: as given in `rebalance`, or, when none is given, all of it to the final assessment
   * (or the heaviest remaining assessment if there is no final). A quiz that already has
   * learner results cannot be removed. `alsoDeleteSessionId` soft-deletes the scheduled
   * session in the same transaction.
   */
  async removePlan(
    courseId: string,
    planId: string,
    dto: RemoveSessionPlanDto,
    alsoDeleteSessionId?: string,
  ) {
    const plan = await this.prisma.courseSessionPlan.findUnique({
      where: { id: planId },
      include: {
        course: true,
        assessments: { include: { _count: { select: { attempts: true } } } },
      },
    });
    if (!plan || plan.courseId !== courseId) throw new NotFoundException('Session plan not found');
    if (plan.assessments.some((a) => a._count.attempts > 0)) {
      throw new ForbiddenException(
        'This session already has graded quiz results and cannot be removed',
      );
    }

    const preparing =
      plan.course.status === CourseStatus.DRAFT || plan.course.status === CourseStatus.REJECTED;
    const releasedWeight = plan.assessments.reduce((sum, a) => sum + (a.weight || 0), 0);
    const autoMoveWeight = !preparing && releasedWeight > 0 && !dto.rebalance?.length;

    await this.prisma.$transaction(async (tx) => {
      if (alsoDeleteSessionId) {
        await tx.liveSession.update({
          where: { id: alsoDeleteSessionId },
          data: { deletedAt: new Date() },
        });
      }
      await tx.courseSessionPlan.delete({ where: { id: planId } });
      if (autoMoveWeight) await this.giveWeightToDefault(tx, courseId, releasedWeight);
      else await this.applyRebalance(tx, courseId, dto.rebalance ?? []);
      if (!preparing) await assertCourseWeightsTotal(tx, courseId, 'exact');
      const remaining = await tx.courseSessionPlan.count({ where: { courseId } });
      if (remaining === 0)
        await tx.course.update({ where: { id: courseId }, data: { hasOnlineSessions: false } });
    });

    return this.findByCourse(courseId);
  }

  /**
   * Adds a weighted quiz to a planned session of an approved course. Room is made by lowering
   * other session quizzes (`rebalance`); the course must still total exactly 100%. If the session
   * is already scheduled, its linked prepared quiz is created too.
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
    const defaultPassMark = await this.policyService.getPassingScorePercent();

    await this.prisma.$transaction(async (tx) => {
      await this.applyRebalance(tx, courseId, dto.rebalance ?? []);
      const created = await tx.assessment.create({
        data: {
          courseId,
          sessionPlanId: planId,
          type: AssessmentType.SESSION_ASSESSMENT,
          titleEn: dto.titleEn.trim(),
          titleAm: dto.titleEn.trim(),
          weight: dto.weight,
          passingScore: dto.passingScore ?? defaultPassMark,
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
      await assertCourseWeightsTotal(tx, courseId, 'exact');
    });

    return this.findByCourse(courseId);
  }

  /** Only session quizzes of the same course can absorb weight; approved lesson/module/final weights stay as approved. */
  /** Freed weight goes to the final assessment, or the heaviest remaining one if there is none. */
  private async giveWeightToDefault(
    tx: Prisma.TransactionClient,
    courseId: string,
    weight: number,
  ) {
    const target =
      (await tx.assessment.findFirst({
        where: { courseId, type: AssessmentType.FINAL_ASSESSMENT },
        orderBy: { createdAt: 'asc' },
      })) ?? (await tx.assessment.findFirst({ where: { courseId }, orderBy: { weight: 'desc' } }));
    if (!target) {
      throw new BadRequestException(
        `This session's quizzes carry ${weight}% of the course grade and the course has no other assessment to take it over.`,
      );
    }
    await tx.assessment.update({
      where: { id: target.id },
      data: { weight: { increment: weight } },
    });
  }

  /** Sets new weights on assessments of this course (any type) to rebalance the course grade. */
  private async applyRebalance(
    tx: Prisma.TransactionClient,
    courseId: string,
    rebalance: WeightRebalanceDto[],
  ) {
    for (const r of rebalance) {
      const target = await tx.assessment.findUnique({
        where: { id: r.assessmentId },
        select: { courseId: true },
      });
      if (!target || target.courseId !== courseId) {
        throw new BadRequestException(
          'Weight can only be moved between assessments of this course',
        );
      }
      await tx.assessment.update({ where: { id: r.assessmentId }, data: { weight: r.weight } });
    }
  }

  private format(p: PlanRow) {
    return {
      id: p.id,
      courseId: p.courseId,
      order: p.order,
      titleEn: p.titleEn,
      descriptionEn: p.descriptionEn,
      objectivesEn: p.objectivesEn,
      quizzes: p.assessments.map(({ questions, ...quiz }) => ({
        ...quiz,
        questionCount: Array.isArray(questions) ? questions.length : 0,
      })),
      liveSession: p.liveSession,
    };
  }
}
