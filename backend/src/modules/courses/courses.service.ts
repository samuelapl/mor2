import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  CourseStatus,
  EnrollmentStatus,
  NotificationType,
  Prisma,
  RoleName,
} from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  buildOrderBy,
  buildPaginationArgs,
  buildPaginatedResponse,
  buildSearchFilter,
  computeSequentialUnlocks,
  loadUserCompletionState,
} from '@common/utils';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { ProgressService } from '@modules/progress/progress.service';
import { CourseStateMachine } from './statemachine/course-state-machine';
import { CreateCourseDto, UpdateCourseDto, ReviewCourseDto } from './dto';

const STAFF_ROLES: RoleName[] = [
  RoleName.SYSTEM_ADMIN,
  RoleName.TRAINING_ADMIN,
  RoleName.CONTENT_APPROVER,
  RoleName.COURSE_OWNER,
  RoleName.TRAINER,
];

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: CourseStateMachine,
    private readonly notificationsService: NotificationsService,
    private readonly progressService: ProgressService,
  ) {}

  private roleSet(user: AuthenticatedUser): Set<string> {
    return new Set(user.roles ?? []);
  }

  private isBroadStaff(roles: Set<string>): boolean {
    return (
      roles.has(RoleName.SYSTEM_ADMIN) ||
      roles.has(RoleName.TRAINING_ADMIN) ||
      roles.has(RoleName.CONTENT_APPROVER)
    );
  }

  private hasQuestionBankAccess(roles: Set<string>): boolean {
    return (
      this.isBroadStaff(roles) || roles.has(RoleName.TRAINER) || roles.has(RoleName.COURSE_OWNER)
    );
  }

  private visibilityWhere(
    user: AuthenticatedUser,
    requestedStatus?: CourseStatus,
  ): Prisma.CourseWhereInput {
    const roles = this.roleSet(user);
    const statusFilter = requestedStatus ? { status: requestedStatus } : {};

    // All actors with question bank access (Trainers, Course Owners, Admins, Approvers) can access all institutional courses
    if (this.hasQuestionBankAccess(roles)) {
      return statusFilter;
    }

    const or: Prisma.CourseWhereInput[] = [];
    if (roles.has(RoleName.COURSE_OWNER)) {
      or.push({ owners: { some: { userId: user.id } } });
    }
    if (roles.has(RoleName.TRAINER)) {
      or.push({ trainers: { some: { userId: user.id } } });
    }
    if (roles.has(RoleName.LEARNER) || or.length === 0) {
      or.push({ status: CourseStatus.PUBLISHED });
    }

    const scope: Prisma.CourseWhereInput = or.length === 1 ? or[0]! : { OR: or };
    return requestedStatus ? { AND: [scope, statusFilter] } : scope;
  }

  async assertCanRead(courseId: string, user: AuthenticatedUser): Promise<void> {
    const course = await this.findById(courseId);
    const roles = this.roleSet(user);

    if (this.hasQuestionBankAccess(roles)) return;
    if (roles.has(RoleName.COURSE_OWNER) && course.owners.some((o) => o.userId === user.id)) return;
    if (roles.has(RoleName.TRAINER) && course.trainers.some((t) => t.userId === user.id)) return;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { status: true },
    });
    if (enrollment && course.status === CourseStatus.PUBLISHED) return;
    if (roles.has(RoleName.LEARNER) && course.status === CourseStatus.PUBLISHED) return;

    throw new ForbiddenException('You do not have access to this course');
  }

  async assertCanWrite(courseId: string, user: AuthenticatedUser): Promise<void> {
    const roles = this.roleSet(user);
    if (roles.has(RoleName.SYSTEM_ADMIN) || roles.has(RoleName.TRAINING_ADMIN)) return;

    const course = await this.findById(courseId);
    if (roles.has(RoleName.COURSE_OWNER) && course.owners.some((o) => o.userId === user.id)) return;

    throw new ForbiddenException('You are not allowed to modify this course');
  }

  async findAll(query: PaginationQuery & { status?: CourseStatus }, user: AuthenticatedUser) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const searchFilter = buildSearchFilter(query.search, ['titleEn', 'titleAm', 'code']);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(searchFilter as any),
      ...this.visibilityWhere(user, query.status),
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
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            attachments: true,
            assessments: {
              where: { type: 'MODULE_ASSESSMENT' },
              select: {
                id: true,
                titleEn: true,
                titleAm: true,
                passingScore: true,
                timeLimitMinutes: true,
              },
            },
            lessons: {
              where: { deletedAt: null, parentId: null },
              orderBy: { order: 'asc' },
              include: {
                attachments: true,
                assessments: {
                  where: { type: 'LESSON_ASSESSMENT' },
                  select: {
                    id: true,
                    titleEn: true,
                    titleAm: true,
                    passingScore: true,
                    timeLimitMinutes: true,
                  },
                },
                subLessons: {
                  where: { deletedAt: null },
                  orderBy: { order: 'asc' },
                  include: { attachments: true },
                },
              },
            },
          },
        },
        assessments: {
          where: { type: 'FINAL_ASSESSMENT' },
          select: {
            id: true,
            titleEn: true,
            titleAm: true,
            passingScore: true,
            timeLimitMinutes: true,
          },
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
  async findByIdForUser(id: string, user: AuthenticatedUser) {
    await this.assertCanRead(id, user);
    const course = await this.findById(id);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
      select: { status: true, enrolledAt: true },
    });

    const isEnrolled = Boolean(enrollment && enrollment.status !== EnrollmentStatus.DROPPED);
    const { modules, lessons } = await this.attachUnlockState(
      course,
      user.id,
      user.roles,
      isEnrolled,
    );

    return {
      ...course,
      enrolled: isEnrolled,
      enrollmentStatus: enrollment?.status ?? null,
      enrolledAt: enrollment?.enrolledAt ?? null,
      modules,
      lessons,
    };
  }

  /** Computes `unlocked` per module/lesson for a course payload. Sanitizes locked content for learners. */
  private async attachUnlockState(
    course: any,
    userId: string,
    roles?: string[],
    isEnrolled = true,
  ) {
    const roleSet = new Set(roles ?? []);
    const hasStaffRole = STAFF_ROLES.some((role) => roleSet.has(role));
    const isLearner = roleSet.has(RoleName.LEARNER) && !hasStaffRole;

    if (isLearner) {
      // If learner is NOT enrolled, entire curriculum content is locked/restricted
      if (!isEnrolled) {
        const modules = (course.modules ?? []).map((m: any) => ({
          ...m,
          unlocked: false,
          lessons: (m.lessons ?? []).map((l: any) => ({
            ...l,
            unlocked: false,
            contentEn: null,
            contentAm: null,
            resourceUrl: null,
            attachments: [],
            subLessons: (l.subLessons ?? []).map((sub: any) => ({
              ...sub,
              unlocked: false,
              contentEn: null,
              contentAm: null,
              resourceUrl: null,
              attachments: [],
            })),
          })),
        }));
        return { modules, lessons: modules.flatMap((m: any) => m.lessons) };
      }

      if (course.modules && course.modules.length > 0) {
        const allLessonIds = course.modules.flatMap((m: any) =>
          (m.lessons ?? []).flatMap((l: any) => [
            l.id,
            ...(l.subLessons ?? []).map((s: any) => s.id),
          ]),
        );
        await this.progressService.reconcileModuleCompletions(
          userId,
          course.modules.map((m: any) => m.id),
        );
        const { moduleCompletions, lessonCompletions } = await loadUserCompletionState(
          this.prisma,
          userId,
          course.modules.map((m: any) => m.id),
          allLessonIds,
        );
        const { moduleUnlocked, lessonUnlocked } = computeSequentialUnlocks(
          course.modules,
          moduleCompletions,
          lessonCompletions,
        );

        const modules = course.modules.map((m: any) => {
          const modUnlocked = moduleUnlocked.get(m.id) ?? false;
          return {
            ...m,
            unlocked: modUnlocked,
            lessons: (m.lessons ?? []).map((l: any) => {
              const lesUnlocked = lessonUnlocked.get(l.id) ?? false;
              return {
                ...l,
                unlocked: lesUnlocked,
                contentEn: l.contentEn,
                contentAm: l.contentAm,
                resourceUrl: l.resourceUrl,
                attachments: l.attachments,
                subLessons: (l.subLessons ?? []).map((sub: any) => {
                  const subUnlocked = lessonUnlocked.get(sub.id) ?? false;
                  return {
                    ...sub,
                    unlocked: subUnlocked,
                    contentEn: sub.contentEn,
                    contentAm: sub.contentAm,
                    resourceUrl: sub.resourceUrl,
                    attachments: sub.attachments,
                  };
                }),
              };
            }),
          };
        });

        return { modules, lessons: modules.flatMap((m: any) => m.lessons) };
      }
    }

    // Non-learner: everything is readable; mark all unlocked for symmetry.
    const modules = (course.modules ?? []).map((m: any) => ({
      ...m,
      unlocked: true,
      lessons: (m.lessons ?? []).map((l: any) => ({
        ...l,
        unlocked: true,
        subLessons: (l.subLessons ?? []).map((sub: any) => ({
          ...sub,
          unlocked: true,
        })),
      })),
    }));
    return { modules, lessons: modules.flatMap((m: any) => m.lessons) };
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
        objectivesAm: dto.objectives?.am,
        objectivesEn: dto.objectives?.en,
        category: dto.category,
        department: dto.department,
        targetAudience: dto.targetAudience,
        deliveryMethod: dto.deliveryMethod,
        language: dto.language ?? 'en',
        prerequisites: dto.prerequisites,
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

  async update(id: string, dto: UpdateCourseDto, user: AuthenticatedUser) {
    await this.assertCanWrite(id, user);
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
    if (dto.objectives) {
      data.objectivesAm = dto.objectives.am;
      data.objectivesEn = dto.objectives.en;
    }
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.targetAudience !== undefined) data.targetAudience = dto.targetAudience;
    if (dto.deliveryMethod !== undefined) data.deliveryMethod = dto.deliveryMethod;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.prerequisites !== undefined) data.prerequisites = dto.prerequisites;
    if (dto.estimatedHours !== undefined) data.estimatedHours = dto.estimatedHours;
    if (dto.thumbnailUrl) data.thumbnailUrl = dto.thumbnailUrl;
    if (dto.level) data.level = dto.level;

    return this.prisma.course.update({
      where: { id },
      data,
      include: { owners: { include: { user: true } } },
    });
  }

  async requestApproval(id: string, user: AuthenticatedUser) {
    await this.assertCanWrite(id, user);
    const course = await this.findById(id);

    this.stateMachine.assertCanTransition(course.status, CourseStatus.PENDING_APPROVAL);

    return this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PENDING_APPROVAL },
    });
  }

  async review(id: string, dto: ReviewCourseDto, approverId: string) {
    const course = await this.findById(id);

    if (course.status !== CourseStatus.PENDING_APPROVAL) {
      throw new ForbiddenException('Course is not in PENDING_APPROVAL state');
    }

    const isApprove = dto.status === ApprovalStatus.APPROVED;
    if (!isApprove && !dto.comments?.trim()) {
      throw new BadRequestException(
        'A reason is required when requesting changes or rejecting a course',
      );
    }

    // A rejected course goes straight back to DRAFT so the owner can edit and resubmit it;
    // the rejection itself is kept in the approval history below.
    const targetStatus = isApprove ? CourseStatus.APPROVED : CourseStatus.DRAFT;

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

    const ownerIds = course.owners.map((o) => o.userId).filter((uid) => uid !== approverId);
    const title = course.titleEn || course.titleAm;
    if (isApprove) {
      await this.notificationsService.sendToMany(
        ownerIds,
        NotificationType.COURSE_APPROVED,
        { en: 'Course approved', am: 'ኮርሱ ጸድቋል' },
        {
          en: `"${title}" was approved and is awaiting publication.`,
          am: `"${title}" ጸድቋል እና ለህትመት ይጠብቃል።`,
        },
        { courseId: id },
      );
    } else {
      const rejected = dto.status === ApprovalStatus.REJECTED;
      await this.notificationsService.sendToMany(
        ownerIds,
        NotificationType.COURSE_REJECTED,
        rejected
          ? { en: 'Course rejected', am: 'ኮርሱ ውድቅ ተደርጓል' }
          : { en: 'Course needs changes', am: 'ኮርሱ ማስተካከያ ይፈልጋል' },
        {
          en: `"${title}" was ${rejected ? 'rejected' : 'returned for revision'} and moved back to draft. Reason: ${dto.comments}`,
          am: `"${title}" ${rejected ? 'ውድቅ ተደርጓል' : 'ለማስተካከያ ተመልሷል'} እና ወደ ረቂቅ ተመልሷል። ምክንያት፦ ${dto.comments}`,
        },
        { courseId: id, reason: dto.comments },
      );
    }

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

    const ownerIds = course.owners.map((o) => o.userId);
    const title = course.titleEn || course.titleAm;
    await this.notificationsService.sendToMany(
      ownerIds,
      NotificationType.COURSE_PUBLISHED,
      { en: 'Course published', am: 'ኮርሱ ታትሟል' },
      {
        en: `"${title}" is now visible to eligible learners.`,
        am: `"${title}" አሁን ለብቁ ተማሪዎች ይታያል።`,
      },
      { courseId: id },
    );

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

  // Course Owners may only archive/delete a course while it's still a DRAFT — Training
  // Admin/System Admin are unrestricted. Enforced here, not by the permission-code model,
  // since it depends on the course's current status, not just the actor's role.
  private assertOwnerCanActOnDraftOnly(actorRoles: string[], course: { status: CourseStatus }) {
    const isOwnerOnly =
      actorRoles.includes(RoleName.COURSE_OWNER) &&
      !actorRoles.includes(RoleName.TRAINING_ADMIN) &&
      !actorRoles.includes(RoleName.SYSTEM_ADMIN);

    if (isOwnerOnly && course.status !== CourseStatus.DRAFT) {
      throw new ForbiddenException(
        'Course Owners can only archive or delete a course while it is still in Draft status.',
      );
    }
  }

  async archive(id: string, user: AuthenticatedUser) {
    await this.assertCanWrite(id, user);
    const course = await this.findById(id);

    this.assertOwnerCanActOnDraftOnly(user.roles, course);
    this.stateMachine.assertCanTransition(course.status, CourseStatus.ARCHIVED);

    return this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED },
    });
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    await this.assertCanWrite(id, user);
    const course = await this.findById(id);

    this.assertOwnerCanActOnDraftOnly(user.roles, course);

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
