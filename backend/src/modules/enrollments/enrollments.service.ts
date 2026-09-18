import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildOrderBy, buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
import { PaginationQuery } from '@common/interfaces';
import { CreateEnrollmentDto } from './dto';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async selfEnroll(userId: string, dto: CreateEnrollmentDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Course is not published');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: dto.courseId,
        },
      },
    });

    if (existing?.status === EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Already enrolled in this course');
    }

    if (existing?.status === EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('You have already completed this course');
    }

    try {
      // `upsert` (re)activates an existing DROPPED row or creates a new one
      // atomically — a plain findUnique-then-create here raced two concurrent
      // enroll requests (or missed the COMPLETED case above) straight into
      // the (user_id, course_id) unique constraint.
      const enrollment = await this.prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: dto.courseId } },
        update: {
          status: EnrollmentStatus.ACTIVE,
          droppedAt: null,
          droppedReason: null,
          droppedBy: null,
        },
        create: {
          userId,
          courseId: dto.courseId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: { course: true },
      });

      await this.notifyEnrollment(userId, dto.courseId, course.titleEn || course.titleAm, !!existing);

      return enrollment;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Lost a race with a concurrent enroll request for the same course.
        throw new BadRequestException('Already enrolled in this course');
      }
      throw err;
    }
  }

  async findAll(query: PaginationQuery & { status?: EnrollmentStatus }) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.EnrollmentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return buildPaginatedResponse(enrollments, total, page, limit);
  }

  async findByUser(userId: string, query: PaginationQuery) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.EnrollmentWhereInput = { userId };

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { course: true },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return buildPaginatedResponse(enrollments, total, page, limit);
  }

  async findByCourse(courseId: string, query: PaginationQuery) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.EnrollmentWhereInput = { courseId };

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return buildPaginatedResponse(enrollments, total, page, limit);
  }

  async bulkEnroll(courseId: string, userIds: string[]) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Course is not published');
    }

    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (validUsers.length === 0) {
      throw new BadRequestException('No valid users to enroll');
    }

    const validIds = validUsers.map((user) => user.id);
    const existing = await this.prisma.enrollment.findMany({
      where: { courseId, userId: { in: validIds } },
    });
    const existingByKey = new Map(
      existing.map((enrollment) => [`${enrollment.courseId}:${enrollment.userId}`, enrollment]),
    );

    const toCreate: Prisma.EnrollmentCreateManyInput[] = [];
    const toReactivate: string[] = [];

    for (const userId of validIds) {
      const prev = existingByKey.get(`${courseId}:${userId}`);
      if (!prev) {
        toCreate.push({ courseId, userId, status: EnrollmentStatus.ACTIVE });
      } else if (prev.status === EnrollmentStatus.DROPPED) {
        toReactivate.push(prev.id);
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.enrollment.createMany({ data: toCreate });
    }

    if (toReactivate.length > 0) {
      await this.prisma.enrollment.updateMany({
        where: { id: { in: toReactivate } },
        data: { status: EnrollmentStatus.ACTIVE, droppedAt: null, droppedReason: null },
      });
    }

    const affectedIds = [...toCreate.map((e) => e.userId), ...toReactivate];
    if (affectedIds.length > 0) {
      try {
        await this.notificationsService.sendToMany(
          affectedIds,
          NotificationType.SYSTEM,
          {
            en: 'Enrolled in a course',
            am: 'በኮርስ ተመዝግበዋል',
          },
          {
            en: `You have been enrolled in "${course.titleEn || course.titleAm}".`,
            am: `በ"${course.titleAm || course.titleEn}" ኮርስ ተመዝግበዋል.`,
          },
          { courseId },
        );
      } catch {
        // notification failure is non-fatal
      }
    }

    return {
      courseId,
      requested: userIds.length,
      enrolled: toCreate.length + toReactivate.length,
      skipped: validIds.length - (toCreate.length + toReactivate.length),
    };
  }

  async drop(userId: string, enrollmentId: string, reason?: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.userId !== userId) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot drop a completed enrollment');
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.DROPPED,
        droppedAt: new Date(),
        droppedReason: reason,
        droppedBy: 'self',
      },
    });
  }

  async markCompleted(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.prisma.enrollment.update({
      where: { id },
      data: {
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  private async notifyEnrollment(
    userId: string,
    courseId: string,
    courseTitle: string,
    reEnrolled: boolean,
  ) {
    try {
      await this.notificationsService.send(
        userId,
        NotificationType.SYSTEM,
        {
          en: reEnrolled ? 'Re-enrolled in a course' : 'Enrolled in a course',
          am: reEnrolled ? 'በኮርስ ተመዝግበዋል' : 'በኮርስ ተመዝግበዋል',
        },
        {
          en: `You ${reEnrolled ? 're-enrolled in' : 'enrolled in'} "${courseTitle}".`,
          am: `በ"${courseTitle}" ኮርስ ተመዝግበዋል.`,
        },
        { courseId },
      );
    } catch {
      // notification failure is non-fatal
    }
  }
}
