import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PermissionsService } from '@modules/permissions/permissions.service';
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
} from '@common/utils';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { ProgressService } from '@modules/progress/progress.service';
import { CourseStateMachine } from './statemachine/course-state-machine';
import { assertDeliveryModeAllowed, DEFAULT_DELIVERY_MODE } from './delivery-modes';
import { assertCourseWeightsTotal } from '@common/utils';
import { CreateCourseDto, UpdateCourseDto, ReviewCourseDto, ReturnToDraftDto } from './dto';

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
    @Optional() private readonly permissionsService?: PermissionsService,
  ) {}

  private async resolvePermissions(user: AuthenticatedUser): Promise<Set<string>> {
    if (user.permissions && user.permissions.length > 0) {
      return new Set(user.permissions);
    }
    if (this.permissionsService && user.roles?.length) {
      const perms = await this.permissionsService.effectivePermissions(user.roles);
      user.permissions = perms;
      return new Set(perms);
    }
    return new Set(user.permissions ?? []);
  }

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

  private async visibilityWhere(
    user: AuthenticatedUser,
    requestedStatus?: CourseStatus,
  ): Promise<Prisma.CourseWhereInput> {
    const roles = this.roleSet(user);
    const statusFilter = requestedStatus ? { status: requestedStatus } : {};
    const permissions = await this.resolvePermissions(user);

    if (roles.has(RoleName.SYSTEM_ADMIN) || permissions.has('course.view.all')) {
      return statusFilter;
    }

    if (permissions.size === 0 && this.isBroadStaff(roles)) {
      return statusFilter;
    }

    const or: Prisma.CourseWhereInput[] = [];
    if (permissions.size > 0) {
      // Creators always see the courses they own, at every stage.
      if (permissions.has('course.view.own') || permissions.has('course.create')) {
        or.push({ owners: { some: { userId: user.id } } });
      }
      if (permissions.has('course.view.assigned')) {
        or.push({ trainers: { some: { userId: user.id } } });
      }
      if (permissions.has('course.browse') || or.length === 0) {
        or.push({ status: CourseStatus.PUBLISHED });
      }
    } else {
      if (roles.has(RoleName.COURSE_OWNER)) {
        or.push({ owners: { some: { userId: user.id } } });
      }
      if (roles.has(RoleName.TRAINER)) {
        or.push({ trainers: { some: { userId: user.id } } });
      }
      if (roles.has(RoleName.LEARNER) || or.length === 0) {
        or.push({ status: CourseStatus.PUBLISHED });
      }
    }

    const scope: Prisma.CourseWhereInput = or.length === 1 ? or[0]! : { OR: or };
    return requestedStatus ? { AND: [scope, statusFilter] } : scope;
  }

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

  public formatCourseCompat(course: any) {
    if (!course) return course;
    const title = course.title ?? course.titleEn ?? '';
    const description = course.description ?? course.descriptionEn ?? null;
    const objectives = course.objectives ?? course.objectivesEn ?? null;
    return {
      ...course,
      title,
      titleEn: title,
      titleAm: course.titleAm ?? title,
      description,
      descriptionEn: description,
      descriptionAm: course.descriptionAm ?? description,
      objectives,
      objectivesEn: objectives,
      objectivesAm: course.objectivesAm ?? objectives,
      modules: course.modules
        ? course.modules.map((m: any) => this.formatModuleCompat(m))
        : undefined,
    };
  }

  async assertCanRead(courseId: string, user: AuthenticatedUser): Promise<void> {
    const roles = this.roleSet(user);
    if (roles.has(RoleName.SYSTEM_ADMIN)) return;

    const permissions = await this.resolvePermissions(user);
    if (permissions.has('course.view.all')) return;
    if (permissions.size === 0 && this.isBroadStaff(roles)) return;

    const course = await this.findById(courseId);

    if (permissions.size > 0) {
      if (
        (permissions.has('course.view.own') || permissions.has('course.create')) &&
        course.owners.some((o) => o.userId === user.id)
      ) {
        return;
      }
      if (
        permissions.has('course.view.assigned') &&
        course.trainers.some((t) => t.userId === user.id)
      ) {
        return;
      }
    } else {
      if (roles.has(RoleName.COURSE_OWNER) && course.owners.some((o) => o.userId === user.id)) {
        return;
      }
      if (roles.has(RoleName.TRAINER) && course.trainers.some((t) => t.userId === user.id)) {
        return;
      }
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { status: true },
    });
    if (enrollment && course.status === CourseStatus.PUBLISHED) return;
    const canBrowse =
      permissions.size > 0 ? permissions.has('course.browse') : roles.has(RoleName.LEARNER);
    if (canBrowse && course.status === CourseStatus.PUBLISHED) return;

    throw new ForbiddenException('You do not have access to this course');
  }

  async assertCanWrite(courseId: string, user: AuthenticatedUser): Promise<void> {
    const roles = this.roleSet(user);
    if (roles.has(RoleName.SYSTEM_ADMIN) || roles.has(RoleName.TRAINING_ADMIN)) return;

    const permissions = await this.resolvePermissions(user);
    if (permissions.has('course.update.all')) return;

    const course = await this.findById(courseId);
    const canUpdateOwn =
      permissions.size > 0
        ? permissions.has('course.update.own') || permissions.has('course.create')
        : roles.has(RoleName.COURSE_OWNER);
    if (canUpdateOwn && course.owners.some((o) => o.userId === user.id)) {
      return;
    }

    throw new ForbiddenException('You are not allowed to modify this course');
  }

  /**
   * Draft-editing endpoints (curriculum, quizzes, session plans, cover) each have their own
   * permission. A course creator without it may still edit the courses they own, so saving
   * a draft from the course studio only needs `course.create`.
   */
  async assertCanEditDraft(
    courseId: string,
    user: AuthenticatedUser,
    permissionCodes: string[],
  ): Promise<void> {
    if (this.roleSet(user).has(RoleName.SYSTEM_ADMIN)) return;

    const permissions = await this.resolvePermissions(user);
    if (permissionCodes.some((code) => permissions.has(code))) return;

    if (permissions.has('course.create')) {
      const course = await this.findById(courseId);
      if (course.owners.some((o) => o.userId === user.id)) return;
    }

    throw new ForbiddenException('You are not allowed to modify this course');
  }

  async findAll(query: PaginationQuery & { status?: CourseStatus }, user: AuthenticatedUser) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const searchFilter = buildSearchFilter(query.search, ['title', 'code']);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const visibility = await this.visibilityWhere(user, query.status);
    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(searchFilter as any),
      ...visibility,
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

    const formatted = courses.map((c) => this.formatCourseCompat(c));
    return buildPaginatedResponse(formatted, total, page, limit);
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
            attachments: { where: { lessonId: null } }, // lesson files also carry moduleId
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
            attachments: { orderBy: { createdAt: 'asc' } },
          },
        },
        // Module and lesson files also carry courseId; keep only files attached to the course itself.
        attachments: { where: { moduleId: null, lessonId: null, assessmentId: null } },
        sessionPlans: {
          orderBy: { order: 'asc' },
          include: {
            assessments: {
              where: { type: 'SESSION_ASSESSMENT' },
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                titleEn: true,
                weight: true,
                passingScore: true,
                timeLimitMinutes: true,
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
          },
        },
      },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    return this.formatCourseCompat(course);
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
            content: null,
            resourceUrl: null,
            attachments: [],
            subLessons: (l.subLessons ?? []).map((sub: any) => ({
              ...sub,
              unlocked: false,
              content: null,
              resourceUrl: null,
              attachments: [],
            })),
          })),
        }));
        const formattedModules = modules.map((m: any) => this.formatModuleCompat(m));
        return {
          modules: formattedModules,
          lessons: formattedModules.flatMap((m: any) => m.lessons),
        };
      }

      if (course.modules && course.modules.length > 0) {
        const { moduleUnlocked, lessonUnlocked } = await this.progressService.getUnlockState(
          userId,
          course.id,
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
                content: l.content,
                resourceUrl: l.resourceUrl,
                attachments: l.attachments,
                subLessons: (l.subLessons ?? []).map((sub: any) => {
                  const subUnlocked = lessonUnlocked.get(sub.id) ?? false;
                  return {
                    ...sub,
                    unlocked: subUnlocked,
                    content: sub.content,
                    resourceUrl: sub.resourceUrl,
                    attachments: sub.attachments,
                  };
                }),
              };
            }),
          };
        });

        const formattedModules = modules.map((m: any) => this.formatModuleCompat(m));
        return {
          modules: formattedModules,
          lessons: formattedModules.flatMap((m: any) => m.lessons),
        };
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
    const formattedModules = modules.map((m: any) => this.formatModuleCompat(m));
    return { modules: formattedModules, lessons: formattedModules.flatMap((m: any) => m.lessons) };
  }

  async create(dto: CreateCourseDto, currentUserId: string) {
    const existing = await this.prisma.course.findUnique({
      where: { code: dto.code },
    });
    if (existing && !existing.deletedAt) {
      throw new ForbiddenException(`Course code '${dto.code}' already exists`);
    }
    if (existing && existing.deletedAt) {
      // The unique index on `code` counts soft-deleted rows too, so free the
      // code up by renaming the deleted record before creating the new one.
      await this.prisma.course.update({
        where: { id: existing.id },
        data: { code: `${existing.code}-DEL-${existing.id.slice(0, 8)}` },
      });
    }
    const deliveryMode = dto.deliveryMode ?? DEFAULT_DELIVERY_MODE;
    assertDeliveryModeAllowed(deliveryMode);

    const course = await this.prisma.course.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description,
        objectives: dto.objectives,
        category: dto.category,
        department: dto.department,
        targetAudience: dto.targetAudience,
        deliveryMethod: dto.deliveryMethod,
        deliveryMode,
        hasOnlineSessions: dto.hasOnlineSessions ?? false,
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

    return this.formatCourseCompat(course);
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
    if (dto.title) data.title = dto.title;
    if (dto.description) data.description = dto.description;
    if (dto.objectives) data.objectives = dto.objectives;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.targetAudience !== undefined) data.targetAudience = dto.targetAudience;
    if (dto.deliveryMethod !== undefined) data.deliveryMethod = dto.deliveryMethod;
    if (dto.deliveryMode !== undefined) {
      assertDeliveryModeAllowed(dto.deliveryMode, course.deliveryMode);
      data.deliveryMode = dto.deliveryMode;
    }
    if (dto.hasOnlineSessions !== undefined) data.hasOnlineSessions = dto.hasOnlineSessions;
    if (dto.prerequisites !== undefined) data.prerequisites = dto.prerequisites;
    if (dto.estimatedHours !== undefined) data.estimatedHours = dto.estimatedHours;
    if (dto.thumbnailUrl) data.thumbnailUrl = dto.thumbnailUrl;
    if (dto.level) data.level = dto.level;

    const updated = await this.prisma.course.update({
      where: { id },
      data,
      include: { owners: { include: { user: true } } },
    });

    return this.formatCourseCompat(updated);
  }

  async requestApproval(id: string, user: AuthenticatedUser) {
    await this.assertCanWrite(id, user);
    const course = await this.findById(id);

    this.stateMachine.assertCanTransition(course.status, CourseStatus.PENDING_APPROVAL);
    await assertCourseWeightsTotal(this.prisma, id, 'exact');

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PENDING_APPROVAL },
    });

    try {
      const reviewerIds = (await this.courseReviewerIds()).filter((uid) => uid !== user.id);
      await this.notificationsService.sendToMany(
        reviewerIds,
        NotificationType.COURSE_SUBMITTED,
        { en: 'Course awaiting approval', am: 'ኮርስ ማጽደቅ ይጠብቃል' },
        {
          en: `"${course.title}" was submitted for approval.`,
          am: `"${course.title}" ለማጽደቅ ቀርቧል።`,
        },
        { courseId: id },
      );
    } catch {
      // notification failure is non-fatal
    }

    return updated;
  }

  /**
   * Active users who can approve or reject courses. Permissions are configured per role, so
   * this follows the role-permission table rather than a fixed role. System admins can do
   * everything and are left out to keep this to the people who actually review.
   */
  private async courseReviewerIds(): Promise<string[]> {
    let roles: RoleName[] = [RoleName.CONTENT_APPROVER];
    if (this.permissionsService) {
      const candidates = Object.values(RoleName).filter((r) => r !== RoleName.SYSTEM_ADMIN);
      const codes = await Promise.all(
        candidates.map((r) => this.permissionsService!.getPermissionCodesForRole(r)),
      );
      roles = candidates.filter((_, i) => codes[i].includes('course.approve_reject'));
    }
    if (roles.length === 0) return [];

    const reviewers = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null, roles: { some: { role: { in: roles } } } },
      select: { id: true },
    });
    return reviewers.map((r) => r.id);
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
    const title = course.title;
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

  /**
   * Withdraws an approval: an approved (not yet published) course goes back to DRAFT so its
   * owners can change it and resubmit. Refused while the course has enrollments or scheduled
   * sessions, because a draft's curriculum and session plans can be replaced wholesale, which
   * would wipe learner progress and detach scheduled sessions from their plans.
   */
  async returnToDraft(id: string, dto: ReturnToDraftDto, approverId: string) {
    const course = await this.findById(id);

    if (course.status === CourseStatus.PUBLISHED) {
      throw new BadRequestException(
        'A published course cannot be returned to draft. Unpublish it first.',
      );
    }
    if (course.status !== CourseStatus.APPROVED) {
      throw new BadRequestException('Only an approved course can be returned to draft');
    }
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('A reason is required when returning a course to draft');
    }

    const [enrollments, sessions] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId: id } }),
      this.prisma.liveSession.count({ where: { courseId: id, deletedAt: null } }),
    ]);
    const blockers: string[] = [];
    if (enrollments > 0) blockers.push(`${enrollments} enrollment(s)`);
    if (sessions > 0) blockers.push(`${sessions} scheduled session(s)`);
    if (blockers.length > 0) {
      throw new BadRequestException(
        `This course cannot be returned to draft because it has ${blockers.join(' and ')}. Remove them first.`,
      );
    }

    this.stateMachine.assertCanTransition(course.status, CourseStatus.DRAFT);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.course.update({
        where: { id },
        data: { status: CourseStatus.DRAFT },
      });
      await tx.contentApproval.create({
        data: {
          courseId: id,
          approverId,
          status: ApprovalStatus.NEEDS_REVISION,
          comments: reason,
          decidedAt: new Date(),
        },
      });
      return result;
    });

    const ownerIds = course.owners.map((o) => o.userId).filter((uid) => uid !== approverId);
    await this.notificationsService.sendToMany(
      ownerIds,
      NotificationType.COURSE_REJECTED,
      { en: 'Course approval withdrawn', am: 'የኮርሱ ማጽደቅ ተሰርዟል' },
      {
        en: `The approval of "${course.title}" was withdrawn and the course moved back to draft for changes. Reason: ${reason}`,
        am: `የ"${course.title}" ማጽደቅ ተሰርዞ ኮርሱ ለማስተካከያ ወደ ረቂቅ ተመልሷል። ምክንያት፦ ${reason}`,
      },
      { courseId: id, reason },
    );

    return updated;
  }

  /**
   * Learners cannot get a certificate until every session quiz has been held, so a course
   * with planned sessions only goes live once each one is scheduled and each weighted quiz
   * has questions.
   */
  private async assertSessionsReadyToPublish(courseId: string) {
    const plans = await this.prisma.courseSessionPlan.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: {
        titleEn: true,
        liveSession: { select: { deletedAt: true } },
        assessments: {
          where: { type: 'SESSION_ASSESSMENT' },
          select: {
            titleEn: true,
            weight: true,
            questions: true,
            preparedQuiz: { select: { questions: { select: { points: true } } } },
          },
        },
      },
    });
    const problems: string[] = [];
    for (const plan of plans) {
      if (!plan.liveSession || plan.liveSession.deletedAt)
        problems.push(`"${plan.titleEn}" is not scheduled yet`);
      for (const quiz of plan.assessments) {
        if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
          problems.push(`quiz "${quiz.titleEn}" in "${plan.titleEn}" has no questions`);
          continue;
        }
        // One point per percent of course weight, so a 10% quiz totals 10 points.
        const points = (quiz.preparedQuiz?.questions ?? []).reduce((sum, q) => sum + q.points, 0);
        if (quiz.preparedQuiz && points !== quiz.weight) {
          problems.push(
            `quiz "${quiz.titleEn}" in "${plan.titleEn}" has ${points} points but must total ${quiz.weight} (its course weight)`,
          );
        }
      }
    }
    if (problems.length > 0) {
      throw new BadRequestException(`Online sessions are not ready: ${problems.join('; ')}.`);
    }
  }

  async publish(id: string) {
    const course = await this.findById(id);

    this.stateMachine.assertCanTransition(course.status, CourseStatus.PUBLISHED);

    // A trainer runs the planned online sessions; a course without any is self-paced.
    const plannedSessions = await this.prisma.courseSessionPlan.count({ where: { courseId: id } });
    if (plannedSessions > 0 && (!course.trainers || course.trainers.length === 0)) {
      throw new ForbiddenException(
        'This course has planned sessions. Assign at least one trainer before publishing.',
      );
    }
    await this.assertSessionsReadyToPublish(id);

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        version: { increment: 1 },
      },
    });

    const ownerIds = course.owners.map((o) => o.userId);
    const title = course.title;
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

  async getEnrollmentCount(id: string): Promise<number> {
    await this.findById(id);
    return this.prisma.enrollment.count({
      where: {
        courseId: id,
        status: { not: EnrollmentStatus.DROPPED },
      },
    });
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    await this.assertCanWrite(id, user);
    const course = await this.findById(id);

    this.assertOwnerCanActOnDraftOnly(user.roles, course);

    if (course.status === CourseStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot delete a published course. Archive it instead.');
    }

    const affectedLearners = await this.prisma.enrollment.count({
      where: {
        courseId: id,
        status: { not: EnrollmentStatus.DROPPED },
      },
    });

    // Automatically delete/cancel active learner enrollments for this course
    if (affectedLearners > 0) {
      await this.prisma.enrollment.updateMany({
        where: {
          courseId: id,
        },
        data: {
          status: EnrollmentStatus.DROPPED,
          droppedAt: new Date(),
          droppedReason: 'Course deleted by administrator/creator',
        },
      });
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      ...updated,
      affectedLearners,
    };
  }

  async assignTrainer(courseId: string, userId: string) {
    await this.findById(courseId);

    return this.prisma.trainerAssignment.upsert({
      where: {
        courseId_userId: {
          courseId,
          userId,
        },
      },
      update: {},
      create: {
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
