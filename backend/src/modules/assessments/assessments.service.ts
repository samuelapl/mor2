import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssessmentType,
  CourseStatus,
  EnrollmentStatus,
  NotificationType,
  Prisma,
  RoleName,
} from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { CreateAssessmentDto, SubmitAssessmentDto } from './dto';
import { AuthenticatedUser } from '@common/interfaces';
import { CertificatesService } from '@modules/certificates/certificates.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { ProgressService } from '@modules/progress/progress.service';
import { PolicyService } from '@modules/policy/policy.service';
import { computeResult, gradeAnswers, GradableQuestion, GradedAnswer } from './grading.util';

const STAFF_ROLES = [
  RoleName.SYSTEM_ADMIN,
  RoleName.TRAINING_ADMIN,
  RoleName.COURSE_OWNER,
  RoleName.CONTENT_APPROVER,
  RoleName.TRAINER,
];

const assessmentInclude = {
  attempts: { orderBy: { createdAt: 'asc' } },
  course: { select: { id: true, titleEn: true, titleAm: true } },
  module: { select: { id: true, titleEn: true, titleAm: true } },
  lesson: { select: { id: true, titleEn: true, titleAm: true } },
} satisfies Prisma.AssessmentInclude;

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly certificatesService: CertificatesService,
    private readonly progressService: ProgressService,
    private readonly policyService: PolicyService,
  ) {}

  /**
   * Throws when the max-attempts ceiling is hit AND (the retake-cooldown
   * policy is off, or the cooldown since the last submitted attempt hasn't
   * elapsed yet). A configured cooldown > 0 lets a learner retake the
   * assessment once enough time has passed, instead of being locked out
   * forever.
   */
  private async assertRetakeAllowed(assessmentId: string, userId: string, maxAttempts: number) {
    const submittedCount = await this.prisma.assessmentAttempt.count({
      where: { assessmentId, userId, submittedAt: { not: null } },
    });
    if (submittedCount < maxAttempts) return;

    const cooldownMinutes = await this.policyService.getRetakeCooldownMinutes();
    if (cooldownMinutes <= 0) {
      throw new ForbiddenException('Maximum attempts reached for this assessment');
    }

    const lastAttempt = await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentId, userId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
    });
    const elapsedMinutes = lastAttempt?.submittedAt
      ? (Date.now() - new Date(lastAttempt.submittedAt).getTime()) / 60000
      : Infinity;

    if (elapsedMinutes < cooldownMinutes) {
      const remainingMinutes = Math.ceil(cooldownMinutes - elapsedMinutes);
      throw new ForbiddenException({
        reason: 'RETAKE_COOLDOWN',
        message: `Maximum attempts reached. You can retake this assessment in ${remainingMinutes} minute(s).`,
        remainingMinutes,
      });
    }
    // Cooldown elapsed — fall through and allow a new attempt.
  }

  private stripAnswers(assessment: { questions: Prisma.JsonValue | null; [key: string]: unknown }) {
    if (!assessment.questions) return assessment;
    const questions = assessment.questions as Array<Record<string, any>>;
    return {
      ...assessment,
      questions: questions.map((q) => {
        const { correctAnswer: _correctAnswer, ...rest } = q;
        return rest;
      }),
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Listing                                                            */
  /* ------------------------------------------------------------------ */

  async findByCourse(courseId: string, isLearner = false) {
    const assessments = await this.prisma.assessment.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      include: assessmentInclude,
    });

    return isLearner ? assessments.map((a) => this.stripAnswers(a)) : assessments;
  }

  async findByModule(moduleId: string, isLearner = false) {
    const assessments = await this.prisma.assessment.findMany({
      where: { moduleId, type: AssessmentType.MODULE_ASSESSMENT },
      orderBy: { createdAt: 'asc' },
      include: assessmentInclude,
    });

    return isLearner ? assessments.map((a) => this.stripAnswers(a)) : assessments;
  }

  async findByLesson(lessonId: string, isLearner = false) {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        lessonId,
        type: AssessmentType.LESSON_ASSESSMENT,
      },
      orderBy: { createdAt: 'asc' },
      include: assessmentInclude,
    });

    return isLearner ? assessments.map((a) => this.stripAnswers(a)) : assessments;
  }

  async findById(id: string, includeAnswers = false) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: assessmentInclude,
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return includeAnswers ? assessment : (this.stripAnswers(assessment) as typeof assessment);
  }

  /* ------------------------------------------------------------------ */
  /*  Creation & editing                                                 */
  /* ------------------------------------------------------------------ */

  /** Duplicate question ids break per-question answer independence on the client. */
  private assertUniqueQuestionIds(questions: CreateAssessmentDto['questions']) {
    const seen = new Set<string>();
    for (const q of questions) {
      if (seen.has(q.id)) {
        throw new ForbiddenException(`Duplicate question id "${q.id}" — question ids must be unique`);
      }
      seen.add(q.id);
    }
  }

  private dataFor(
    dto: CreateAssessmentDto,
    overrides: Partial<Prisma.AssessmentUncheckedCreateInput>,
  ): Prisma.AssessmentUncheckedCreateInput {
    this.assertUniqueQuestionIds(dto.questions);
    return {
      titleAm: dto.titleAm,
      titleEn: dto.titleEn,
      descriptionAm: dto.descriptionAm,
      descriptionEn: dto.descriptionEn,
      passingScore: dto.passingScore,
      maxAttempts: dto.maxAttempts ?? 3,
      timeLimitMinutes: dto.timeLimitMinutes,
      shuffleQuestions: dto.shuffleQuestions ?? false,
      questions: dto.questions as unknown as Prisma.InputJsonValue,
      ...overrides,
    } as Prisma.AssessmentUncheckedCreateInput;
  }

  private async assertCourseEditable(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }
    if (course.status !== CourseStatus.DRAFT && course.status !== CourseStatus.REJECTED) {
      throw new ForbiddenException(
        'Assessment can only be edited while the course is in DRAFT or REJECTED state',
      );
    }
  }

  private async assertModuleInCourse(courseId: string, moduleId: string) {
    const module = await this.prisma.curriculumModule.findUnique({ where: { id: moduleId } });
    if (!module || module.deletedAt || module.courseId !== courseId) {
      throw new NotFoundException('Module not found in this course');
    }
    return module;
  }

  private async assertLessonInModule(moduleId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.deletedAt || lesson.moduleId !== moduleId) {
      throw new NotFoundException('Lesson not found in this module');
    }
    return lesson;
  }

  /** Replaces the course's final assessment (delete-all + create) atomically. Only DRAFT/REJECTED courses. */
  async replaceForCourse(courseId: string, dto: CreateAssessmentDto) {
    await this.assertCourseEditable(courseId);

    await this.prisma.$transaction([
      this.prisma.assessment.deleteMany({
        where: { courseId, type: AssessmentType.FINAL_ASSESSMENT },
      }),
      this.prisma.assessment.create({
        data: this.dataFor(dto, { courseId, type: AssessmentType.FINAL_ASSESSMENT }),
      }),
    ]);

    return this.findByCourse(courseId, false);
  }

  /** Course-level (final) assessment — kept for backward compatibility with the current frontend. */
  async create(courseId: string, dto: CreateAssessmentDto) {
    return this.prisma.assessment.create({
      data: this.dataFor(dto, { courseId, type: AssessmentType.FINAL_ASSESSMENT }),
      include: assessmentInclude,
    });
  }

  /** Module-level assessment (knowledge check — must be submitted to unlock the next module). */
  async createForModule(courseId: string, moduleId: string, dto: CreateAssessmentDto) {
    await this.assertCourseEditable(courseId);
    await this.assertModuleInCourse(courseId, moduleId);

    const existing = await this.prisma.assessment.findFirst({
      where: { moduleId, type: AssessmentType.MODULE_ASSESSMENT },
    });
    if (existing) {
      throw new ForbiddenException('This module already has an assessment');
    }

    return this.prisma.assessment.create({
      data: this.dataFor(dto, { courseId, moduleId, type: AssessmentType.MODULE_ASSESSMENT }),
      include: assessmentInclude,
    });
  }

  /** Lesson assessment. Only parent lessons can have assessments. */
  async createForLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    dto: CreateAssessmentDto,
  ) {
    await this.assertCourseEditable(courseId);
    const lesson = await this.assertLessonInModule(moduleId, lessonId);

    if (lesson.parentId) {
      throw new BadRequestException(
        'Sub-lessons cannot have assessments. Assessments are only supported at lesson, module, and course final levels.',
      );
    }

    const type = AssessmentType.LESSON_ASSESSMENT;

    const existing = await this.prisma.assessment.findFirst({
      where: { lessonId, type },
    });
    if (existing) {
      throw new ForbiddenException('This lesson already has an assessment');
    }

    return this.prisma.assessment.create({
      data: this.dataFor(dto, { courseId, moduleId, lessonId, type }),
      include: assessmentInclude,
    });
  }

  async update(id: string, dto: CreateAssessmentDto) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    return this.prisma.assessment.update({
      where: { id },
      data: this.dataFor(dto, {}),
      include: assessmentInclude,
    });
  }

  async getAttempts(assessmentId: string, user: AuthenticatedUser) {
    const isLearner = user.roles.includes('LEARNER');
    return this.prisma.assessmentAttempt.findMany({
      where: {
        assessmentId,
        ...(isLearner ? { userId: user.id } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Taking                                                            */
  /* ------------------------------------------------------------------ */

  private async assertEnrolled(courseId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
      throw new ForbiddenException('You must be enrolled in this course to take this assessment');
    }
  }

  private async assertFinalEligible(courseId: string, userId: string) {
    const modules = await this.prisma.curriculumModule.findMany({
      where: { courseId, deletedAt: null },
      select: { id: true, lessons: { where: { deletedAt: null }, select: { id: true } } },
    });
    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length > 0) {
      const completedCount = await this.prisma.lessonCompletion.count({
        where: { userId, lessonId: { in: lessonIds }, completed: true },
      });
      if (completedCount < lessonIds.length) {
        throw new ForbiddenException(
          'Prerequisite course content must be completed before taking the final assessment',
        );
      }
    }
  }

  /** Non-final assessments may be taken once their target content is unlocked. */
  private async assertTargetUnlocked(
    assessment: {
      type: AssessmentType;
      courseId: string;
      moduleId: string | null;
      lessonId: string | null;
    },
    userId: string,
  ) {
    const { moduleUnlocked, lessonUnlocked } = await this.progressService.getUnlockState(
      userId,
      assessment.courseId,
    );

    if (assessment.type === AssessmentType.MODULE_ASSESSMENT && assessment.moduleId) {
      if (!(moduleUnlocked.get(assessment.moduleId) ?? false)) {
        throw new ForbiddenException(
          'This module is still locked. Complete the preceding modules first.',
        );
      }
    }

    if (
      assessment.type === AssessmentType.LESSON_ASSESSMENT &&
      assessment.lessonId
    ) {
      if (!(lessonUnlocked.get(assessment.lessonId) ?? false)) {
        throw new ForbiddenException(
          'This lesson is still locked. Complete the preceding lessons first.',
        );
      }
    }
  }

  private isLearner(userOrId: string | AuthenticatedUser) {
    if (typeof userOrId === 'string') return true;
    const roleSet = new Set(userOrId.roles ?? []);
    return roleSet.has(RoleName.LEARNER) && !STAFF_ROLES.some((r) => roleSet.has(r));
  }

  async startAttempt(assessmentId: string, userOrId: string | AuthenticatedUser) {
    const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
    const learner = this.isLearner(userOrId);

    const assessment = await this.findById(assessmentId, true);

    if (learner) {
      await this.assertEnrolled(assessment.courseId, userId);
      if (assessment.type === AssessmentType.FINAL_ASSESSMENT) {
        await this.assertFinalEligible(assessment.courseId, userId);
      } else {
        await this.assertTargetUnlocked(assessment, userId);
      }
    }

    const pending = await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentId, userId, submittedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (pending) {
      if (assessment.timeLimitMinutes) {
        const elapsedSec = (Date.now() - new Date(pending.startedAt).getTime()) / 1000;
        const limitSec = assessment.timeLimitMinutes * 60;

        if (elapsedSec > limitSec) {
          // Time expired! Server-side auto-submission of pending attempt
          // Pending attempts store no answers yet; older rows hold `{}` rather than `[]`.
          const saved = Array.isArray(pending.answers) ? pending.answers : [];
          await this.submit(assessmentId, userId, {
            answers: saved as Array<Record<string, unknown>>,
          });
          await this.assertRetakeAllowed(assessmentId, userId, assessment.maxAttempts);
        } else {
          return {
            attemptId: pending.id,
            attemptNumber: pending.attemptNumber,
            startedAt: pending.startedAt,
            timeLimitMinutes: assessment.timeLimitMinutes,
            remainingSeconds: Math.max(0, Math.round(limitSec - elapsedSec)),
          };
        }
      } else {
        return {
          attemptId: pending.id,
          attemptNumber: pending.attemptNumber,
          startedAt: pending.startedAt,
        };
      }
    }

    await this.assertRetakeAllowed(assessmentId, userId, assessment.maxAttempts);
    const submittedCount = await this.prisma.assessmentAttempt.count({
      where: { assessmentId, userId, submittedAt: { not: null } },
    });

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        userId,
        attemptNumber: submittedCount + 1,
        score: 0,
        passed: false,
        answers: [],
        startedAt: new Date(),
      },
    });

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      timeLimitMinutes: assessment.timeLimitMinutes,
      remainingSeconds: assessment.timeLimitMinutes ? assessment.timeLimitMinutes * 60 : undefined,
    };
  }

  private async completeLessonOnSubmission(userId: string, lessonId: string, moduleId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, parentId: true },
    });
    if (!lesson) return;

    await this.prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completed: true, completedAt: new Date(), lastAccessed: new Date() },
      create: { userId, lessonId, completed: true, completedAt: new Date() },
    });

    // Taking a lesson-level assessment also completes any of its sub-lessons so
    // the sequential unlock logic sees the lesson as done.
    const subLessons = lesson.parentId
      ? []
      : await this.prisma.lesson.findMany({
          where: { parentId: lessonId, deletedAt: null },
          select: { id: true },
        });
    for (const sub of subLessons) {
      await this.prisma.lessonCompletion.upsert({
        where: { userId_lessonId: { userId, lessonId: sub.id } },
        update: { completed: true, completedAt: new Date(), lastAccessed: new Date() },
        create: { userId, lessonId: sub.id, completed: true, completedAt: new Date() },
      });
    }

    // A sub-lesson assessment completes its parent lesson once all siblings are done
    if (lesson.parentId) {
      const siblings = await this.prisma.lesson.findMany({
        where: { parentId: lesson.parentId, deletedAt: null },
        select: { id: true },
      });
      const done = await this.prisma.lessonCompletion.count({
        where: { userId, lessonId: { in: siblings.map((s) => s.id) }, completed: true },
      });
      if (done === siblings.length) {
        await this.prisma.lessonCompletion.upsert({
          where: { userId_lessonId: { userId, lessonId: lesson.parentId } },
          update: { completed: true, completedAt: new Date(), lastAccessed: new Date() },
          create: { userId, lessonId: lesson.parentId, completed: true, completedAt: new Date() },
        });
      }
    }

    // The module completion / certificate cascade is the single shared
    // implementation on ProgressService — it re-checks the module's own
    // time and (if present) module-assessment policy rather than
    // unconditionally marking the module complete.
    await this.progressService.maybeCompleteModule(userId, moduleId);
  }

  async submit(assessmentId: string, userId: string, dto: SubmitAssessmentDto) {
    const assessment = await this.findById(assessmentId, true);
    const questions = assessment.questions as unknown as GradableQuestion[];
    const assessmentCourseId = assessment.courseId;
    const isFinal = assessment.type === AssessmentType.FINAL_ASSESSMENT;

    const pending = await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentId, userId, submittedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending) {
      await this.assertRetakeAllowed(assessmentId, userId, assessment.maxAttempts);
    }

    const gradedAnswers = gradeAnswers(questions, dto.answers);
    const { score, passed, correctCount } = computeResult(
      gradedAnswers,
      questions.length,
      assessment.passingScore,
    );
    const now = new Date();
    const startedAt = pending?.startedAt ?? new Date(now.getTime() - 60000);
    let timeSpentSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
    if (assessment.timeLimitMinutes) {
      timeSpentSeconds = Math.min(timeSpentSeconds, assessment.timeLimitMinutes * 60);
    }

    let attempt;

    if (pending) {
      attempt = await this.prisma.assessmentAttempt.update({
        where: { id: pending.id },
        data: {
          score,
          passed,
          answers: gradedAnswers as unknown as Prisma.InputJsonValue,
          submittedAt: now,
          timeSpentSeconds,
        },
      });
    } else {
      const submittedCount = await this.prisma.assessmentAttempt.count({
        where: { assessmentId, userId, submittedAt: { not: null } },
      });
      attempt = await this.prisma.assessmentAttempt.create({
        data: {
          assessmentId,
          userId,
          attemptNumber: submittedCount + 1,
          score,
          passed,
          answers: gradedAnswers as unknown as Prisma.InputJsonValue,
          startedAt,
          submittedAt: now,
          timeSpentSeconds,
        },
      });
    }

    try {
      await this.notificationsService.send(
        userId,
        NotificationType.ASSESSMENT_GRADED,
        {
          en: isFinal
            ? passed
              ? 'Final assessment passed'
              : 'Final assessment result'
            : 'Quiz completed',
          am: passed ? 'ፈተና አልፈዋል' : 'የፈተና ውጤት',
        },
        {
          en: `You scored ${score}% on "${assessment.titleEn}" and ${passed ? 'passed' : 'did not pass'}.`,
          am: `በ"${assessment.titleAm}" ${score}% አስመዝግበዋል እና ${passed ? 'አልፈዋል' : 'አላለፉም'}.`,
        },
        { assessmentId, score, passed, type: assessment.type },
      );
    } catch {
      // notification failure is non-fatal
    }

    // Non-final assessments gate content progression: only a PASS completes
    // the lesson/module. A fail leaves the item locked so the learner must
    // review and retry.
    if (!isFinal && passed) {
      try {
        if (assessment.type === AssessmentType.MODULE_ASSESSMENT && assessment.moduleId) {
          await this.progressService.maybeCompleteModule(userId, assessment.moduleId);
        }
        if (
          assessment.type === AssessmentType.LESSON_ASSESSMENT &&
          assessment.lessonId &&
          assessment.moduleId
        ) {
          await this.completeLessonOnSubmission(userId, assessment.lessonId, assessment.moduleId);
        }
      } catch {
        // completion is non-fatal
      }
    }

    // Final assessment drives course completion + certificate (pass required).
    // `maybeCompleteCourse` re-checks that all lessons are complete and the
    // final assessment is passed before marking the enrollment COMPLETED and
    // issuing the certificate.
    if (isFinal && passed) {
      try {
        await this.progressService.maybeCompleteCourse(userId, assessmentCourseId);
      } catch {
        // completion/certificate issuance is non-fatal
      }
    }

    const review = this.buildReview(
      questions as unknown as Array<Record<string, any>>,
      gradedAnswers,
    );

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
      review,
    };
  }

  private buildReview(
    questions: Array<Record<string, any>>,
    graded: GradedAnswer[],
  ): Array<{
    questionId: string;
    type?: string;
    question?: string;
    options?: string[];
    imageUrl?: string | null;
    selectedOption?: number | string;
    correctAnswer?: number | string;
    isCorrect: boolean;
  }> {
    const byId = new Map(graded.map((g) => [g.questionId, g]));
    return questions.map((q) => {
      const g = byId.get(q.id);
      return {
        questionId: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        imageUrl: q.imageUrl ?? null,
        selectedOption: g?.selectedOption,
        correctAnswer: q.correctAnswer,
        isCorrect: g?.isCorrect ?? false,
      };
    });
  }

  async gradingSummary(assessmentId: string) {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { assessmentId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: [{ userId: 'asc' }, { attemptNumber: 'desc' }],
    });

    return attempts;
  }
}
