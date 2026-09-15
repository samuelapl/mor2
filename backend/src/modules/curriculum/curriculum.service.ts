import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  ReplaceModulesDto,
} from './dto';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Modules ────────────────────────────────────────
  /** Replaces the entire curriculum (modules + lessons) atomically. Only DRAFT/REJECTED courses. */
  async replaceAll(courseId: string, dto: ReplaceModulesDto) {
    await this.assertCourseEditable(courseId);

    await this.prisma.$transaction(async (tx) => {
      await tx.curriculumModule.deleteMany({ where: { courseId } });

      for (const [index, mod] of dto.modules.entries()) {
        const lessonData = mod.lessons?.map((lesson, idx) => ({
          titleAm: lesson.titleAm ?? lesson.titleEn,
          titleEn: lesson.titleEn,
          contentAm: lesson.contentAm,
          contentEn: lesson.contentEn,
          contentType: (lesson.contentType as any) ?? 'DOCUMENT',
          durationMinutes: lesson.durationMinutes,
          order: idx,
          resourceUrl: lesson.resourceUrl,
        }));

        await tx.curriculumModule.create({
          data: {
            courseId,
            titleAm: mod.titleAm,
            titleEn: mod.titleEn,
            descriptionAm: mod.descriptionAm,
            descriptionEn: mod.descriptionEn,
            order: index,
            passingScore: mod.passingScore,
            lessons: lessonData?.length ? { create: lessonData } : undefined,
          },
        });
      }
    });

    return this.getModules(courseId);
  }

  private async assertCourseEditable(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }
    if (course.status !== CourseStatus.DRAFT && course.status !== CourseStatus.REJECTED) {
      throw new ForbiddenException(
        'Curriculum can only be edited while the course is in DRAFT or REJECTED state',
      );
    }
  }
  async getModules(courseId: string) {
    return this.prisma.curriculumModule.findMany({
      where: { courseId, deletedAt: null },
      orderBy: { order: 'asc' },
      include: {
        lessons: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        attachments: true,
      },
    });
  }

  async getModule(moduleId: string) {
    const module = await this.prisma.curriculumModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
        attachments: true,
      },
    });

    if (!module || module.deletedAt) {
      throw new NotFoundException('Module not found');
    }

    return module;
  }

  async createModule(courseId: string, dto: CreateModuleDto) {
    const lastModule = await this.prisma.curriculumModule.findFirst({
      where: { courseId, deletedAt: null },
      orderBy: { order: 'desc' },
    });

    const order = dto.order ?? (lastModule ? lastModule.order + 1 : 0);

    return this.prisma.curriculumModule.create({
      data: {
        courseId,
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        order,
        passingScore: dto.passingScore,
        lessons: dto.lessons?.length
          ? {
              create: dto.lessons.map((lesson, idx) => ({
                titleAm: lesson.titleAm ?? lesson.titleEn,
                titleEn: lesson.titleEn,
                contentAm: lesson.contentAm,
                contentEn: lesson.contentEn,
                contentType: (lesson.contentType as any) ?? 'DOCUMENT',
                durationMinutes: lesson.durationMinutes,
                order: idx,
                resourceUrl: lesson.resourceUrl,
              })),
            }
          : undefined,
      },
      include: {
        lessons: { orderBy: { order: 'asc' } },
      },
    });
  }

  async updateModule(moduleId: string, dto: UpdateModuleDto) {
    const existing = await this.prisma.curriculumModule.findUnique({
      where: { id: moduleId },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Module not found');
    }

    return this.prisma.curriculumModule.update({
      where: { id: moduleId },
      data: {
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        order: dto.order,
        passingScore: dto.passingScore,
      },
      include: { lessons: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });
  }

  async reorderModules(courseId: string, moduleIds: string[]) {
    await this.prisma.$transaction(
      moduleIds.map((moduleId, index) =>
        this.prisma.curriculumModule.update({
          where: { id: moduleId },
          data: { order: index },
        }),
      ),
    );

    return this.getModules(courseId);
  }

  async deleteModule(moduleId: string) {
    const module = await this.prisma.curriculumModule.findUnique({
      where: { id: moduleId },
    });
    if (!module || module.deletedAt) {
      throw new NotFoundException('Module not found');
    }

    const deleted = await this.prisma.curriculumModule.update({
      where: { id: moduleId },
      data: { deletedAt: new Date() },
    });

    // Renumber remaining modules after the removed slot
    await this.prisma.$transaction(
      (
        await this.prisma.curriculumModule.findMany({
          where: { courseId: module.courseId, deletedAt: null, order: { gt: module.order } },
          orderBy: { order: 'asc' },
        })
      ).map((m, i) =>
        this.prisma.curriculumModule.update({
          where: { id: m.id },
          data: { order: module.order + i },
        }),
      ),
    );

    return {
      message: 'Module soft-deleted successfully',
      moduleId,
      deletedAt: deleted.deletedAt,
    };
  }

  async restoreModule(moduleId: string) {
    await this.prisma.curriculumModule.update({
      where: { id: moduleId },
      data: { deletedAt: null },
    });
    return { message: 'Module restored successfully' };
  }

  async hardDeleteModule(moduleId: string) {
    const module = await this.prisma.curriculumModule.findUnique({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException('Module not found');
    }
    await this.prisma.curriculumModule.delete({ where: { id: moduleId } });
    return { message: 'Module permanently deleted' };
  }

  // ── Lessons ────────────────────────────────────────
  async getLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { attachments: true },
    });

    if (!lesson || lesson.deletedAt) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async createLesson(moduleId: string, dto: CreateLessonDto) {
    const lastLesson = await this.prisma.lesson.findFirst({
      where: { moduleId, deletedAt: null },
      orderBy: { order: 'desc' },
    });

    const order = dto.order ?? (lastLesson ? lastLesson.order + 1 : 0);

    return this.prisma.lesson.create({
      data: {
        moduleId,
        titleAm: dto.titleAm ?? dto.titleEn,
        titleEn: dto.titleEn,
        contentAm: dto.contentAm,
        contentEn: dto.contentEn,
        contentType: dto.contentType,
        durationMinutes: dto.durationMinutes,
        order,
        resourceUrl: dto.resourceUrl,
      },
    });
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto) {
    const existing = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Lesson not found');
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        contentAm: dto.contentAm,
        contentEn: dto.contentEn,
        contentType: dto.contentType,
        durationMinutes: dto.durationMinutes,
        order: dto.order,
        resourceUrl: dto.resourceUrl,
      },
    });
  }

  async reorderLessons(moduleId: string, lessonIds: string[]) {
    await this.prisma.$transaction(
      lessonIds.map((lessonId, index) =>
        this.prisma.lesson.update({
          where: { id: lessonId },
          data: { order: index },
        }),
      ),
    );

    return this.prisma.lesson.findMany({
      where: { moduleId, deletedAt: null },
      orderBy: { order: 'asc' },
    });
  }

  async deleteLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.deletedAt) {
      throw new NotFoundException('Lesson not found');
    }

    const deleted = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.$transaction(
      (
        await this.prisma.lesson.findMany({
          where: { moduleId: lesson.moduleId, deletedAt: null, order: { gt: lesson.order } },
          orderBy: { order: 'asc' },
        })
      ).map((l, i) =>
        this.prisma.lesson.update({
          where: { id: l.id },
          data: { order: lesson.order + i },
        }),
      ),
    );

    return {
      message: 'Lesson soft-deleted successfully',
      lessonId,
      deletedAt: deleted.deletedAt,
    };
  }

  async restoreLesson(lessonId: string) {
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: null },
    });
    return { message: 'Lesson restored successfully' };
  }

  async hardDeleteLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { message: 'Lesson permanently deleted' };
  }
}
