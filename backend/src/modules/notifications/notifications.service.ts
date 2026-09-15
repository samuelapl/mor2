import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
import { PaginationQuery } from '@common/interfaces';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async send(
    userId: string,
    type: NotificationType,
    titles: { en: string; am: string },
    bodies?: { en?: string; am?: string },
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        titleEn: titles.en,
        titleAm: titles.am,
        bodyEn: bodies?.en,
        bodyAm: bodies?.am,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  async sendToMany(
    userIds: string[],
    type: NotificationType,
    titles: { en: string; am: string },
    bodies?: { en?: string; am?: string },
    metadata?: Record<string, unknown>,
  ) {
    if (userIds.length === 0) return [];

    return this.prisma.notification.createManyAndReturn({
      data: userIds.map((userId) => ({
        userId,
        type,
        titleEn: titles.en,
        titleAm: titles.am,
        bodyEn: bodies?.en,
        bodyAm: bodies?.am,
        metadata: metadata as Prisma.InputJsonValue,
      })),
    });
  }

  async findByUser(userId: string, query: PaginationQuery & { unreadOnly?: boolean }) {
    const { page, limit, skip } = buildPaginationArgs(query);

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      ...buildPaginatedResponse(notifications, total, page, limit),
      unreadCount,
    };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { message: `${result.count} notifications marked as read` };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    return { unreadCount: count };
  }
}
