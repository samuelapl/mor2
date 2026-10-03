import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentType, EnrollmentStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  computeCourseGrade,
  computeProgressPercent,
  countsTowardProgress,
  isAssessmentPassed,
  isSessionQuizClosed,
  SESSION_PLAN_STATUS_SELECT,
  computeSequentialUnlocks,
  isTimeSatisfied,
  loadUserCompletionState,
  requiredSeconds,
  sumLessonTime,
} from '@common/utils';
import { MarkLessonCompleteDto } from './dto';
import { EnrollmentsService } from '@modules/enrollments/enrollments.service';
import { CertificatesService } from '@modules/certificates/certificates.service';
import { PolicyService } from '@modules/policy/policy.service';
import { NotificationsService } from '@modules/notifications/notifications.service';

export interface AttachedAssessmentInfo {
  id: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  passed: boolean;
  weight?: number;
  bestScore?: number;
  earnedPoints?: number;
  /** False when the learner never submitted an attempt (counts as 0 in the course grade). */
  attempted?: boolean;
  /** AssessmentType, so session quizzes can be labelled (they are graded live, not retaken). */
  type?: string;
  attemptsUsed?: number;
  maxAttempts?: number;
  /** Whether the learner can still take another attempt (attempts left, or a retake cooldown applies). */
  retakeAvailable?: boolean;
}

export interface LearnerSessionInfo {
  /** Plan id for planned sessions, otherwise the session id. */
  id: string;
  /** Null until a planned session is scheduled. */
  sessionId: string | null;
  titleEn: string;
  scheduledAt: string | null;
  durationMinutes: number | null;
  platform: string | null;
  trainerName: string | null;
  status: 'TO_BE_SCHEDULED' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  attended: boolean;
  /** Planned with the course (may carry a graded quiz; details are not exposed to learners). */
  planned: boolean;
}

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly certificatesService: CertificatesService,
    private readonly policyService: PolicyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Tells a learner who finished the content and passed every assessment that their
   * weighted course grade is below the certificate requirement. Sent once per distinct
   * grade, so retaking and improving (or staying put) never spams them.
   */
  private async notifyCertificateGradeNotMet(userId: string, courseId: string, grade: number, required: number) {
    try {
      const last = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: NotificationType.CERTIFICATE_GRADE_NOT_MET,
          metadata: { path: ['courseId'], equals: courseId },
        },
        orderBy: { createdAt: 'desc' },
      });
      if ((last?.metadata as { grade?: number } | null)?.grade === grade) return;

      const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
      const title = course?.title ?? 'this course';
      await this.notificationsService.send(
        userId,
        NotificationType.CERTIFICATE_GRADE_NOT_MET,
        { en: `Certificate not yet earned: ${title}`, am: `ሰርተፊኬት ገና አልተገኘም፦ ${title}` },
        {
          en: `You missed the certificate for ${title}: your course grade is ${grade}%, and ${required}% is required. Improve your other assessments or contact support.`,
          am: `ለ${title} ሰርተፊኬቱን አላገኙም፦ የኮርስ ውጤትዎ ${grade}% ነው፤ ${required}% ያስፈልጋል። ሌሎች ምዘናዎችን ያሻሽሉ ወይም ድጋፍ ያግኙ።`,
        },
        { courseId, grade, required, link: `/learner/courses/${courseId}/learn` },
      );
    } catch {
      // Best-effort: a notification failure must never block progress tracking.
    }
  }

  async getCourseProgress(userId: string, courseId: string) {
    const ratio = await this.policyService.getTimeRatio();
    const modules = await this.prisma.curriculumModule.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: { deletedAt: null, parentId: null },
          orderBy: { order: 'asc' },
          include: {
            completions: {
              where: { userId },
              take: 1,
            },
            subLessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              include: {
                completions: {
                  where: { userId },
                  take: 1,
                },
              },
            },
          },
        },
        completions: {
          where: { userId },
          take: 1,
        },
      },
    });

    // Bring `ModuleCompletion` rows up to date (lesson completions, time
    // policy, and module assessment) before it is used as the source of
    // truth for sequential unlocking.
    await this.reconcileModuleCompletions(
      userId,
      modules.map((m) => m.id),
    );

    const allLessonIds = modules.flatMap((m) =>
      m.lessons.flatMap((l) => [l.id, ...(l.subLessons ?? []).map((s) => s.id)]),
    );
    const { moduleCompletions, lessonCompletions } = await loadUserCompletionState(
      this.prisma,
      userId,
      modules.map((m) => m.id),
      allLessonIds,
    );
    // Load every assessment attached to this course along with attempts for weighted scoring
    const assessments = (
      await this.prisma.assessment.findMany({
        where: { courseId },
        include: {
          attempts: {
            where: { userId, submittedAt: { not: null } },
            orderBy: { score: 'desc' },
          },
          sessionPlan: SESSION_PLAN_STATUS_SELECT,
        },
      })
    ).map((a) => ({ ...a, closed: a.type === AssessmentType.SESSION_ASSESSMENT ? isSessionQuizClosed(a) : undefined }));

    const [globalPassingScore, retakeCooldownMinutes] = await Promise.all([
      this.policyService.getPassingScorePercent(),
      this.policyService.getRetakeCooldownMinutes(),
    ]);
    const grade = computeCourseGrade(assessments, globalPassingScore);

    const assessmentInfos: AttachedAssessmentInfo[] = assessments.map((a, i) => {
      const g = grade.assessments[i]!;
      return {
        id: a.id,
        titleEn: a.titleEn,
        titleAm: a.titleAm,
        passingScore: g.passingScore,
        passed: g.passed,
        weight: g.weight,
        bestScore: g.bestScore,
        earnedPoints: g.earnedPoints,
        attempted: g.attempted,
        type: a.type,
        attemptsUsed: a.attempts.length,
        maxAttempts: a.maxAttempts,
        // Session quizzes run live once; they cannot be retaken from the classroom.
        retakeAvailable:
          a.type !== 'SESSION_ASSESSMENT' && (a.attempts.length < a.maxAttempts || retakeCooldownMinutes > 0),
      };
    });
    const assessmentInfoMap = new Map<string, AttachedAssessmentInfo>();
    for (const info of assessmentInfos) {
      assessmentInfoMap.set(info.id, info);
    }

    const moduleAssessmentByModuleId = new Map<string, AttachedAssessmentInfo>();
    const lessonAssessmentByLessonId = new Map<string, AttachedAssessmentInfo>();
    let finalAssessment: AttachedAssessmentInfo | null = null;
    for (const a of assessments) {
      const info = assessmentInfoMap.get(a.id)!;
      if (a.type === AssessmentType.MODULE_ASSESSMENT && a.moduleId) {
        moduleAssessmentByModuleId.set(a.moduleId, info);
      } else if (a.type === AssessmentType.LESSON_ASSESSMENT && a.lessonId) {
        lessonAssessmentByLessonId.set(a.lessonId, info);
      } else if (a.type === AssessmentType.FINAL_ASSESSMENT) {
        finalAssessment = info;
      }
    }

    const unlockModules = modules.map((m) => ({
      id: m.id,
      order: m.order,
      lessons: m.lessons.map((l) => {
        const ass = lessonAssessmentByLessonId.get(l.id);
        return {
          id: l.id,
          order: l.order,
          subLessons: l.subLessons,
          hasAssessment: !!ass,
          assessmentPassed: ass?.passed ?? false,
        };
      }),
    }));

    const progressionMode = await this.policyService.getProgressionMode();

    const { moduleUnlocked, lessonUnlocked } = computeSequentialUnlocks(
      unlockModules,
      moduleCompletions,
      lessonCompletions,
      progressionMode,
    );

    let totalLessons = 0;
    let completedLessons = 0;
    let unlockedLessons = 0;

    const moduleProgress = modules.map((module) => {
      const lessonsInModule = module.lessons.reduce(
        (sum, l) => sum + (l.subLessons && l.subLessons.length > 0 ? l.subLessons.length : 1),
        0,
      );
      const completedInModule = module.lessons.reduce((sum, l) => {
        if (l.subLessons && l.subLessons.length > 0) {
          return sum + l.subLessons.filter((s) => s.completions[0]?.completed).length;
        }
        return sum + (l.completions[0]?.completed ? 1 : 0);
      }, 0);
      const unlockedInModule = module.lessons.reduce((sum, l) => {
        if (l.subLessons && l.subLessons.length > 0) {
          return sum + l.subLessons.filter((s) => lessonUnlocked.get(s.id)).length;
        }
        return sum + (lessonUnlocked.get(l.id) ? 1 : 0);
      }, 0);

      totalLessons += lessonsInModule;
      completedLessons += completedInModule;
      unlockedLessons += unlockedInModule;

      const moduleTimeSpent = sumLessonTime(
        module.lessons.flatMap((l) => [
          { timeSpentSeconds: l.completions[0]?.timeSpentSeconds ?? 0 },
          ...(l.subLessons ?? []).map((s) => ({
            timeSpentSeconds: s.completions[0]?.timeSpentSeconds ?? 0,
          })),
        ]),
      );

      return {
        moduleId: module.id,
        title: module.title,
        titleEn: module.title,
        titleAm: module.title,
        order: module.order,
        unlocked: moduleUnlocked.get(module.id) ?? false,
        totalLessons: lessonsInModule,
        completedLessons: completedInModule,
        unlockedLessons: unlockedInModule,
        moduleCompleted: module.completions[0]?.completed ?? false,
        progressPercent:
          lessonsInModule > 0 ? Math.round((completedInModule / lessonsInModule) * 100) : 0,
        durationMinutes: module.durationMinutes,
        timeSpentSeconds: moduleTimeSpent,
        requiredSeconds: requiredSeconds(module.durationMinutes, ratio),
        timeSatisfied: isTimeSatisfied(moduleTimeSpent, module.durationMinutes, ratio),
        assessment: moduleAssessmentByModuleId.get(module.id) ?? null,
        lessons: module.lessons.map((lesson) => {
          const timeSpentSeconds = lesson.completions[0]?.timeSpentSeconds ?? 0;
          return {
            lessonId: lesson.id,
            title: lesson.title,
            titleEn: lesson.title,
            titleAm: lesson.title,
            order: lesson.order,
            unlocked: lessonUnlocked.get(lesson.id) ?? false,
            completed: lesson.completions[0]?.completed ?? false,
            lastPosition: lesson.completions[0]?.lastPosition ?? 0,
            durationMinutes: lesson.durationMinutes,
            timeSpentSeconds,
            requiredSeconds: requiredSeconds(lesson.durationMinutes, ratio),
            timeSatisfied: isTimeSatisfied(timeSpentSeconds, lesson.durationMinutes, ratio),
            assessment: lessonAssessmentByLessonId.get(lesson.id) ?? null,
            subLessons: (lesson.subLessons ?? []).map((sub) => {
              const subTimeSpentSeconds = sub.completions[0]?.timeSpentSeconds ?? 0;
              return {
                lessonId: sub.id,
                title: sub.title,
                titleEn: sub.title,
                titleAm: sub.title,
                order: sub.order,
                unlocked: lessonUnlocked.get(sub.id) ?? false,
                completed: sub.completions[0]?.completed ?? false,
                durationMinutes: sub.durationMinutes,
                timeSpentSeconds: subTimeSpentSeconds,
                requiredSeconds: requiredSeconds(sub.durationMinutes, ratio),
                timeSatisfied: isTimeSatisfied(subTimeSpentSeconds, sub.durationMinutes, ratio),
                assessment: null,
              };
            }),
          };
        }),
      };
    });

    // Lesson, module and final assessments count as progress items once passed.
    const progressAssessments = grade.assessments.filter((_, i) =>
      countsTowardProgress(assessments[i]!.type),
    );
    const totalAssessments = progressAssessments.length;
    const passedAssessments = progressAssessments.filter((g) => g.passed).length;

    const contentCompleted = totalLessons > 0 && completedLessons === totalLessons;
    const finalAssessmentRequired = finalAssessment !== null;
    const finalAssessmentPassed = finalAssessment?.passed ?? false;
    const { totalCourseGrade, allAssessmentsPassed, gradeSatisfied } = grade;

    return {
      courseId,
      progressionMode,
      stats: {
        totalModules: modules.length,
        totalLessons,
        completedLessons,
        unlockedLessons,
        totalAssessments,
        passedAssessments,
        overallPercent: computeProgressPercent({
          totalLessons,
          completedLessons,
          totalAssessments,
          passedAssessments,
        }),
      },
      modules: moduleProgress,
      courseCompletion: {
        contentCompleted,
        finalAssessmentRequired,
        finalAssessmentPassed,
        allAssessmentsPassed,
        totalCourseGrade,
        passingScorePercent: globalPassingScore,
        gradeSatisfied,
        certificateEligible:
          contentCompleted &&
          (!finalAssessmentRequired || finalAssessmentPassed) &&
          grade.certificateReady,
        /** Session quizzes still waiting for their session; the certificate waits for them. */
        sessionsPending: grade.sessionsPending,
        finalAssessment,
        assessmentBreakdown: assessmentInfos,
      },
      liveSessions: await this.learnerSessions(userId, courseId),
    };
  }

  /**
   * The course's online sessions as a learner sees them: planned ones (even before they are
   * scheduled) in plan order, then any extra sessions. No quiz details are exposed.
   */
  private async learnerSessions(userId: string, courseId: string): Promise<LearnerSessionInfo[]> {
    const [plans, sessions] = await Promise.all([
      this.prisma.courseSessionPlan.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        select: { id: true, titleEn: true, liveSession: { select: { id: true, deletedAt: true } } },
      }),
      this.prisma.liveSession.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { scheduledAt: 'asc' },
        select: {
          id: true,
          sessionPlanId: true,
          titleEn: true,
          scheduledAt: true,
          durationMinutes: true,
          platform: true,
          status: true,
          trainer: { select: { firstName: true, lastName: true } },
          attendees: { where: { userId }, select: { status: true } },
        },
      }),
    ]);

    const toInfo = (s: (typeof sessions)[number], planId: string | null): LearnerSessionInfo => ({
      id: planId ?? s.id,
      sessionId: s.id,
      titleEn: s.titleEn,
      scheduledAt: s.scheduledAt.toISOString(),
      durationMinutes: s.durationMinutes,
      platform: s.platform,
      trainerName: s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}`.trim() : null,
      status: s.status,
      attended: s.attendees.some((a) => a.status === 'PRESENT' || a.status === 'LATE'),
      planned: planId !== null,
    });

    const byId = new Map(sessions.map((s) => [s.id, s]));
    const planned = plans.map((p): LearnerSessionInfo => {
      const live = p.liveSession && !p.liveSession.deletedAt ? byId.get(p.liveSession.id) : undefined;
      return live
        ? toInfo(live, p.id)
        : {
            id: p.id,
            sessionId: null,
            titleEn: p.titleEn,
            scheduledAt: null,
            durationMinutes: null,
            platform: null,
            trainerName: null,
            status: 'TO_BE_SCHEDULED',
            attended: false,
            planned: true,
          };
    });
    const extra = sessions.filter((s) => !s.sessionPlanId).map((s) => toInfo(s, null));
    return [...planned, ...extra];
  }

  /**
   * Runs `maybeCompleteModule` for every module so `ModuleCompletion` rows
   * reflect the current lesson/time/assessment state before they are used
   * as the source of truth for sequential unlocking.
   */
  async reconcileModuleCompletions(userId: string, moduleIds: string[]) {
    for (const moduleId of moduleIds) {
      await this.maybeCompleteModule(userId, moduleId);
    }
  }

  private async loadUnlockContext(userId: string, courseId: string) {
    const modules = await this.prisma.curriculumModule.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: { deletedAt: null, parentId: null },
          orderBy: { order: 'asc' },
          include: {
            subLessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    await this.reconcileModuleCompletions(
      userId,
      modules.map((m) => m.id),
    );

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId, type: AssessmentType.LESSON_ASSESSMENT },
      include: {
        attempts: { where: { userId, passed: true }, take: 1 },
      },
    });
    const lessonAssessmentMap = new Map<string, { hasAssessment: boolean; passed: boolean }>();
    for (const a of assessments) {
      if (a.lessonId) {
        lessonAssessmentMap.set(a.lessonId, {
          hasAssessment: true,
          passed: a.attempts.length > 0,
        });
      }
    }

    const unlockModules = modules.map((m) => ({
      id: m.id,
      order: m.order,
      lessons: m.lessons.map((l) => {
        const ass = lessonAssessmentMap.get(l.id);
        return {
          id: l.id,
          order: l.order,
          subLessons: l.subLessons,
          hasAssessment: ass?.hasAssessment ?? false,
          assessmentPassed: ass?.passed ?? false,
        };
      }),
    }));
    const allLessonIds = modules.flatMap((m) =>
      m.lessons.flatMap((l) => [l.id, ...(l.subLessons ?? []).map((s) => s.id)]),
    );
    const { moduleCompletions, lessonCompletions } = await loadUserCompletionState(
      this.prisma,
      userId,
      modules.map((m) => m.id),
      allLessonIds,
    );

    const progressionMode = await this.policyService.getProgressionMode();
    return computeSequentialUnlocks(
      unlockModules,
      moduleCompletions,
      lessonCompletions,
      progressionMode,
    );
  }

  private async assertLessonUnlocked(
    userId: string,
    lesson: { id: string; moduleId: string; module: { courseId: string } },
  ) {
    const progressionMode = await this.policyService.getProgressionMode();
    if (progressionMode === 'OPEN') {
      return;
    }

    const { lessonUnlocked } = await this.loadUnlockContext(userId, lesson.module.courseId);
    if (!(lessonUnlocked.get(lesson.id) ?? false)) {
      throw new ForbiddenException({
        reason: 'LOCKED',
        message: 'This lesson is still locked. Complete the preceding lessons first.',
      });
    }
  }

  /** Public: used by AssessmentsService to gate module/lesson assessment access. */
  async getUnlockState(userId: string, courseId: string) {
    return this.loadUnlockContext(userId, courseId);
  }

  private async assertLessonPolicySatisfied(
    userId: string,
    lesson: {
      id: string;
      durationMinutes: number | null;
      subLessons?: Array<{ id: string; durationMinutes: number | null }>;
    },
  ) {
    const ratio = await this.policyService.getTimeRatio();
    const subLessons = lesson.subLessons ?? [];
    const targetIds = [lesson.id, ...subLessons.map((s) => s.id)];

    const rows = await this.prisma.lessonCompletion.findMany({
      where: { userId, lessonId: { in: targetIds } },
      select: { timeSpentSeconds: true },
    });
    const spent = sumLessonTime(rows);
    const required = lesson.durationMinutes
      ? requiredSeconds(lesson.durationMinutes, ratio)
      : subLessons.reduce((sum, s) => sum + requiredSeconds(s.durationMinutes, ratio), 0);

    if (spent < required) {
      throw new ForbiddenException({
        reason: 'TIME_NOT_MET',
        message: 'Please spend more time on this activity before continuing.',
        remainingSeconds: required - spent,
      });
    }

    const assessments = await this.prisma.assessment.findMany({
      where: {
        lessonId: lesson.id,
        type: AssessmentType.LESSON_ASSESSMENT,
      },
      select: { id: true },
    });

    for (const assessment of assessments) {
      const passed = await this.prisma.assessmentAttempt.findFirst({
        where: { assessmentId: assessment.id, userId, passed: true },
      });
      if (!passed) {
        throw new ForbiddenException({
          reason: 'ASSESSMENT_NOT_PASSED',
          message: 'You must pass the assessment for this activity before continuing.',
        });
      }
    }
  }

  async addLessonTime(userId: string, lessonId: string, secondsDelta: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.assertLessonUnlocked(userId, lesson);

    const ratio = await this.policyService.getTimeRatio();
    const required = requiredSeconds(lesson.durationMinutes, ratio);

    // Study time stops once the lesson's required time is reached; a lesson without a set
    // time keeps counting. Each heartbeat adds at most 5 minutes.
    let delta = Math.min(Math.max(secondsDelta, 0), 300);
    if (required > 0) {
      const existing = await this.prisma.lessonCompletion.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
        select: { timeSpentSeconds: true },
      });
      delta = Math.max(0, Math.min(delta, required - (existing?.timeSpentSeconds ?? 0)));
    }

    const completion = await this.prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        timeSpentSeconds: { increment: delta },
        lastAccessed: new Date(),
      },
      create: {
        userId,
        lessonId,
        timeSpentSeconds: delta,
        lastAccessed: new Date(),
      },
    });

    return {
      lessonId,
      timeSpentSeconds: completion.timeSpentSeconds,
      requiredSeconds: required,
      satisfied: isTimeSatisfied(completion.timeSpentSeconds, lesson.durationMinutes, ratio),
    };
  }

  async markLessonComplete(userId: string, lessonId: string, dto: MarkLessonCompleteDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: true,
        subLessons: { where: { deletedAt: null } },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Sequential-unlock + time + assessment policy enforcement: a lesson can
    // only be completed when unlocked, enough time has been spent on it, and
    // any lesson/sub-lesson assessment attached to it has been passed.
    if (dto.completed) {
      await this.assertLessonUnlocked(userId, lesson);
      await this.assertLessonPolicySatisfied(userId, lesson);
    }

    const completion = await this.prisma.lessonCompletion.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        completed: dto.completed,
        completedAt: dto.completed ? new Date() : null,
        lastPosition: dto.lastPosition,
        lastAccessed: new Date(),
      },
      create: {
        userId,
        lessonId,
        completed: dto.completed,
        completedAt: dto.completed ? new Date() : null,
        lastPosition: dto.lastPosition,
        lastAccessed: new Date(),
      },
    });

    // If this is a parent lesson with sub-lessons, cascade completion status to all its sub-lessons
    const childSubLessons = await this.prisma.lesson.findMany({
      where: { parentId: lesson.id, deletedAt: null },
      select: { id: true },
    });
    if (childSubLessons.length > 0) {
      for (const sub of childSubLessons) {
        await this.prisma.lessonCompletion.upsert({
          where: { userId_lessonId: { userId, lessonId: sub.id } },
          update: {
            completed: dto.completed,
            completedAt: dto.completed ? new Date() : null,
            lastAccessed: new Date(),
          },
          create: {
            userId,
            lessonId: sub.id,
            completed: dto.completed,
            completedAt: dto.completed ? new Date() : null,
          },
        });
      }
    }

    // If this was a sub-lesson, auto-complete/incomplete parent lesson
    if (lesson.parentId) {
      if (dto.completed) {
        const siblingSubLessons = await this.prisma.lesson.findMany({
          where: { parentId: lesson.parentId, deletedAt: null },
          select: { id: true },
        });
        const completedSubsCount = await this.prisma.lessonCompletion.count({
          where: {
            userId,
            lessonId: { in: siblingSubLessons.map((s) => s.id) },
            completed: true,
          },
        });
        if (completedSubsCount === siblingSubLessons.length) {
          const parentAssessment = await this.prisma.assessment.findFirst({
            where: { lessonId: lesson.parentId, type: AssessmentType.LESSON_ASSESSMENT },
            select: { id: true },
          });
          let canCompleteParent = true;
          if (parentAssessment) {
            const passed = await this.prisma.assessmentAttempt.findFirst({
              where: { assessmentId: parentAssessment.id, userId, passed: true },
            });
            canCompleteParent = !!passed;
          }
          if (canCompleteParent) {
            await this.prisma.lessonCompletion.upsert({
              where: { userId_lessonId: { userId, lessonId: lesson.parentId } },
              update: { completed: true, completedAt: new Date(), lastAccessed: new Date() },
              create: {
                userId,
                lessonId: lesson.parentId,
                completed: true,
                completedAt: new Date(),
              },
            });
          }
        }
      } else {
        await this.prisma.lessonCompletion.upsert({
          where: { userId_lessonId: { userId, lessonId: lesson.parentId } },
          update: { completed: false, completedAt: null, lastAccessed: new Date() },
          create: { userId, lessonId: lesson.parentId, completed: false, completedAt: null },
        });
      }
    }

    // Auto-complete module when all lessons are done (and its own policy is satisfied)
    await this.maybeCompleteModule(userId, lesson.moduleId);

    return completion;
  }

  /** Public: also used by AssessmentsService after a module/lesson assessment is passed. */
  async maybeCompleteModule(userId: string, moduleId: string) {
    const currentModule = await this.prisma.curriculumModule.findUnique({
      where: { id: moduleId },
      select: { courseId: true, durationMinutes: true },
    });
    if (!currentModule) return;

    const activeLessons = await this.prisma.lesson.findMany({
      where: { moduleId, deletedAt: null },
      select: { id: true, parentId: true },
    });

    if (activeLessons.length === 0) return;

    const topLevelLessons = activeLessons.filter((l) => l.parentId === null);
    const subLessons = activeLessons.filter((l) => l.parentId !== null);
    const subLessonsByParent = new Map<string, string[]>();
    for (const sub of subLessons) {
      if (!sub.parentId) continue;
      const arr = subLessonsByParent.get(sub.parentId) ?? [];
      arr.push(sub.id);
      subLessonsByParent.set(sub.parentId, arr);
    }

    const completionRows = await this.prisma.lessonCompletion.findMany({
      where: { userId, lessonId: { in: activeLessons.map((l) => l.id) } },
      select: { lessonId: true, completed: true, timeSpentSeconds: true },
    });
    const completedSet = new Set(completionRows.filter((r) => r.completed).map((r) => r.lessonId));

    const lessonsAllDone = topLevelLessons.every((top) => {
      if (completedSet.has(top.id)) return true;
      const subs = subLessonsByParent.get(top.id);
      if (subs && subs.length > 0) {
        return subs.every((subId) => completedSet.has(subId));
      }
      return false;
    });

    const ratio = await this.policyService.getTimeRatio();
    const moduleTimeOk = isTimeSatisfied(
      sumLessonTime(completionRows),
      currentModule.durationMinutes,
      ratio,
    );

    const moduleAssessment = await this.prisma.assessment.findFirst({
      where: { moduleId, type: AssessmentType.MODULE_ASSESSMENT },
      select: { id: true },
    });
    const assessmentOk = moduleAssessment
      ? !!(await this.prisma.assessmentAttempt.findFirst({
          where: { assessmentId: moduleAssessment.id, userId, passed: true },
        }))
      : true;

    const allDone = lessonsAllDone && moduleTimeOk && assessmentOk;

    await this.prisma.moduleCompletion.upsert({
      where: {
        userId_moduleId: { userId, moduleId },
      },
      update: {
        completed: allDone,
        completedAt: allDone ? new Date() : null,
      },
      create: {
        userId,
        moduleId,
        completed: allDone,
        completedAt: allDone ? new Date() : null,
      },
    });

    if (allDone) {
      await this.maybeCompleteCourse(userId, currentModule.courseId);
    }
  }

  /** Public: also used by AssessmentsService after a final assessment is passed. */
  async maybeCompleteCourse(userId: string, courseId: string) {
    const modules = await this.prisma.curriculumModule.findMany({
      where: { courseId, deletedAt: null },
      select: { id: true, lessons: { where: { deletedAt: null }, select: { id: true } } },
    });

    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length === 0) return;

    const completedLessons = await this.prisma.lessonCompletion.count({
      where: { userId, lessonId: { in: lessonIds }, completed: true },
    });

    if (completedLessons !== lessonIds.length) return;

    // Verify all assessments for this course meet the pass mark and cumulative grade
    const assessments = (
      await this.prisma.assessment.findMany({
        where: { courseId },
        include: {
          attempts: {
            where: { userId, submittedAt: { not: null } },
            orderBy: { score: 'desc' },
          },
          sessionPlan: SESSION_PLAN_STATUS_SELECT,
        },
      })
    ).map((a) => ({ ...a, closed: a.type === AssessmentType.SESSION_ASSESSMENT ? isSessionQuizClosed(a) : undefined }));

    const grade = computeCourseGrade(assessments, await this.policyService.getPassingScorePercent());
    if (!grade.allAssessmentsPassed) return; // every assessment must pass on its own mark
    if (grade.sessionsPending > 0) return; // a session quiz is still to come; judge the grade after it
    if (!grade.gradeSatisfied) {
      // Content done and every assessment passed, but the weighted grade is short.
      await this.notifyCertificateGradeNotMet(userId, courseId, grade.totalCourseGrade, grade.requiredGrade);
      return;
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (enrollment && enrollment.status !== EnrollmentStatus.COMPLETED) {
      await this.enrollmentsService.markCompleted(enrollment.id);
    }

    try {
      await this.certificatesService.maybeIssueForCompletion(userId, courseId);
    } catch {
      // certificate issuance is opportunistic and non-fatal
    }
  }

  async getCourseLearnersProgress(courseId: string) {
    const [modules, enrollments, assessments, globalPassMark] = await Promise.all([
      this.prisma.curriculumModule.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          lessons: {
            where: { deletedAt: null, parentId: null },
            select: { id: true, subLessons: { where: { deletedAt: null }, select: { id: true } } },
          },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId, status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.assessment.findMany({
        where: { courseId, type: { not: AssessmentType.SESSION_ASSESSMENT } },
        select: {
          passingScore: true,
          attempts: {
            where: { submittedAt: { not: null } },
            select: { userId: true, score: true, passed: true },
          },
        },
      }),
      this.policyService.getPassingScorePercent(),
    ]);

    // Same items as the learner's own progress: a lesson with sub-lessons counts its sub-lessons.
    const lessonIds = modules.flatMap((m) =>
      m.lessons.flatMap((l) => (l.subLessons.length > 0 ? l.subLessons.map((s) => s.id) : [l.id])),
    );
    const completions = await this.prisma.lessonCompletion.findMany({
      where: { lessonId: { in: lessonIds }, completed: true },
      select: { userId: true, lessonId: true },
    });

    const countByUser = new Map<string, number>();
    for (const completion of completions) {
      countByUser.set(completion.userId, (countByUser.get(completion.userId) ?? 0) + 1);
    }

    const passedByUser = new Map<string, number>();
    for (const assessment of assessments) {
      const attemptsByUser = new Map<string, typeof assessment.attempts>();
      for (const attempt of assessment.attempts) {
        attemptsByUser.set(attempt.userId, [
          ...(attemptsByUser.get(attempt.userId) ?? []),
          attempt,
        ]);
      }
      for (const [userId, attempts] of attemptsByUser) {
        if (
          isAssessmentPassed({ passingScore: assessment.passingScore, attempts }, globalPassMark)
        ) {
          passedByUser.set(userId, (passedByUser.get(userId) ?? 0) + 1);
        }
      }
    }

    const totalLessons = lessonIds.length;

    return {
      courseId,
      totalLessons,
      learners: enrollments.map((enrollment) => {
        const done = countByUser.get(enrollment.userId) ?? 0;
        return {
          userId: enrollment.userId,
          firstName: enrollment.user.firstName,
          lastName: enrollment.user.lastName,
          email: enrollment.user.email,
          status: enrollment.status,
          completedLessons: done,
          progressPercent: computeProgressPercent({
            totalLessons,
            completedLessons: done,
            totalAssessments: assessments.length,
            passedAssessments: passedByUser.get(enrollment.userId) ?? 0,
          }),
        };
      }),
    };
  }

  async getLessonProgress(userId: string, lessonId: string) {
    return this.prisma.lessonCompletion.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });
  }

  async resetCourseProgress(userId: string, courseId: string) {
    const modules = await this.prisma.curriculumModule.findMany({
      where: { courseId, deletedAt: null },
      select: { id: true },
    });

    const moduleIds = modules.map((m) => m.id);

    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId: { in: moduleIds }, deletedAt: null },
      select: { id: true },
    });

    const lessonIds = lessons.map((l) => l.id);

    await this.prisma.$transaction([
      this.prisma.lessonCompletion.deleteMany({
        where: { userId, lessonId: { in: lessonIds } },
      }),
      this.prisma.moduleCompletion.deleteMany({
        where: { userId, moduleId: { in: moduleIds } },
      }),
    ]);

    return { message: 'Course progress reset successfully' };
  }
}
