import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentType, EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
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

export interface AttachedAssessmentInfo {
  id: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  passed: boolean;
}

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly certificatesService: CertificatesService,
    private readonly policyService: PolicyService,
  ) {}

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
    // Load every assessment attached to this course along with whether the learner has passed it.
    const assessments = await this.prisma.assessment.findMany({
      where: { courseId },
      include: {
        attempts: { where: { userId, passed: true }, take: 1 },
      },
    });
    const toAssessmentInfo = (a: (typeof assessments)[number]): AttachedAssessmentInfo => ({
      id: a.id,
      titleEn: a.titleEn,
      titleAm: a.titleAm,
      passingScore: a.passingScore,
      passed: a.attempts.length > 0,
    });
    const moduleAssessmentByModuleId = new Map<string, AttachedAssessmentInfo>();
    const lessonAssessmentByLessonId = new Map<string, AttachedAssessmentInfo>();
    let finalAssessment: AttachedAssessmentInfo | null = null;
    for (const a of assessments) {
      if (a.type === AssessmentType.MODULE_ASSESSMENT && a.moduleId) {
        moduleAssessmentByModuleId.set(a.moduleId, toAssessmentInfo(a));
      } else if (a.type === AssessmentType.LESSON_ASSESSMENT && a.lessonId) {
        lessonAssessmentByLessonId.set(a.lessonId, toAssessmentInfo(a));
      } else if (a.type === AssessmentType.FINAL_ASSESSMENT) {
        finalAssessment = toAssessmentInfo(a);
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

    const { moduleUnlocked, lessonUnlocked } = computeSequentialUnlocks(
      unlockModules,
      moduleCompletions,
      lessonCompletions,
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
        titleEn: module.titleEn,
        titleAm: module.titleAm,
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
            titleEn: lesson.titleEn,
            titleAm: lesson.titleAm,
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
                titleEn: sub.titleEn,
                titleAm: sub.titleAm,
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

    const contentCompleted = totalLessons > 0 && completedLessons === totalLessons;
    const finalAssessmentRequired = finalAssessment !== null;
    const finalAssessmentPassed = finalAssessment?.passed ?? false;

    return {
      courseId,
      stats: {
        totalModules: modules.length,
        totalLessons,
        completedLessons,
        unlockedLessons,
        overallPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
      modules: moduleProgress,
      courseCompletion: {
        contentCompleted,
        finalAssessmentRequired,
        finalAssessmentPassed,
        certificateEligible:
          contentCompleted && (!finalAssessmentRequired || finalAssessmentPassed),
        finalAssessment,
      },
    };
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

    return computeSequentialUnlocks(unlockModules, moduleCompletions, lessonCompletions);
  }

  private async assertLessonUnlocked(
    userId: string,
    lesson: { id: string; moduleId: string; module: { courseId: string } },
  ) {
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

    const cappedDelta = Math.min(Math.max(secondsDelta, 0), 300);

    const completion = await this.prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        timeSpentSeconds: { increment: cappedDelta },
        lastAccessed: new Date(),
      },
      create: {
        userId,
        lessonId,
        timeSpentSeconds: cappedDelta,
        lastAccessed: new Date(),
      },
    });

    const ratio = await this.policyService.getTimeRatio();
    return {
      lessonId,
      timeSpentSeconds: completion.timeSpentSeconds,
      requiredSeconds: requiredSeconds(lesson.durationMinutes, ratio),
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
              create: { userId, lessonId: lesson.parentId, completed: true, completedAt: new Date() },
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

    const finalAssessment = await this.prisma.assessment.findFirst({
      where: { courseId, type: AssessmentType.FINAL_ASSESSMENT },
      select: { id: true },
    });
    if (finalAssessment) {
      const passed = await this.prisma.assessmentAttempt.findFirst({
        where: { assessmentId: finalAssessment.id, userId, passed: true },
      });
      if (!passed) return;
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
    const [modules, enrollments] = await Promise.all([
      this.prisma.curriculumModule.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          lessons: { select: { id: true } },
        },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId, status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completions = await this.prisma.lessonCompletion.findMany({
      where: { lessonId: { in: lessonIds }, completed: true },
      select: { userId: true, lessonId: true },
    });

    const countByUser = new Map<string, number>();
    for (const completion of completions) {
      countByUser.set(completion.userId, (countByUser.get(completion.userId) ?? 0) + 1);
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
          progressPercent: totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0,
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
