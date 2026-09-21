import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, CheckInMethod, Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { AuditService } from '@modules/audit/audit.service';
import { AuthenticatedUser } from '@common/interfaces';
import { MarkAttendanceDto, BulkMarkAttendanceDto } from './dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async getSessionOrFail(sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session || session.deletedAt) {
      throw new NotFoundException('Live session not found');
    }
    return session;
  }

  /**
   * Institutional attendance threshold configured in System Admin Policies
   * (key: 'default_attendance_threshold'). Defaults to 60 if not configured.
   */
  async getDefaultAttendanceThreshold(): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'default_attendance_threshold' },
    });
    if (setting?.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        return parsed;
      }
    }
    return 60;
  }

  /**
   * Learner virtual/QR/GPS/biometric check-in. Produces an attendance record
   * with checkInMethod set. Uses upsert so concurrent room joins never crash with unique constraint.
   */
  async checkin(
    sessionId: string,
    userId: string,
    method: CheckInMethod,
    latitude?: number,
    longitude?: number,
  ) {
    const session = await this.getSessionOrFail(sessionId);

    if (session.status !== SessionStatus.SCHEDULED && session.status !== SessionStatus.LIVE) {
      throw new BadRequestException('Cannot check in to a session that is not scheduled or live');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: session.courseId },
      },
    });
    if (!enrollment || (enrollment.status !== 'ACTIVE' && enrollment.status !== 'COMPLETED')) {
      throw new BadRequestException('You are not enrolled in this course');
    }

    const existing = await this.prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });

    if (existing) {
      if (existing.checkInMethod) {
        return existing;
      }
      return this.prisma.attendance.update({
        where: { sessionId_userId: { sessionId, userId } },
        data: {
          checkInMethod: method,
          ...(method === CheckInMethod.GPS ? { latitude, longitude } : {}),
          ...(method === CheckInMethod.BIOMETRIC ? { biometricVerified: true } : {}),
          notes: existing.notes ? `${existing.notes} | Self check-in via ${method}` : `Self check-in via ${method}`,
        },
      });
    }

    return this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {
        checkInMethod: method,
        ...(method === CheckInMethod.GPS ? { latitude, longitude } : {}),
        ...(method === CheckInMethod.BIOMETRIC ? { biometricVerified: true } : {}),
        notes: `Self check-in via ${method}`,
      },
      create: {
        sessionId,
        userId,
        status: AttendanceStatus.ABSENT,
        joinedAt: new Date(),
        checkInMethod: method,
        ...(method === CheckInMethod.GPS ? { latitude, longitude } : {}),
        ...(method === CheckInMethod.BIOMETRIC ? { biometricVerified: true } : {}),
        notes: `Self check-in via ${method}`,
      },
    });
  }

  async mark(dto: MarkAttendanceDto, markedById: string) {
    await this.getSessionOrFail(dto.sessionId);

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId: dto.sessionId, userId: dto.userId } },
    });

    const updated = await this.prisma.attendance.upsert({
      where: {
        sessionId_userId: {
          sessionId: dto.sessionId,
          userId: dto.userId,
        },
      },
      update: {
        status: dto.status,
        durationMinutes: dto.durationMinutes !== undefined ? dto.durationMinutes : existing?.durationMinutes,
        joinedAt:
          dto.status === AttendanceStatus.PRESENT
            ? (existing?.joinedAt ?? new Date())
            : (dto.status === AttendanceStatus.ABSENT ? null : existing?.joinedAt),
        notes: dto.notes !== undefined ? dto.notes : existing?.notes,
      },
      create: {
        sessionId: dto.sessionId,
        userId: dto.userId,
        status: dto.status,
        durationMinutes: dto.durationMinutes,
        joinedAt: dto.status === AttendanceStatus.PRESENT ? new Date() : null,
        notes: dto.notes,
      },
    });

    await this.auditService.record({
      userId: markedById,
      action: 'ATTENDANCE_MARK',
      entity: 'attendance',
      entityId: updated.id,
      oldValues: { status: existing?.status } as Prisma.InputJsonObject,
      newValues: { status: updated.status, by: markedById } as Prisma.InputJsonObject,
    });

    return updated;
  }

  async bulkMark(dto: BulkMarkAttendanceDto) {
    await this.getSessionOrFail(dto.sessionId);

    const userIds = dto.records.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, deletedAt: null },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    await this.prisma.$transaction(
      dto.records.map((record) =>
        this.prisma.attendance.upsert({
          where: {
            sessionId_userId: {
              sessionId: dto.sessionId,
              userId: record.userId,
            },
          },
          update: {
            status: record.status,
            durationMinutes: record.durationMinutes !== undefined ? record.durationMinutes : undefined,
            joinedAt: record.status === AttendanceStatus.PRESENT ? new Date() : undefined,
            notes: record.notes !== undefined ? record.notes : undefined,
          },
          create: {
            sessionId: dto.sessionId,
            userId: record.userId,
            status: record.status,
            durationMinutes: record.durationMinutes,
            joinedAt: record.status === AttendanceStatus.PRESENT ? new Date() : null,
            notes: record.notes,
          },
        }),
      ),
    );

    return this.findBySession(dto.sessionId);
  }

  /** System-admin override of an attendance record + audit trail. */
  async override(attendanceId: string, status: AttendanceStatus, adminUserId: string) {
    const record = await this.prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    const updated = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status,
        overriddenBy: adminUserId,
        overriddenAt: new Date(),
      },
    });

    await this.auditService.record({
      userId: adminUserId,
      action: 'ATTENDANCE_OVERRIDE',
      entity: 'attendance',
      entityId: attendanceId,
      oldValues: { status: record.status } as Prisma.InputJsonObject,
      newValues: { status: updated.status, by: adminUserId } as Prisma.InputJsonObject,
    });

    return updated;
  }

  async findBySession(sessionId: string) {
    return this.prisma.attendance.findMany({
      where: { sessionId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.attendance.findMany({
      where: { userId },
      include: {
        session: {
          include: {
            course: {
              select: { id: true, titleEn: true, titleAm: true, code: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async summaryForSession(sessionId: string) {
    const session = await this.getSessionOrFail(sessionId);

    const [records, present, absent, late, excused, totalEnrolled] = await Promise.all([
      this.prisma.attendance.count({ where: { sessionId } }),
      this.prisma.attendance.count({
        where: { sessionId, status: AttendanceStatus.PRESENT },
      }),
      this.prisma.attendance.count({
        where: { sessionId, status: AttendanceStatus.ABSENT },
      }),
      this.prisma.attendance.count({
        where: { sessionId, status: AttendanceStatus.LATE },
      }),
      this.prisma.attendance.count({
        where: { sessionId, status: AttendanceStatus.EXCUSED },
      }),
      this.prisma.enrollment.count({
        where: { courseId: session.courseId, status: 'ACTIVE' },
      }),
    ]);

    return {
      sessionId,
      totalRecorded: records,
      totalEnrolled,
      present,
      absent,
      late,
      excused,
      attendanceRate: totalEnrolled > 0 ? Math.round(((present + late) / totalEnrolled) * 100) : 0,
    };
  }

  async getVisibility(sessionId: string, user?: AuthenticatedUser) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: { allowViewAttendance: true, trainerId: true, courseId: true },
    });

    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const isStaff =
      user?.roles?.some((r) =>
        ['TRAINER', 'COURSE_OWNER', 'TRAINING_ADMIN', 'SYSTEM_ADMIN'].includes(r),
      ) ?? false;

    const isSessionTrainer = Boolean(user?.id && session.trainerId === user.id);
    const sessionPermitted = Boolean(session.allowViewAttendance);
    const globalSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'allow_all_view_attendance' },
    });
    const globalPermitted = globalSetting ? globalSetting.value === 'true' : false;
    const canView = isStaff || isSessionTrainer || sessionPermitted || globalPermitted;

    return {
      canView,
      globalPermitted,
      sessionPermitted,
      isStaff: isStaff || isSessionTrainer,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Client-side presence tracking (Join, Heartbeat, Leave)
  // ──────────────────────────────────────────────────────────────────────────────

  async recordJoin(sessionId: string, userId: string) {
    const session = await this.getSessionOrFail(sessionId);

    const attendance = await this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {
        rejoinCount: { increment: 1 },
      },
      create: {
        sessionId,
        userId,
        status: AttendanceStatus.ABSENT,
        joinedAt: new Date(),
        rejoinCount: 0,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.prisma.attendanceLog.create({
      data: {
        sessionId,
        userId,
        attendanceId: attendance.id,
        eventType: 'JOIN',
        timestamp: new Date(),
        metadata: { source: 'client_api' },
      },
    });

    const threshold = await this.getDefaultAttendanceThreshold();

    return {
      ...attendance,
      threshold,
      sessionDurationMinutes: session.durationMinutes ?? 60,
    };
  }

  async recordHeartbeat(sessionId: string, userId: string, elapsedSeconds = 15) {
    const session = await this.getSessionOrFail(sessionId);
    const sessionTotalSeconds = (session.durationMinutes ?? 60) * 60;
    const threshold = await this.getDefaultAttendanceThreshold();

    const existing = await this.prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });

    const addSeconds = Math.max(1, Math.min(120, elapsedSeconds));
    const newActiveSeconds = (existing?.activeSeconds ?? 0) + addSeconds;
    const rawPercentage = sessionTotalSeconds > 0 ? (newActiveSeconds / sessionTotalSeconds) * 100 : 0;
    const percentage = Math.min(100, Math.round(rawPercentage));

    const newStatus =
      percentage >= threshold ? AttendanceStatus.PRESENT : (existing?.status ?? AttendanceStatus.ABSENT);

    const updated = await this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {
        activeSeconds: newActiveSeconds,
        durationMinutes: Math.floor(newActiveSeconds / 60),
        percentage,
        status: newStatus,
      },
      create: {
        sessionId,
        userId,
        status: newStatus,
        activeSeconds: newActiveSeconds,
        durationMinutes: Math.floor(newActiveSeconds / 60),
        percentage,
        joinedAt: new Date(),
        rejoinCount: 0,
      },
    });

    return {
      activeSeconds: updated.activeSeconds,
      durationMinutes: updated.durationMinutes,
      percentage: updated.percentage,
      status: updated.status,
      threshold,
      sessionDurationMinutes: session.durationMinutes ?? 60,
    };
  }

  async recordLeave(sessionId: string, userId: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (!existing) return null;

    const updated = await this.prisma.attendance.update({
      where: { sessionId_userId: { sessionId, userId } },
      data: {
        leftAt: new Date(),
      },
    });

    await this.prisma.attendanceLog.create({
      data: {
        sessionId,
        userId,
        attendanceId: existing.id,
        eventType: 'LEAVE',
        timestamp: new Date(),
        metadata: { percentage: existing.percentage, status: existing.status, source: 'client_api' },
      },
    });

    return updated;
  }

  async getReport(sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        course: { select: { code: true, titleEn: true } },
      },
    });
    if (!session || session.deletedAt) {
      throw new NotFoundException('Live session not found');
    }

    const threshold = await this.getDefaultAttendanceThreshold();
    const summary = await this.summaryForSession(sessionId);
    const attendees = await this.findBySession(sessionId);

    return {
      session: {
        id: session.id,
        titleEn: session.titleEn,
        titleAm: session.titleAm,
        courseCode: session.course?.code || '',
        courseTitle: session.course?.titleEn || '',
        scheduledAt: session.scheduledAt.toISOString(),
        durationMinutes: session.durationMinutes,
        actualStartedAt: session.actualStartedAt?.toISOString() || null,
        actualEndedAt: session.actualEndedAt?.toISOString() || null,
        status: session.status,
        attendanceThreshold: threshold,
      },
      summary,
      attendees,
    };
  }

  async sendReport(sessionId: string, currentUserId: string) {
    const report = await this.getReport(sessionId);

    await this.auditService.record({
      userId: currentUserId,
      action: 'ATTENDANCE_REPORT_DISPATCH',
      entity: 'live_session',
      entityId: sessionId,
      newValues: {
        totalAttendees: report.attendees.length,
        attendanceRate: report.summary.attendanceRate,
      } as Prisma.InputJsonObject,
    });

    return report;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // LiveKit server-side webhook handlers (tamper-proof, called from the controller)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Called when a participant joins the LiveKit room.
   * Creates or updates the Attendance row, always starting ABSENT.
   * Increments rejoinCount on re-join.
   */
  async handleParticipantJoined(sessionId: string, userId: string): Promise<void> {
    const attendance = await this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {
        rejoinCount: { increment: 1 },
      },
      create: {
        sessionId,
        userId,
        status: AttendanceStatus.ABSENT,
        joinedAt: new Date(),
        rejoinCount: 0,
      },
    });

    // Create immutable JOIN log
    await this.prisma.attendanceLog.create({
      data: {
        sessionId,
        userId,
        attendanceId: attendance.id,
        eventType: 'JOIN',
        timestamp: new Date(),
        metadata: { source: 'livekit_webhook' },
      },
    });
  }

  /**
   * Called when a participant leaves the LiveKit room.
   * Accumulates activeSeconds across multiple segments (for rejoins).
   * Promotes status to PRESENT if percentage >= threshold.
   */
  async handleParticipantLeft(
    sessionId: string,
    userId: string,
    segmentDurationSeconds: number,
  ): Promise<void> {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) return;

    const sessionTotalSeconds = (session.durationMinutes ?? 60) * 60;

    const existing = await this.prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });

    const prevActiveSeconds = existing?.activeSeconds ?? 0;
    const newActiveSeconds = prevActiveSeconds + Math.max(0, segmentDurationSeconds);
    const rawPercentage = sessionTotalSeconds > 0
      ? (newActiveSeconds / sessionTotalSeconds) * 100
      : 0;
    const percentage = Math.min(100, Math.round(rawPercentage));
    const threshold = await this.getDefaultAttendanceThreshold();
    const newStatus =
      percentage >= threshold ? AttendanceStatus.PRESENT : (existing?.status ?? AttendanceStatus.ABSENT);

    await this.prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: {
        activeSeconds: newActiveSeconds,
        percentage,
        status: newStatus,
        leftAt: new Date(),
      },
      create: {
        sessionId,
        userId,
        status: newStatus,
        activeSeconds: newActiveSeconds,
        percentage,
        joinedAt: new Date(),
        leftAt: new Date(),
        rejoinCount: 0,
      },
    });

    // Create LEAVE log with segment duration
    const attendance = await this.prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    await this.prisma.attendanceLog.create({
      data: {
        sessionId,
        userId,
        attendanceId: attendance?.id ?? null,
        eventType: 'LEAVE',
        durationSeconds: segmentDurationSeconds,
        timestamp: new Date(),
        metadata: { percentage, status: newStatus, source: 'livekit_webhook' },
      },
    });
  }

  /**
   * Called when the LiveKit room finishes (all participants have left or the session is ended).
   * Marks the LiveSession as COMPLETED.
   */
  async handleRoomFinished(sessionId: string): Promise<void> {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status === 'COMPLETED') return;

    if (session.status === 'LIVE') {
      await this.prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          actualEndedAt: new Date(),
        },
      });
    }
  }
}

