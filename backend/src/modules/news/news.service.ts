import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  News,
  NewsReactionType,
  NewsStatus,
  NotificationType,
  Prisma,
  RoleName,
} from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '@config/prisma.service';
import { AuthenticatedUser } from '@common/interfaces';
import { buildPaginatedResponse, buildPaginationArgs } from '@common/utils';
import { FilesService } from '@modules/files/files.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import {
  AdminListNewsQueryDto,
  CreateNewsDto,
  ListCommentsQueryDto,
  ListNewsQueryDto,
  ReviewNewsDto,
  UpdateNewsDto,
  UpdateNewsImageDto,
} from './dto';
import { MAX_FEATURED_NEWS, MAX_GALLERY_IMAGES, NEWS_MANAGE, NEWS_PUBLISH } from './news.constants';
import { buildSummary, htmlToPlainText, sanitizeNewsHtml } from './news-content.util';
import { slugCandidates, slugForId } from './news-slug.util';
import { AUTHOR_EDITABLE_STATUSES, assertTransition } from './news-status.util';

const DEFAULT_PAGE_SIZE = 12;

interface NewsAccess {
  isAdmin: boolean;
  canManage: boolean;
  canPublish: boolean;
}

export interface NewsStats {
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  myReaction: NewsReactionType | null;
}

const PERSON_SELECT = { id: true, firstName: true, lastName: true } satisfies Prisma.UserSelect;

const IMAGES_ORDER: Prisma.NewsImageOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

// Public cards need the content only to derive a summary when none was written.
const PUBLIC_CARD_SELECT = {
  id: true,
  slug: true,
  headline: true,
  summary: true,
  content: true,
  coverImageUrl: true,
  category: true,
  source: true,
  eventDate: true,
  publishedAt: true,
  isFeatured: true,
  allowComments: true,
} satisfies Prisma.NewsSelect;

type PublicCardRow = Prisma.NewsGetPayload<{ select: typeof PUBLIC_CARD_SELECT }>;

const PUBLISHED_WHERE: Prisma.NewsWhereInput = { status: NewsStatus.PUBLISHED, deletedAt: null };

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Public ───────────────────────────────────────────

  async listPublished(query: ListNewsQueryDto, userId?: string) {
    const { page, limit, skip } = buildPaginationArgs({
      page: query.page,
      limit: query.limit ?? DEFAULT_PAGE_SIZE,
    });
    const where: Prisma.NewsWhereInput = {
      ...PUBLISHED_WHERE,
      ...(query.category && { category: query.category }),
      ...(query.featured !== undefined && { isFeatured: query.featured }),
      ...this.searchWhere(query.search),
    };

    const [rows, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        select: PUBLIC_CARD_SELECT,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.news.count({ where }),
    ]);

    const stats = await this.statsFor(
      rows.map((r) => r.id),
      userId,
    );
    return buildPaginatedResponse(
      rows.map((r) => this.toPublicCard(r, stats.get(r.id)!)),
      total,
      page,
      limit,
    );
  }

  /** Featured posts first, topped up with the latest ones, for the landing page and dashboards. */
  async listFeatured() {
    const featured = await this.prisma.news.findMany({
      where: { ...PUBLISHED_WHERE, isFeatured: true },
      select: PUBLIC_CARD_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: MAX_FEATURED_NEWS,
    });
    const latest =
      featured.length < MAX_FEATURED_NEWS
        ? await this.prisma.news.findMany({
            where: { ...PUBLISHED_WHERE, id: { notIn: featured.map((f) => f.id) } },
            select: PUBLIC_CARD_SELECT,
            orderBy: { publishedAt: 'desc' },
            take: MAX_FEATURED_NEWS - featured.length,
          })
        : [];

    const rows = [...featured, ...latest];
    const stats = await this.statsFor(rows.map((r) => r.id));
    return rows.map((r) => this.toPublicCard(r, stats.get(r.id)!));
  }

  async getPublishedBySlug(slug: string, userId?: string) {
    const news = await this.prisma.news.findFirst({
      where: { ...PUBLISHED_WHERE, slug },
      select: {
        ...PUBLIC_CARD_SELECT,
        images: {
          select: { id: true, url: true, caption: true, sortOrder: true },
          orderBy: IMAGES_ORDER,
        },
      },
    });
    if (!news) throw new NotFoundException('News not found');

    const stats = (await this.statsFor([news.id], userId)).get(news.id)!;
    return {
      ...this.toPublicCard(news, stats),
      content: news.content,
      images: news.images,
    };
  }

  // ── Admin: read ──────────────────────────────────────

  async adminList(query: AdminListNewsQueryDto) {
    const { page, limit, skip } = buildPaginationArgs({
      page: query.page,
      limit: query.limit ?? DEFAULT_PAGE_SIZE,
    });
    const where: Prisma.NewsWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...this.searchWhere(query.search),
    };

    const [rows, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        omit: { content: true },
        include: { createdBy: { select: PERSON_SELECT } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.news.count({ where }),
    ]);

    const stats = await this.statsFor(
      rows.map((r) => r.id),
      undefined,
      true,
    );
    const data = rows.map((r) => {
      const { myReaction: _unused, ...counts } = stats.get(r.id)!;
      return { ...r, ...counts };
    });
    return buildPaginatedResponse(data, total, page, limit);
  }

  async adminGet(id: string) {
    const news = await this.prisma.news.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: { orderBy: IMAGES_ORDER },
        createdBy: { select: PERSON_SELECT },
        updatedBy: { select: PERSON_SELECT },
        reviewedBy: { select: PERSON_SELECT },
      },
    });
    if (!news) throw new NotFoundException('News not found');

    const { myReaction: _unused, ...counts } = (
      await this.statsFor([news.id], undefined, true)
    ).get(news.id)!;
    return { ...news, ...counts };
  }

  // ── Admin: write ─────────────────────────────────────

  async create(user: AuthenticatedUser, dto: CreateNewsDto) {
    const fields = this.normalizeFields(dto);
    // The id is chosen up front because the public slug is derived from it.
    const id = uuid();
    const news = await this.withSlugRetry(id, (slug) =>
      this.prisma.news.create({
        data: {
          ...(fields as Prisma.NewsUncheckedCreateInput),
          id,
          slug,
          createdById: user.id,
        },
      }),
    );
    return this.adminGet(news.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateNewsDto) {
    const news = await this.findActive(id);
    this.assertCanEdit(user, news);

    // The slug never changes after creation, so shared links keep working.
    await this.prisma.news.update({
      where: { id },
      data: { ...this.normalizeFields(dto), updatedById: user.id },
    });
    return this.adminGet(id);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const news = await this.findActive(id);
    this.assertCanEdit(user, news);
    // Soft delete: the row, its images and its history stay for tracing.
    await this.prisma.news.update({
      where: { id },
      data: { deletedAt: new Date(), isFeatured: false, updatedById: user.id },
    });
    return { message: 'News deleted' };
  }

  // ── Admin: images ────────────────────────────────────

  async uploadImage(
    user: AuthenticatedUser,
    id: string,
    file: Express.Multer.File | undefined,
    asCover: boolean,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const news = await this.findActive(id);
    this.assertCanEdit(user, news);

    if (!asCover) {
      const count = await this.prisma.newsImage.count({ where: { newsId: id } });
      if (count >= MAX_GALLERY_IMAGES) {
        throw new BadRequestException(`A post can have at most ${MAX_GALLERY_IMAGES} images`);
      }
    }

    const { url } = await this.filesService.uploadNewsImage(file, id);

    if (asCover) {
      await this.prisma.news.update({
        where: { id },
        data: { coverImageUrl: url, updatedById: user.id },
      });
      await this.filesService.removeByUrl(news.coverImageUrl);
      return { coverImageUrl: url };
    }

    const { _max } = await this.prisma.newsImage.aggregate({
      where: { newsId: id },
      _max: { sortOrder: true },
    });
    return this.prisma.newsImage.create({
      data: { newsId: id, url, sortOrder: (_max.sortOrder ?? -1) + 1 },
    });
  }

  async updateImage(user: AuthenticatedUser, id: string, imageId: string, dto: UpdateNewsImageDto) {
    const news = await this.findActive(id);
    this.assertCanEdit(user, news);
    await this.findImage(id, imageId);

    return this.prisma.newsImage.update({
      where: { id: imageId },
      data: {
        ...(dto.caption !== undefined && { caption: dto.caption?.trim() || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteImage(user: AuthenticatedUser, id: string, imageId: string) {
    const news = await this.findActive(id);
    this.assertCanEdit(user, news);
    const image = await this.findImage(id, imageId);

    await this.prisma.newsImage.delete({ where: { id: imageId } });
    await this.filesService.removeByUrl(image.url);
    return { message: 'Image deleted' };
  }

  // ── Admin: workflow ──────────────────────────────────

  async submit(user: AuthenticatedUser, id: string) {
    const news = await this.findActive(id);
    if (news.createdById !== user.id && !this.access(user).isAdmin) {
      throw new ForbiddenException('Only the author can submit this news for review');
    }
    assertTransition(news.status, NewsStatus.PENDING_REVIEW);

    const missing: string[] = [];
    if (!news.headline.trim()) missing.push('headline');
    if (!htmlToPlainText(news.content)) missing.push('content');
    if (!news.coverImageUrl) missing.push('cover image');
    if (missing.length) {
      throw new BadRequestException(`Add the ${missing.join(', ')} before submitting`);
    }

    await this.prisma.news.update({
      where: { id },
      data: { status: NewsStatus.PENDING_REVIEW, updatedById: user.id },
    });
    return this.adminGet(id);
  }

  async review(user: AuthenticatedUser, id: string, dto: ReviewNewsDto) {
    const news = await this.findActive(id);
    const target = dto.approve ? NewsStatus.PUBLISHED : NewsStatus.REJECTED;
    assertTransition(news.status, target);

    // Four-eyes rule: someone other than the author must approve. System admins may bypass it.
    if (news.createdById === user.id && !this.access(user).isAdmin) {
      throw new ForbiddenException('You cannot review news you wrote');
    }

    const now = new Date();
    const firstPublish = dto.approve && !news.publishedAt;
    const updated = await this.prisma.news.update({
      where: { id },
      data: {
        status: target,
        reviewedById: user.id,
        reviewedAt: now,
        rejectionReason: dto.approve ? null : dto.reason,
        ...(firstPublish && { publishedAt: now }),
      },
    });

    if (firstPublish) this.notifyLearners(updated);
    return this.adminGet(id);
  }

  async unpublish(user: AuthenticatedUser, id: string) {
    const news = await this.findActive(id);
    assertTransition(news.status, NewsStatus.ARCHIVED);
    await this.prisma.news.update({
      where: { id },
      data: { status: NewsStatus.ARCHIVED, isFeatured: false, updatedById: user.id },
    });
    return this.adminGet(id);
  }

  async republish(user: AuthenticatedUser, id: string) {
    const news = await this.findActive(id);
    assertTransition(news.status, NewsStatus.PUBLISHED);
    await this.prisma.news.update({
      where: { id },
      data: { status: NewsStatus.PUBLISHED, updatedById: user.id },
    });
    return this.adminGet(id);
  }

  async setFeatured(user: AuthenticatedUser, id: string, isFeatured: boolean) {
    const news = await this.findActive(id);
    if (isFeatured) {
      if (news.status !== NewsStatus.PUBLISHED) {
        throw new ConflictException('Only published news can be featured');
      }
      const featuredCount = await this.prisma.news.count({
        where: { ...PUBLISHED_WHERE, isFeatured: true, id: { not: id } },
      });
      if (featuredCount >= MAX_FEATURED_NEWS) {
        throw new ConflictException(
          `At most ${MAX_FEATURED_NEWS} posts can be featured — unfeature one first`,
        );
      }
    }
    await this.prisma.news.update({
      where: { id },
      data: { isFeatured, updatedById: user.id },
    });
    return this.adminGet(id);
  }

  // ── Admin: comment moderation ────────────────────────

  async adminListComments(id: string, query: ListCommentsQueryDto) {
    await this.findActive(id);
    const { page, limit, skip } = buildPaginationArgs(query);
    const where: Prisma.NewsCommentWhereInput = { newsId: id, deletedAt: null };

    const [rows, total] = await Promise.all([
      this.prisma.newsComment.findMany({
        where,
        include: { user: { select: { ...PERSON_SELECT, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.newsComment.count({ where }),
    ]);
    return buildPaginatedResponse(rows, total, page, limit);
  }

  async moderateComment(user: AuthenticatedUser, id: string, commentId: string, isHidden: boolean) {
    await this.findComment(id, commentId);
    return this.prisma.newsComment.update({
      where: { id: commentId },
      data: { isHidden, hiddenById: isHidden ? user.id : null },
    });
  }

  async adminDeleteComment(id: string, commentId: string) {
    await this.findComment(id, commentId);
    await this.prisma.newsComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Comment deleted' };
  }

  // ── Helpers ──────────────────────────────────────────

  /** Like/dislike/comment counts per post, plus the caller's own reaction when a user id is given. */
  async statsFor(
    newsIds: string[],
    userId?: string,
    includeHiddenComments = false,
  ): Promise<Map<string, NewsStats>> {
    const result = new Map<string, NewsStats>(
      newsIds.map((id) => [
        id,
        { likeCount: 0, dislikeCount: 0, commentCount: 0, myReaction: null },
      ]),
    );
    if (newsIds.length === 0) return result;

    const [reactions, comments, mine] = await Promise.all([
      this.prisma.newsReaction.groupBy({
        by: ['newsId', 'type'],
        where: { newsId: { in: newsIds } },
        _count: { _all: true },
      }),
      this.prisma.newsComment.groupBy({
        by: ['newsId'],
        where: {
          newsId: { in: newsIds },
          deletedAt: null,
          ...(!includeHiddenComments && { isHidden: false }),
        },
        _count: { _all: true },
      }),
      userId
        ? this.prisma.newsReaction.findMany({
            where: { newsId: { in: newsIds }, userId },
            select: { newsId: true, type: true },
          })
        : Promise.resolve([]),
    ]);

    for (const r of reactions) {
      const s = result.get(r.newsId)!;
      if (r.type === NewsReactionType.LIKE) s.likeCount = r._count._all;
      else s.dislikeCount = r._count._all;
    }
    for (const c of comments) result.get(c.newsId)!.commentCount = c._count._all;
    for (const m of mine) result.get(m.newsId)!.myReaction = m.type;
    return result;
  }

  private access(user: AuthenticatedUser): NewsAccess {
    // PermissionsGuard fills user.permissions on every @Permissions route (skipped for system admins).
    const isAdmin = user.roles.includes(RoleName.SYSTEM_ADMIN);
    const permissions = user.permissions ?? [];
    return {
      isAdmin,
      canManage: isAdmin || permissions.includes(NEWS_MANAGE),
      canPublish: isAdmin || permissions.includes(NEWS_PUBLISH),
    };
  }

  /** news.publish may edit/delete anything; news.manage only their own DRAFT or REJECTED posts. */
  private assertCanEdit(user: AuthenticatedUser, news: News) {
    const { canManage, canPublish } = this.access(user);
    if (canPublish) return;
    if (!canManage || news.createdById !== user.id) {
      throw new ForbiddenException('You can only change news you wrote');
    }
    if (!AUTHOR_EDITABLE_STATUSES.includes(news.status)) {
      throw new ForbiddenException(
        `News that is ${news.status} can only be changed by a publisher`,
      );
    }
  }

  private async findActive(id: string): Promise<News> {
    const news = await this.prisma.news.findFirst({ where: { id, deletedAt: null } });
    if (!news) throw new NotFoundException('News not found');
    return news;
  }

  private async findImage(newsId: string, imageId: string) {
    const image = await this.prisma.newsImage.findFirst({ where: { id: imageId, newsId } });
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  private async findComment(newsId: string, commentId: string) {
    const comment = await this.prisma.newsComment.findFirst({
      where: { id: commentId, newsId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private searchWhere(search?: string): Prisma.NewsWhereInput {
    const term = search?.trim();
    if (!term) return {};
    return {
      OR: [{ headline: { contains: term, mode: 'insensitive' } }],
    };
  }

  /**
   * DTO → column values for create/update. Undefined fields are left out; optional text
   * fields that arrive empty become null. Content is sanitized to the rich-text allow-list.
   */
  private normalizeFields(dto: UpdateNewsDto): Prisma.NewsUncheckedUpdateInput {
    const data: Prisma.NewsUncheckedUpdateInput = {};
    const optionalText = (v: string | null | undefined) => v?.trim() || null;

    if (dto.headline !== undefined) {
      if (!dto.headline) throw new BadRequestException('Headline is required');
      data.headline = dto.headline;
    }
    if (dto.content !== undefined) {
      const content = sanitizeNewsHtml(dto.content ?? '');
      if (!htmlToPlainText(content)) throw new BadRequestException('Content is required');
      data.content = content;
    }
    if (dto.summary !== undefined) data.summary = optionalText(dto.summary);
    if (dto.category != null) data.category = dto.category;
    if (dto.source != null) data.source = dto.source;
    if (dto.eventDate !== undefined)
      data.eventDate = dto.eventDate ? new Date(dto.eventDate) : null;
    if (dto.allowComments != null) data.allowComments = dto.allowComments;
    return data;
  }

  /** First 5 characters of the id, or more if a post already holds that prefix. */
  private async generateSlug(id: string): Promise<string> {
    // Soft-deleted rows still hold their slug (unique column), so they count as taken.
    const taken = await this.prisma.news.findMany({
      where: { slug: { in: slugCandidates(id) } },
      select: { slug: true },
    });
    return slugForId(
      id,
      taken.map((t) => t.slug),
    );
  }

  /** Two posts created at the same moment can race for the same short slug; retry once. */
  private async withSlugRetry<T>(id: string, write: (slug: string) => Promise<T>): Promise<T> {
    try {
      return await write(await this.generateSlug(id));
    } catch (err) {
      const isSlugClash =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        String(err.meta?.target ?? '').includes('slug');
      if (!isSlugClash) throw err;
      return write(await this.generateSlug(id));
    }
  }

  private toPublicCard(row: PublicCardRow, stats: NewsStats) {
    const { content, ...card } = row;
    return {
      ...card,
      summary: buildSummary(row.summary, content),
      // Dislike counts are deliberately not public — only news.manage / news.publish see them.
      likeCount: stats.likeCount,
      commentCount: stats.commentCount,
      myReaction: stats.myReaction,
    };
  }

  /** Fire-and-forget: a failed notification must never fail the publish itself. */
  private notifyLearners(news: News) {
    void (async () => {
      const learners = await this.prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          registrationStatus: 'APPROVED',
          roles: { some: { role: RoleName.LEARNER } },
        },
        select: { id: true },
      });
      await this.notificationsService.sendToMany(
        learners.map((l) => l.id),
        NotificationType.SYSTEM,
        { en: 'New announcement', am: 'አዲስ ማስታወቂያ' },
        { en: news.headline, am: news.headline },
        { newsId: news.id, slug: news.slug },
        // Goes to every learner: too many emails for the mail provider's daily quota.
        { email: false },
      );
    })().catch((err) =>
      this.logger.error(`Failed to send news notifications for ${news.id}: ${err.message}`),
    );
  }
}
