import { Injectable } from '@nestjs/common';
import { PrismaService } from '@config/prisma.service';
import { DateRangeDto } from './dto';
import { FilesService } from '@modules/files/files.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async getDashboardStats(dto: DateRangeDto) {
    const [totalUsers, totalCourses, totalEnrollments, totalSessions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.enrollment.count(),
      this.prisma.liveSession.count({ where: { deletedAt: null } }),
    ]);

    const [publishedCourses, pendingApprovals, activeEnrollments, certificatesIssued] =
      await Promise.all([
        this.prisma.course.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
        this.prisma.course.count({ where: { status: 'PENDING_APPROVAL', deletedAt: null } }),
        this.prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
        this.prisma.certificate.count(),
      ]);

    const roleCounts = await this.prisma.userRole.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    const recentUserJoins = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: this.fromDate(dto.from),
          lte: this.toDate(dto.to),
        },
      },
    });

    const recentEnrollments = await this.prisma.enrollment.count({
      where: {
        createdAt: {
          gte: this.fromDate(dto.from),
          lte: this.toDate(dto.to),
        },
      },
    });

    return {
      totals: {
        users: totalUsers,
        courses: totalCourses,
        enrollments: totalEnrollments,
        liveSessions: totalSessions,
      },
      statuses: {
        publishedCourses,
        pendingApprovals,
        activeEnrollments,
        certificatesIssued,
      },
      roles: roleCounts.map((r) => ({ role: r.role, count: r._count._all })),
      periodActivity: {
        newUsers: recentUserJoins,
        newEnrollments: recentEnrollments,
      },
    };
  }

  async getRoleDistribution() {
    const roleCounts = await this.prisma.userRole.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    return roleCounts.map((r) => ({ role: r.role, count: r._count._all }));
  }

  async getSystemHealth() {
    const [databaseOk, minioOk, userCount, courseCount, failedHrSyncs] = await Promise.all([
      this.checkDatabase(),
      this.filesService.checkHealth(),
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.hrSyncLog.count({
        where: { status: 'FAILURE' },
      }),
    ]);

    return {
      database: databaseOk ? 'connected' : 'disconnected',
      minio: minioOk ? 'connected' : 'disconnected',
      redis: 'not-configured',
      stats: {
        userCount,
        courseCount,
        failedHrSyncs,
      },
    };
  }

  async getSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async updateSettings(body: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        await this.prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });
      }
    }
    return this.getSettings();
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private fromDate(from?: string): Date | undefined {
    return from ? new Date(from) : undefined;
  }

  private toDate(to?: string): Date | undefined {
    if (!to) return undefined;
    const date = new Date(to);
    date.setHours(23, 59, 59, 999);
    return date;
  }
}
