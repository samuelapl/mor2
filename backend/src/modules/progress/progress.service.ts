import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { computeSequentialUnlocks, loadUserCompletionState } from '@common/utils';
import { MarkLessonCompleteDto } from './dto';
import { EnrollmentsService } from '@modules/enrollments/enrollments.service';
import { CertificatesService } from '@modules/certificates/certificates.service';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async getCourseProgress(userId: string, courseId: string) {
    const modules = await this.prisma.curriculumModule.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },

          include: {
            completions: {
              where: { userId },
              take: 1,
            },
          },
        },
        completions: {
          where: { userId },
          take: 1,
        },
      },
    });

    const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
    const { moduleCompletions, lessonCompletions } = await loadUserCompletionState(
      this.prisma,
      userId,
      modules.map((m) => m.id),
      allLessonIds,
    );
    const { moduleUnlocked, lessonUnlocked } = computeSequentialUnlocks(
      modules,
      moduleCompletions,
      lessonCompletions,
    );

    let totalLessons = 0;
    let completedLessons = 0;
    let unlockedLessons = 0;

    const moduleProgress = modules.map((module) => {
      const lessonsInModule = module.lessons.length;
      const completedInModule = module.lessons.filter((l) => l.completions[0]?.completed).length;
      const unlockedInModule = module.lessons.filter((l) => lessonUnlocked.get(l.id)).length;

      totalLessons += lessonsInModule;
      completedLessons += completedInModule;
      unlockedLessons += unlockedInModule;

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
        lessons: module.lessons.map((lesson) => ({
          lessonId: lesson.id,
          titleEn: lesson.titleEn,
          titleAm: lesson.titleAm,
          order: lesson.order,
          unlocked: lessonUnlocked.get(lesson.id) ?? false,
          completed: lesson.completions[0]?.completed ?? false,
          lastPosition: lesson.completions[0]?.lastPosition ?? 0,
        })),
      };
    });

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
    };
  }

  async markLessonComplete(userId: string, lessonId: string, dto: MarkLessonCompleteDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Sequential-unlock enforcement: a lesson can only be completed when it is
    // actually unlocked (previous module + previous lessons done).
    if (dto.completed) {
      const modules = await this.prisma.curriculumModule.findMany({
        where: { courseId: lesson.module.courseId, deletedAt: null },
        include: { lessons: { where: { deletedAt: null } } },
      });
      const lessonModule = modules.find((m) => m.id === lesson.moduleId);
      if (lessonModule) {
        const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
        const { moduleCompletions, lessonCompletions } = await loadUserCompletionState(
          this.prisma,
          userId,
          modules.map((m) => m.id),
          allLessonIds,
        );
        const { lessonUnlocked } = computeSequentialUnlocks(
          modules,
          moduleCompletions,
          lessonCompletions,
        );
        if (!(lessonUnlocked.get(lessonId) ?? false)) {
          throw new ForbiddenException(
            'This lesson is still locked. Complete the preceding lessons first.',
          );
        }
      }
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

    // Auto-complete module when all lessons are done
    await this.maybeCompleteModule(userId, lesson.moduleId);

    return completion;
  }

  private async maybeCompleteModule(userId: string, moduleId: string) {
    const module = await this.prisma.curriculumModule.findUnique({
      where: { id: moduleId },
      include: { lessons: true },
    });

    if (!module || module.lessons.length === 0) {
      return;
    }

    const completedLessons = await this.prisma.lessonCompletion.count({
      where: {
        userId,
        lessonId: { in: module.lessons.map((l) => l.id) },
        completed: true,
      },
    });

    const allDone = completedLessons === module.lessons.length;

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
      await this.maybeCompleteCourse(userId, module.courseId);
    }
  }

  private async maybeCompleteCourse(userId: string, courseId: string) {
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
