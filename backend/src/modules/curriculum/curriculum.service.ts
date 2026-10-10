import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, LessonContentType, RoleName } from '@prisma/client';
import { deriveAttachmentFileKey } from '@common/utils';
import { PrismaService } from '@config/prisma.service';
import { AuthenticatedUser } from '@common/interfaces';
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

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  public formatLessonCompat(les: any) {
    if (!les) return les;
    const title = les.title ?? les.titleEn ?? '';
    const content = les.content ?? les.contentEn ?? null;
    return {
      ...les,
      title,
      titleEn: title,
      titleAm: les.titleAm ?? title,
      content,
      contentEn: content,
      contentAm: les.contentAm ?? content,
      subLessons: (les.subLessons ?? []).map((sub: any) => this.formatLessonCompat(sub)),
    };
  }

  public formatModuleCompat(mod: any) {
    if (!mod) return mod;
    const title = mod.title ?? mod.titleEn ?? '';
    const description = mod.description ?? mod.descriptionEn ?? null;
    const objectives = mod.objectives ?? mod.objectivesEn ?? null;
    return {
      ...mod,
      title,
      titleEn: title,
      titleAm: mod.titleAm ?? title,
      description,
      descriptionEn: description,
      descriptionAm: mod.descriptionAm ?? description,
      objectives,
      objectivesEn: objectives,
      objectivesAm: mod.objectivesAm ?? objectives,
      lessons: (mod.lessons ?? []).map((l: any) => this.formatLessonCompat(l)),
    };
  }

  // ── Modules ────────────────────────────────────────
  /**
   * Replaces the entire curriculum (modules + lessons + sub-lessons) atomically. Only DRAFT/REJECTED courses.
   * Also derives durations bottom-up (lesson + its sub-lessons → module → course) and stores them on
   * CurriculumModule.durationMinutes and Course.estimatedHours, matching frontend/src/lib/duration.ts.
   */
  async replaceAll(courseId: string, dto: ReplaceModulesDto) {
    await this.assertCourseEditable(courseId);

    await this.prisma.$transaction(async (tx) => {
      await tx.curriculumModule.deleteMany({ where: { courseId } });
      let courseMinutes = 0;

      for (const [index, mod] of dto.modules.entries()) {
        const createdModule = await tx.curriculumModule.create({
          data: {
            courseId,
            title: mod.title,
            description: mod.description,
            objectives: mod.objectives,
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

        let moduleMinutes = 0;
        if (mod.lessons && mod.lessons.length > 0) {
          for (const [idx, lesson] of mod.lessons.entries()) {
            moduleMinutes += lesson.durationMinutes ?? 0;
            for (const sub of lesson.subLessons ?? []) moduleMinutes += sub.durationMinutes ?? 0;

            const createdLesson = await tx.lesson.create({
              data: {
                moduleId: createdModule.id,
                parentId: null,
                title: lesson.title,
                content: lesson.content,
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
                    title: sub.title,
                    content: sub.content,
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

        // Lesson times win; a module without any keeps the duration it was sent with.
        const durationMinutes = moduleMinutes > 0 ? moduleMinutes : (mod.durationMinutes ?? 0);
        courseMinutes += durationMinutes;
        if (durationMinutes !== createdModule.durationMinutes) {
          await tx.curriculumModule.update({ where: { id: createdModule.id }, data: { durationMinutes } });
        }
      }

      // Stored unrounded so minutes can be recovered exactly (hours × 60) for display.
      await tx.course.update({
        where: { id: courseId },
        data: { estimatedHours: courseMinutes > 0 ? courseMinutes / 60 : null },
      });
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
    const modules = await this.prisma.curriculumModule.findMany({
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
        attachments: { where: { lessonId: null } },
        assessments: {
          where: { type: 'MODULE_ASSESSMENT' },
          include: { attempts: true },
        },
      },
    });

    return modules.map((m) => this.formatModuleCompat(m));
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
        attachments: { where: { lessonId: null } },
        assessments: {
          where: { type: 'MODULE_ASSESSMENT' },
          include: { attempts: true },
        },
      },
    });

    if (!module || module.deletedAt) {
      throw new NotFoundException('Module not found');
    }

    return this.formatModuleCompat(module);
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
        title: dto.title || dto.titleEn || 'Module',
        description: dto.description || dto.descriptionEn,
        objectives: dto.objectives || dto.objectivesEn,
        durationMinutes: dto.durationMinutes,
        order,
        passingScore: dto.passingScore,
        lessons: dto.lessons?.length
          ? {
              create: dto.lessons.map((lesson, idx) => ({
                title: lesson.title || lesson.titleEn || 'Lesson',
                content: lesson.content || lesson.contentEn,
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

    const updated = await this.prisma.curriculumModule.update({
      where: { id: moduleId },
      data: {
        title: dto.title,
        description: dto.description,
        objectives: dto.objectives,
        durationMinutes: dto.durationMinutes,
        order: dto.order,
        passingScore: dto.passingScore,
      },
      include: { lessons: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });
    return this.formatModuleCompat(updated);
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

        // 2. Progression unlock check
        const { lessonUnlocked } = await this.progressService.getUnlockState(
          user.id,
          lesson.module.courseId,
        );

        if (!(lessonUnlocked.get(lesson.id) ?? false)) {
          throw new ForbiddenException(
            'This lesson or sub-lesson is locked. Complete the preceding required modules and activities first.',
          );
        }
      }
    }

    return this.formatLessonCompat(lesson);
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

      const created = await this.prisma.lesson.create({
        data: {
          moduleId,
          parentId: dto.parentId,
          title: dto.title,
          content: dto.content,
          contentType: sanitizeLessonContentType(dto.contentType),
          durationMinutes: dto.durationMinutes,
          order,
          resourceUrl: dto.resourceUrl,
        },
      });
      return this.formatLessonCompat(created);
    }

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { moduleId, parentId: null, deletedAt: null },
      orderBy: { order: 'desc' },
    });

    const order = dto.order ?? (lastLesson ? lastLesson.order + 1 : 0);

    const created = await this.prisma.lesson.create({
      data: {
        moduleId,
        parentId: null,
        title: dto.title,
        content: dto.content,
        contentType: sanitizeLessonContentType(dto.contentType),
        durationMinutes: dto.durationMinutes,
        order,
        resourceUrl: dto.resourceUrl,
      },
    });
    return this.formatLessonCompat(created);
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto) {
    const existing = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Lesson not found');
    }

    const updated = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title,
        content: dto.content,
        contentType: dto.contentType,
        durationMinutes: dto.durationMinutes,
        order: dto.order,
        resourceUrl: dto.resourceUrl,
        parentId: dto.parentId !== undefined ? dto.parentId : existing.parentId,
      },
    });
    return this.formatLessonCompat(updated);
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

    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId, deletedAt: null },
      orderBy: { order: 'asc' },
    });
    return lessons.map((l) => this.formatLessonCompat(l));
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
