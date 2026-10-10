import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NewsReactionType, NewsStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildPaginatedResponse, buildPaginationArgs } from '@common/utils';
import { ListCommentsQueryDto } from './dto';

const PUBLISHED_WHERE = { status: NewsStatus.PUBLISHED, deletedAt: null } as const;

const COMMENT_AUTHOR_SELECT = {
  firstName: true,
  lastName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

type CommentRow = Prisma.NewsCommentGetPayload<{
  include: { user: { select: typeof COMMENT_AUTHOR_SELECT } };
}>;

/** Reader-side interactions on published news: reactions, comments, view and share counters. */
@Injectable()
export class NewsEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reactions ────────────────────────────────────────

  /** Sets the caller's reaction; sending the reaction they already have removes it (toggle). */
  async react(userId: string, newsId: string, type: NewsReactionType) {
    await this.findPublished(newsId);
    const key = { newsId_userId: { newsId, userId } };
    const existing = await this.prisma.newsReaction.findUnique({ where: key });

    if (existing?.type === type) {
      await this.prisma.newsReaction.delete({ where: key });
    } else {
      await this.prisma.newsReaction.upsert({
        where: key,
        create: { newsId, userId, type },
        update: { type },
      });
    }
    return this.reactionState(newsId, userId);
  }

  async removeReaction(userId: string, newsId: string) {
    await this.findPublished(newsId);
    await this.prisma.newsReaction.deleteMany({ where: { newsId, userId } });
    return this.reactionState(newsId, userId);
  }

  // ── Comments ─────────────────────────────────────────

  async listComments(newsId: string, query: ListCommentsQueryDto, userId?: string) {
    await this.findPublished(newsId);
    const { page, limit, skip } = buildPaginationArgs(query);
    const where: Prisma.NewsCommentWhereInput = { newsId, deletedAt: null, isHidden: false };

    const [rows, total] = await Promise.all([
      this.prisma.newsComment.findMany({
        where,
        include: { user: { select: COMMENT_AUTHOR_SELECT } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.newsComment.count({ where }),
    ]);
    return buildPaginatedResponse(
      rows.map((c) => this.toPublicComment(c, userId)),
      total,
      page,
      limit,
    );
  }

  async addComment(userId: string, newsId: string, content: string) {
    const news = await this.findPublished(newsId);
    if (!news.allowComments) {
      throw new ForbiddenException('Comments are closed for this news');
    }

    // Stored and returned as plain text; the frontend renders it as text, never as HTML.
    const comment = await this.prisma.newsComment.create({
      data: { newsId, userId, content },
      include: { user: { select: COMMENT_AUTHOR_SELECT } },
    });
    return this.toPublicComment(comment, userId);
  }

  async updateOwnComment(userId: string, newsId: string, commentId: string, content: string) {
    const comment = await this.prisma.newsComment.findFirst({
      where: { id: commentId, newsId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.newsComment.update({
      where: { id: commentId },
      data: { content },
      include: { user: { select: COMMENT_AUTHOR_SELECT } },
    });
    return this.toPublicComment(updated, userId);
  }

  async deleteOwnComment(userId: string, newsId: string, commentId: string) {
    const comment = await this.prisma.newsComment.findFirst({
      where: { id: commentId, newsId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.newsComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Comment deleted' };
  }

  // ── Counters ─────────────────────────────────────────

  async recordView(newsId: string) {
    await this.increment(newsId, { viewCount: { increment: 1 } });
  }

  async recordShare(newsId: string) {
    await this.increment(newsId, { shareCount: { increment: 1 } });
  }

  // ── Helpers ──────────────────────────────────────────

  private async increment(newsId: string, data: Prisma.NewsUpdateManyMutationInput) {
    const { count } = await this.prisma.news.updateMany({
      where: { id: newsId, ...PUBLISHED_WHERE },
      data,
    });
    if (count === 0) throw new NotFoundException('News not found');
  }

  private async findPublished(newsId: string) {
    const news = await this.prisma.news.findFirst({
      where: { id: newsId, ...PUBLISHED_WHERE },
      select: { id: true, allowComments: true },
    });
    if (!news) throw new NotFoundException('News not found');
    return news;
  }

  /** Public like count + the caller's reaction. Dislike counts stay admin-only. */
  private async reactionState(newsId: string, userId: string) {
    const [likeCount, mine] = await Promise.all([
      this.prisma.newsReaction.count({ where: { newsId, type: NewsReactionType.LIKE } }),
      this.prisma.newsReaction.findUnique({
        where: { newsId_userId: { newsId, userId } },
        select: { type: true },
      }),
    ]);
    return { likeCount, myReaction: mine?.type ?? null };
  }

  /**
   * Comments are visible to anonymous visitors, so only a display name (first name + last
   * initial) and avatar are exposed — never the commenter's user id or email.
   */
  private toPublicComment(comment: CommentRow, userId?: string) {
    const { firstName, lastName, avatarUrl } = comment.user;
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        name: [firstName, lastName ? `${lastName.charAt(0)}.` : ''].filter(Boolean).join(' '),
        avatarUrl,
      },
      isMine: Boolean(userId) && comment.userId === userId,
    };
  }
}
