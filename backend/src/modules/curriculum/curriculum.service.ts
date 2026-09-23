import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, LessonContentType, RoleName } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { AuthenticatedUser } from '@common/interfaces';
import { computeSequentialUnlocks, loadUserCompletionState } from '@common/utils/unlock.util';
import { ProgressService } from '@modules/progress/progress.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  ReplaceModulesDto,
} from './dto';

const STAFF_ROLES = [
  RoleName.SYSTEM_ADMIN,
  RoleName.TRAINING_ADMIN,
  RoleName.COURSE_OWNER,
  RoleName.CONTENT_APPROVER,
  RoleName.TRAINER,
];

const VALID_LESSON_CONTENT_TYPES = new Set(Object.values(LessonContentType));

function sanitizeLessonContentType(type?: any): LessonContentType {
  if (type && VALID_LESSON_CONTENT_TYPES.has(type)) {
    return type;
  }
  const upper = typeof type === 'string' ? type.toUpperCase() : '';
  if (VALID_LESSON_CONTENT_TYPES.has(upper as any)) {
    return upper as LessonContentType;
  }
  if (upper === 'ASSIGNMENT') return LessonContentType.DOCUMENT;
  if (upper === 'QUIZ' || upper === 'ASSESSMENT') return LessonContentType.INTERACTIVE;
  return LessonContentType.DOCUMENT;
}

function deriveAttachmentFileKey(fileUrl: string, fileName?: string): string {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/');
    if (parts.length >= 3) {
      return parts.slice(2).join('/');
    }
  } catch {
    // fallback if fileUrl is relative
  }
  if (fileUrl.includes('/attachments/')) {
    return `attachments/${fileUrl.split('/attachments/')[1]}`;
  }
  return `attachments/${fileName || 'file'}`;
}

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  // ── Modules ────────────────────────────────────────
  /** Replaces the entire curriculum (modules + lessons + sub-lessons) atomically. Only DRAFT/REJECTED courses. */
  async replaceAll(courseId: string, dto: ReplaceModulesDto) {
    await this.assertCourseEditable(courseId);

    await this.prisma.$transaction(async (tx) => {
      await tx.curriculumModule.deleteMany({ where: { courseId } });

      for (const [index, mod] of dto.modules.entries()) {
        const createdModule = await tx.curriculumModule.create({
          data: {
            courseId,
            titleAm: mod.titleAm,
            titleEn: mod.titleEn,
            descriptionAm: mod.descriptionAm,
            descriptionEn: mod.descriptionEn,
            objectivesAm: mod.objectivesAm,
            objectivesEn: mod.objectivesEn,
            durationMinutes: mod.durationMinutes,
            order: index,
            passingScore: mod.passingScore,
          },
        });

        if (mod.attachments && mod.attachments.length > 0) {
          for (const att of mod.attachments) {
            await tx.attachment.deleteMany({ where: { fileUrl: att.fileUrl } });
            await tx.attachment.create({
              data: {
                courseId,
                moduleId: createdModule.id,
                fileName: att.fileName,
                fileKey: deriveAttachmentFileKey(att.fileUrl, att.fileName),
                fileUrl: att.fileUrl,
                fileType: att.fileType || 'application/octet-stream',
                sizeBytes: att.sizeBytes || 0,
              },
            });
          }
        }

        if (mod.lessons && mod.lessons.length > 0) {
          for (const [idx, lesson] of mod.lessons.entries()) {
            const createdLesson = await tx.lesson.create({
              data: {
                moduleId: createdModule.id,
                parentId: null,
                titleAm: lesson.titleAm ?? lesson.titleEn,
                titleEn: lesson.titleEn,
                contentAm: lesson.contentAm,
                contentEn: lesson.contentEn,
                contentType: sanitizeLessonContentType(lesson.contentType),
                durationMinutes: lesson.durationMinutes,
                order: idx,
                resourceUrl: lesson.resourceUrl,
              },
            });

            if (lesson.attachments && lesson.attachments.length > 0) {
              for (const att of lesson.attachments) {
                await tx.attachment.deleteMany({ where: { fileUrl: att.fileUrl } });
                await tx.attachment.create({
                  data: {
                    courseId,
                    moduleId: createdModule.id,
                    lessonId: createdLesson.id,
                    fileName: att.fileName,
                    fileKey: deriveAttachmentFileKey(att.fileUrl, att.fileName),
                    fileUrl: att.fileUrl,
                    fileType: att.fileType || 'application/octet-stream',
                    sizeBytes: att.sizeBytes || 0,
                  },
                });
              }
            }

            if (lesson.subLessons && lesson.subLessons.length > 0) {
              for (const [sIdx, sub] of lesson.subLessons.entries()) {
                const createdSubLesson = await tx.lesson.create({
                  data: {
                    moduleId: createdModule.id,
                    parentId: createdLesson.id,
                    titleAm: sub.titleAm ?? sub.titleEn,
                    titleEn: sub.titleEn,
                    contentAm: sub.contentAm,
                    contentEn: sub.contentEn,
                    contentType: sanitizeLessonContentType(sub.contentType),
                    durationMinutes: sub.durationMinutes,
                    order: sIdx,
                    resourceUrl: sub.resourceUrl,
                  },
                });

                if (sub.attachments && sub.attachments.length > 0) {
                  for (const att of sub.attachments) {
                    await tx.attachment.deleteMany({ where: { fileUrl: att.fileUrl } });
                    await tx.attachment.create({
                      data: {
                        courseId,
                        moduleId: createdModule.id,
                        lessonId: createdSubLesson.id,
                        fileName: att.fileName,
                        fileKey: deriveAttachmentFileKey(att.fileUrl, att.fileName),
                        fileUrl: att.fileUrl,
                        fileType: att.fileType || 'application/octet-stream',
                        sizeBytes: att.sizeBytes || 0,
                      },
                    });
                  }
                }
              }
            }
          }
        }
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
        lessons: {
          where: { deletedAt: null, parentId: null },
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
            assessments: {
              where: { type: 'LESSON_ASSESSMENT' },
              include: { attempts: true },
            },
            subLessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              include: {
                attachments: true,
              },
            },
          },
        },
        attachments: true,
        assessments: {
          where: { type: 'MODULE_ASSESSMENT' },
          include: { attempts: true },
        },
      },
    });
  }

  async getModule(moduleId: string) {
    const module = await this.prisma.curriculumModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          where: { deletedAt: null, parentId: null },
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
            assessments: {
              where: { type: 'LESSON_ASSESSMENT' },
              include: { attempts: true },
            },
            subLessons: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              include: {
                attachments: true,
              },
            },
          },
        },
        attachments: true,
        assessments: {
          where: { type: 'MODULE_ASSESSMENT' },
          include: { attempts: true },
        },
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

    const mod = await this.prisma.curriculumModule.create({
      data: {
        courseId,
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        objectivesAm: dto.objectivesAm,
        objectivesEn: dto.objectivesEn,
        durationMinutes: dto.durationMinutes,
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
        attachments: true,
      },
    });

    if (dto.attachments && dto.attachments.length > 0) {
      for (const att of dto.attachments) {
        await this.prisma.attachment.deleteMany({ where: { fileUrl: att.fileUrl } });
        await this.prisma.attachment.create({
          data: {
            courseId,
            moduleId: mod.id,
            fileName: att.fileName,
            fileKey: deriveAttachmentFileKey(att.fileUrl, att.fileName),
            fileUrl: att.fileUrl,
            fileType: att.fileType || 'application/octet-stream',
            sizeBytes: att.sizeBytes || 0,
          },
        });
      }
    }

    if (dto.lessons && dto.lessons.length > 0) {
      for (const [idx, lesson] of dto.lessons.entries()) {
        const createdLesson = mod.lessons[idx];
        if (createdLesson && lesson.attachments && lesson.attachments.length > 0) {
          for (const att of lesson.attachments) {
            await this.prisma.attachment.deleteMany({ where: { fileUrl: att.fileUrl } });
            await this.prisma.attachment.create({
              data: {
                courseId,
                moduleId: mod.id,
                lessonId: createdLesson.id,
                fileName: att.fileName,
                fileKey: deriveAttachmentFileKey(att.fileUrl, att.fileName),
                fileUrl: att.fileUrl,
                fileType: att.fileType || 'application/octet-stream',
                sizeBytes: att.sizeBytes || 0,
              },
            });
          }
        }
      }
    }

    return this.getModule(mod.id);
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
        objectivesAm: dto.objectivesAm,
        objectivesEn: dto.objectivesEn,
        durationMinutes: dto.durationMinutes,
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
  async getLesson(lessonId: string, user?: AuthenticatedUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        attachments: true,
        assessments: {
          where: {
            type: 'LESSON_ASSESSMENT',
          },
          include: { attempts: true },
        },
        parent: true,
        subLessons: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
          },
        },
        module: {
          select: { id: true, courseId: true, order: true },
        },
      },
    });

    if (!lesson || lesson.deletedAt) {
      throw new NotFoundException('Lesson not found');
    }

    // Backend sequential progression & enrollment enforcement for learners
    if (user) {
      const roleSet = new Set(user.roles ?? []);
      const hasStaffRole = STAFF_ROLES.some((role) => roleSet.has(role));
      const isLearner = roleSet.has(RoleName.LEARNER) && !hasStaffRole;

      if (isLearner) {
        // 1. Enrollment check
        const enrollment = await this.prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: lesson.module.courseId,
            },
          },
        });

        if (!enrollment || enrollment.status === 'DROPPED') {
          throw new ForbiddenException(
            'You must be actively enrolled in this course to access lesson content.',
          );
        }

        // 2. Sequential unlock check
        const modules = await this.prisma.curriculumModule.findMany({
          where: { courseId: lesson.module.courseId, deletedAt: null },
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

        const allLessonIds = modules.flatMap((m) =>
          m.lessons.flatMap((l) => [l.id, ...(l.subLessons ?? []).map((s) => s.id)]),
        );
        await this.progressService.reconcileModuleCompletions(
          user.id,
          modules.map((m) => m.id),
        );
        const { moduleCompletions, lessonCompletions } = await loadUserCompletionState(
          this.prisma,
          user.id,
          modules.map((m) => m.id),
          allLessonIds,
        );

        const { lessonUnlocked } = computeSequentialUnlocks(
          modules,
          moduleCompletions,
          lessonCompletions,
        );

        if (!(lessonUnlocked.get(lesson.id) ?? false)) {
          throw new ForbiddenException(
            'This lesson or sub-lesson is locked. Complete the preceding required modules and activities first.',
          );
        }
      }
    }

    return lesson;
  }

  async createLesson(moduleId: string, dto: CreateLessonDto) {
    if (dto.parentId) {
      const parent = await this.prisma.lesson.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.deletedAt || parent.moduleId !== moduleId) {
        throw new NotFoundException('Parent lesson not found in this module');
      }

      const lastSub = await this.prisma.lesson.findFirst({
        where: { moduleId, parentId: dto.parentId, deletedAt: null },
        orderBy: { order: 'desc' },
      });
      const order = dto.order ?? (lastSub ? lastSub.order + 1 : 0);

      return this.prisma.lesson.create({
        data: {
          moduleId,
          parentId: dto.parentId,
          titleAm: dto.titleAm ?? dto.titleEn,
          titleEn: dto.titleEn,
          contentAm: dto.contentAm,
          contentEn: dto.contentEn,
          contentType: sanitizeLessonContentType(dto.contentType),
          durationMinutes: dto.durationMinutes,
          order,
          resourceUrl: dto.resourceUrl,
        },
      });
    }

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { moduleId, parentId: null, deletedAt: null },
      orderBy: { order: 'desc' },
    });

    const order = dto.order ?? (lastLesson ? lastLesson.order + 1 : 0);

    return this.prisma.lesson.create({
      data: {
        moduleId,
        parentId: null,
        titleAm: dto.titleAm ?? dto.titleEn,
        titleEn: dto.titleEn,
        contentAm: dto.contentAm,
        contentEn: dto.contentEn,
        contentType: sanitizeLessonContentType(dto.contentType),
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
        parentId: dto.parentId !== undefined ? dto.parentId : existing.parentId,
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
