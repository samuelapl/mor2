import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildOrderBy, buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
import { PaginationQuery } from '@common/interfaces';
import { CreateSessionDto, UpdateSessionDto } from './dto';

@Injectable()
export class LiveSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(courseId: string, dto: CreateSessionDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    return this.prisma.liveSession.create({
      data: {
        courseId,
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        platform: dto.platform,
        externalUrl: dto.externalUrl,
        meetingPassword: dto.meetingPassword,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes,
      },
      include: { course: { select: { id: true, titleEn: true, titleAm: true } } },
    });
  }

  async findAll(query: PaginationQuery & { status?: SessionStatus; courseId?: string }) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.LiveSessionWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
          attendees: true,
        },
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    return buildPaginatedResponse(sessions, total, page, limit);
  }

  async findById(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!session || session.deletedAt) {
      throw new NotFoundException('Live session not found');
    }

    return session;
  }

  async update(id: string, dto: UpdateSessionDto) {
    const existing = await this.findById(id);

    if (existing.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot update a completed session');
    }

    return this.prisma.liveSession.update({
      where: { id },
      data: {
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        platform: dto.platform,
        externalUrl: dto.externalUrl,
        meetingPassword: dto.meetingPassword,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async changeStatus(id: string, status: SessionStatus) {
    await this.findById(id);

    return this.prisma.liveSession.update({
      where: { id },
      data: { status },
    });
  }

  async softDelete(id: string) {
    await this.findById(id);

    return this.prisma.liveSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upcomingForUser(userId: string, query: PaginationQuery) {
    // Find sessions for courses the user is enrolled in
    const { page, limit, skip } = buildPaginationArgs(query);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    if (courseIds.length === 0) {
      return buildPaginatedResponse([], 0, page, limit);
    }

    const where: Prisma.LiveSessionWhereInput = {
      courseId: { in: courseIds },
      scheduledAt: { gte: new Date() },
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.LIVE] },
      deletedAt: null,
    };

    const [sessions, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        },
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    return buildPaginatedResponse(sessions, total, page, limit);
  }
}
