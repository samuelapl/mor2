import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  buildOrderBy,
  buildPaginationArgs,
  buildPaginatedResponse,
  buildSearchFilter,
  computeSequentialUnlocks,
  loadUserCompletionState,
} from '@common/utils';
import { PaginationQuery } from '@common/interfaces';
import { CourseStateMachine } from './statemachine/course-state-machine';
import { CreateCourseDto, UpdateCourseDto, ReviewCourseDto } from './dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: CourseStateMachine,
  ) {}

  async findAll(query: PaginationQuery & { status?: CourseStatus }) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const searchFilter = buildSearchFilter(query.search, ['titleEn', 'titleAm', 'code']);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(searchFilter as any),
      ...(query.status ? { status: query.status } : {}),
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owners: { include: { user: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return buildPaginatedResponse(courses, total, page, limit);
  }

  async findById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        owners: { include: { user: true } },
        approvals: { include: { approver: true } },
        trainers: { include: { user: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
        attachments: true,
      },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  /**
   * Course detail enriched for a specific user (course page):
   * - `enrolled` + `enrollmentStatus` resolved for the current user.
   * - Learners get per-module/per-lesson `unlocked` flags (gating is visual;
   *   mutation is also enforced server-side in the progress module).
   * Staff (owners, approvers, trainers, admins) see everything unlocked.
   */
  async findByIdForUser(id: string, userId: string, role?: string) {
    const course = await this.findById(id);
    const { modules, lessons } = await this.attachUnlockState(course, userId, role);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: id } },
      select: { status: true, enrolledAt: true },
    });

    return {
      ...course,
      enrolled: Boolean(enrollment),
      enrollmentStatus: enrollment?.status ?? null,
      enrolledAt: enrollment?.enrolledAt ?? null,
      modules,
      lessons,
    };
  }

  /** Computes `unlocked` per module/lesson for a course payload. */
  private async attachUnlockState(
    course: {
      id: string;
      modules: Array<{
        id: string;
        order: number | null;
        lessons: Array<{ id: string; order: number }>;
      }>;
    },
    userId: string,
    role?: string,
  ) {
    const isLearner = role === RoleName.LEARNER;

    if (isLearner && course.modules && course.modules.length > 0) {
      const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const { moduleCompletions, lessonCompletions } = await loadUserCompletionState(
        this.prisma,
        userId,
        course.modules.map((m) => m.id),
        allLessonIds,
      );
      const { moduleUnlocked, lessonUnlocked } = computeSequentialUnlocks(
        course.modules,
        moduleCompletions,
        lessonCompletions,
      );

      const modules = course.modules.map((m) => ({
        ...m,
        unlocked: moduleUnlocked.get(m.id) ?? false,
        lessons: m.lessons.map((l) => ({
          ...l,
          unlocked: lessonUnlocked.get(l.id) ?? false,
        })),
      }));

      return { modules, lessons: modules.flatMap((m) => m.lessons) };
    }

    // Non-learner: everything is readable; mark all unlocked for symmetry.
    const modules = (course.modules ?? []).map((m) => ({
      ...m,
      unlocked: true,
      lessons: m.lessons.map((l) => ({ ...l, unlocked: true })),
    }));
    return { modules, lessons: modules.flatMap((m) => m.lessons) };
  }

  async create(dto: CreateCourseDto, currentUserId: string) {
    const existing = await this.prisma.course.findUnique({
      where: { code: dto.code },
    });
    if (existing && !existing.deletedAt) {
      throw new ForbiddenException(`Course code '${dto.code}' already exists`);
    }

    const course = await this.prisma.course.create({
      data: {
        code: dto.code,
        titleAm: dto.title.am,
        titleEn: dto.title.en,
        descriptionAm: dto.description?.am,
        descriptionEn: dto.description?.en,
        estimatedHours: dto.estimatedHours,
        thumbnailUrl: dto.thumbnailUrl,
        level: dto.level,
        status: CourseStatus.DRAFT,
        owners: {
          create: dto.ownerIds?.length
            ? dto.ownerIds.map((userId) => ({
                userId,
              }))
            : [{ userId: currentUserId }],
        },
      },
      include: { owners: { include: { user: true } } },
    });

    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const course = await this.findById(id);

    if (course.status === CourseStatus.APPROVED || course.status === CourseStatus.PUBLISHED) {
      throw new ForbiddenException(
        'Cannot edit an approved or published course. Create a new version instead.',
      );
    }

    const data: Prisma.CourseUpdateInput = {};
    if (dto.code) data.code = dto.code;
    if (dto.title) {
      data.titleAm = dto.title.am;
      data.titleEn = dto.title.en;
    }
    if (dto.description) {
      data.descriptionAm = dto.description.am;
      data.descriptionEn = dto.description.en;
    }
    if (dto.estimatedHours !== undefined) data.estimatedHours = dto.estimatedHours;
    if (dto.thumbnailUrl) data.thumbnailUrl = dto.thumbnailUrl;
    if (dto.level) data.level = dto.level;

    return this.prisma.course.update({
      where: { id },
      data,
      include: { owners: { include: { user: true } } },
    });
  }

  async requestApproval(id: string, currentUserId: string) {
    const course = await this.findById(id);

    this.stateMachine.assertCanTransition(course.status, CourseStatus.PENDING_APPROVAL);

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PENDING_APPROVAL },
    });

    await this.prisma.contentApproval.create({
      data: {
        courseId: id,
        approverId: currentUserId,
        status: 'PENDING',
      },
    });

    return updated;
  }

  async review(id: string, dto: ReviewCourseDto, approverId: string) {
    const course = await this.findById(id);

    if (course.status !== CourseStatus.PENDING_APPROVAL) {
      throw new ForbiddenException('Course is not in PENDING_APPROVAL state');
    }

    const targetStatus = dto.status === 'APPROVED' ? CourseStatus.APPROVED : CourseStatus.REJECTED;

    this.stateMachine.assertCanTransition(course.status, targetStatus);

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status: targetStatus },
    });

    await this.prisma.contentApproval.create({
      data: {
        courseId: id,
        approverId,
        status: dto.status,
        comments: dto.comments,
        decidedAt: new Date(),
      },
    });

    return updated;
  }

  async publish(id: string) {
    const course = await this.findById(id);

    this.stateMachine.assertCanTransition(course.status, CourseStatus.PUBLISHED);

    if (!course.trainers || course.trainers.length === 0) {
      throw new ForbiddenException('Assign at least one trainer to this course before publishing.');
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        version: { increment: 1 },
      },
    });

    return updated;
  }

  async unpublish(id: string) {
    const course = await this.findById(id);

    this.stateMachine.assertCanTransition(course.status, CourseStatus.APPROVED);

    return this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.APPROVED },
    });
  }

  async archive(id: string) {
    const course = await this.findById(id);

    this.stateMachine.assertCanTransition(course.status, CourseStatus.ARCHIVED);

    return this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED },
    });
  }

  async softDelete(id: string) {
    const course = await this.findById(id);

    if (course.status === CourseStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot delete a published course. Archive it instead.');
    }

    return this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignTrainer(courseId: string, userId: string) {
    await this.findById(courseId);

    return this.prisma.trainerAssignment.create({
      data: {
        courseId,
        userId,
      },
      include: { user: true },
    });
  }

  async removeTrainer(courseId: string, userId: string) {
    await this.prisma.trainerAssignment.deleteMany({
      where: { courseId, userId },
    });

    return { message: 'Trainer removed from course' };
  }

  async checkAccess(courseId: string, userId: string, role?: string): Promise<boolean> {
    const course = await this.findById(courseId);

    if (role === RoleName.SYSTEM_ADMIN || role === RoleName.TRAINING_ADMIN) {
      return true;
    }

    const isOwner = course.owners.some((o) => o.userId === userId);
    if (isOwner) return true;

    return false;
  }
}
