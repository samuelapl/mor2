import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseDeliveryMode, EnrollmentStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildOrderBy, buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
import { PaginationQuery } from '@common/interfaces';
import { CreateEnrollmentDto } from './dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { InPersonSessionsService } from '@modules/live-sessions/in-person/in-person-sessions.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly inPersonSessions: InPersonSessionsService,
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
      const cert = await this.prisma.certificate.findUnique({
        where: { userId_courseId: { userId, courseId: dto.courseId } },
      });
      if (cert) {
        throw new BadRequestException('You have already completed this course and earned your certificate');
      }

      // If certificate was revoked or deleted, reset previous completions so learner can retake
      const modules = await this.prisma.curriculumModule.findMany({
        where: { courseId: dto.courseId },
        select: { id: true, lessons: { select: { id: true } } },
      });
      const moduleIds = modules.map((m) => m.id);
      const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
      if (lessonIds.length > 0) {
        await this.prisma.lessonCompletion.deleteMany({
          where: { userId, lessonId: { in: lessonIds } },
        });
      }
      if (moduleIds.length > 0) {
        await this.prisma.moduleCompletion.deleteMany({
          where: { userId, moduleId: { in: moduleIds } },
        });
      }
    }

    const deliveryMode =
      dto.deliveryMode ||
      (course.deliveryMode === CourseDeliveryMode.IN_PERSON_ONLY
        ? CourseDeliveryMode.IN_PERSON_ONLY
        : CourseDeliveryMode.ONLINE_ONLY);

    if (deliveryMode === CourseDeliveryMode.IN_PERSON_ONLY) {
      if (course.deliveryMode === CourseDeliveryMode.ONLINE_ONLY) {
        throw new BadRequestException('This course is only available in online mode');
      }
      if (!dto.sessionId && !dto.venueId && course.deliveryMode === CourseDeliveryMode.IN_PERSON_ONLY) {
        throw new BadRequestException('Please select an in-person training session to reserve your seat');
      }
    } else if (course.deliveryMode === CourseDeliveryMode.IN_PERSON_ONLY) {
      throw new BadRequestException('This course requires in-person classroom attendance');
    }

    try {
      // Seat check, enrollment and roster entry commit together, so a full session can't be overbooked.
      const enrollment = await this.prisma.$transaction(async (tx) => {
        let finalVenueId: string | null = null;
        let finalSessionId: string | null = null;

        if (deliveryMode === CourseDeliveryMode.IN_PERSON_ONLY) {
          if (dto.sessionId) {
            const seat = await this.inPersonSessions.reserveSeat(tx, dto.sessionId, dto.courseId);
            finalSessionId = seat.sessionId;
            finalVenueId = seat.venueId;
          } else if (dto.venueId) {
            finalVenueId = (await this.inPersonSessions.getVenueOrFail(dto.venueId, tx)).id;
          }
        }

        const saved = await tx.enrollment.upsert({
          where: { userId_courseId: { userId, courseId: dto.courseId } },
          update: {
            status: EnrollmentStatus.ACTIVE,
            deliveryMode,
            venueId: finalVenueId,
            sessionId: finalSessionId,
            completedAt: null,
            droppedAt: null,
            droppedReason: null,
            droppedBy: null,
          },
          create: {
            userId,
            courseId: dto.courseId,
            status: EnrollmentStatus.ACTIVE,
            deliveryMode,
            venueId: finalVenueId,
            sessionId: finalSessionId,
          },
          include: { course: true, venue: true },
        });

        // A booked in-person seat also puts the learner on the trainer's session roster.
        if (finalSessionId) {
          await tx.attendance.upsert({
            where: { sessionId_userId: { sessionId: finalSessionId, userId } },
            update: {},
            create: { sessionId: finalSessionId, userId, status: 'ABSENT' },
          });
        }

        return saved;
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
          venue: true,
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
        include: { course: true, venue: true },
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
          venue: true,
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
