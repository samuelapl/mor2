import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { NewsReactionType, NewsStatus, RoleName } from '@prisma/client';
import { AuthenticatedUser } from '@common/interfaces';
import { NewsService } from './news.service';
import { NEWS_MANAGE, NEWS_PUBLISH } from './news.constants';

function buildUser(id: string, permissions: string[], roles: RoleName[] = []): AuthenticatedUser {
  return {
    id,
    email: `${id}@example.com`,
    firstName: 'U',
    lastName: 'Ser',
    roles,
    sid: 'sid',
    permissions,
  };
}

const writer = buildUser('writer', [NEWS_MANAGE]);
const otherWriter = buildUser('other-writer', [NEWS_MANAGE]);
const publisher = buildUser('publisher', [NEWS_PUBLISH]);
const admin = buildUser('admin', [], [RoleName.SYSTEM_ADMIN]);

function buildNews(overrides: Record<string, unknown> = {}) {
  return {
    id: 'news-1',
    slug: 'a-headline',
    headline: 'A headline',
    content: '<p>Body</p>',
    coverImageUrl: 'http://minio/bucket/news/news-1/c.jpg',
    status: NewsStatus.DRAFT,
    createdById: writer.id,
    publishedAt: null,
    ...overrides,
  };
}

function buildPrisma(news: Record<string, unknown>) {
  return {
    news: {
      findFirst: jest.fn().mockResolvedValue(news),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(news),
      count: jest.fn().mockResolvedValue(0),
    },
    newsReaction: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    newsComment: { groupBy: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function buildService(news: Record<string, unknown>) {
  const prisma = buildPrisma(news);
  const notifications = { sendToMany: jest.fn().mockResolvedValue([]) };
  const service = new NewsService(prisma as any, {} as any, notifications as any);
  // adminGet re-reads with includes; the workflow tests only care about the write.
  jest.spyOn(service, 'adminGet').mockResolvedValue({} as any);
  return { service, prisma, notifications };
}

describe('NewsService editing rules', () => {
  it('lets the author edit their own draft', async () => {
    const { service, prisma } = buildService(buildNews());
    await service.update(writer, 'news-1', { source: 'MoR' });
    expect(prisma.news.update).toHaveBeenCalled();
  });

  it("blocks a writer from editing someone else's draft", async () => {
    const { service } = buildService(buildNews());
    await expect(service.update(otherWriter, 'news-1', { source: 'MoR' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it.each([NewsStatus.PENDING_REVIEW, NewsStatus.PUBLISHED, NewsStatus.ARCHIVED])(
    'blocks the author from editing their own %s post',
    async (status) => {
      const { service } = buildService(buildNews({ status }));
      await expect(service.update(writer, 'news-1', { source: 'MoR' })).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(writer, 'news-1')).rejects.toThrow(ForbiddenException);
    },
  );

  it('lets a publisher edit and delete a published post', async () => {
    const { service, prisma } = buildService(buildNews({ status: NewsStatus.PUBLISHED }));
    await service.update(publisher, 'news-1', { source: 'MoR' });
    await service.remove(publisher, 'news-1');
    expect(prisma.news.update).toHaveBeenCalledTimes(2);
  });

  it('never changes the slug when the headline is edited', async () => {
    const { service, prisma } = buildService(buildNews());
    await service.update(writer, 'news-1', { headline: 'የገቢዎች ሚኒስቴር ዜና' });
    expect(prisma.news.update.mock.calls[0][0].data.slug).toBeUndefined();
  });

  it('creates posts with a slug of the first 5 characters of their id', async () => {
    const { service, prisma } = buildService(buildNews());
    (prisma.news as any).create = jest.fn().mockImplementation(({ data }) => data);
    await service.create(writer, { headline: 'ዜና', content: '<p>ይዘት</p>' });
    const { id, slug } = (prisma.news as any).create.mock.calls[0][0].data;
    expect(slug).toBe(id.replace(/-/g, '').slice(0, 5));
  });

  it('rejects content that is empty once sanitized', async () => {
    const { service } = buildService(buildNews());
    await expect(
      service.update(writer, 'news-1', { content: '<script>x</script>' }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('NewsService workflow', () => {
  it('requires a cover image before submitting', async () => {
    const { service } = buildService(buildNews({ coverImageUrl: null }));
    await expect(service.submit(writer, 'news-1')).rejects.toThrow(/cover image/);
  });

  it('only lets the author submit', async () => {
    const { service } = buildService(buildNews());
    await expect(service.submit(otherWriter, 'news-1')).rejects.toThrow(ForbiddenException);
  });

  it('refuses to approve a post that is not pending review', async () => {
    const { service } = buildService(buildNews());
    await expect(service.review(publisher, 'news-1', { approve: true })).rejects.toThrow(
      ConflictException,
    );
  });

  it('blocks reviewers from approving their own post (four-eyes rule)', async () => {
    const selfReviewer = buildUser('writer', [NEWS_MANAGE, NEWS_PUBLISH]);
    const { service } = buildService(buildNews({ status: NewsStatus.PENDING_REVIEW }));
    await expect(service.review(selfReviewer, 'news-1', { approve: true })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets a system admin approve their own post', async () => {
    const { service, prisma } = buildService(
      buildNews({ status: NewsStatus.PENDING_REVIEW, createdById: admin.id }),
    );
    await service.review(admin, 'news-1', { approve: true });
    expect(prisma.news.update.mock.calls[0][0].data.status).toBe(NewsStatus.PUBLISHED);
  });

  it('sets publishedAt and notifies learners on first publish only', async () => {
    const { service, prisma } = buildService(buildNews({ status: NewsStatus.PENDING_REVIEW }));
    await service.review(publisher, 'news-1', { approve: true });
    const data = prisma.news.update.mock.calls[0][0].data;
    expect(data.publishedAt).toBeInstanceOf(Date);
    expect(data.reviewedById).toBe(publisher.id);
    expect(prisma.user.findMany).toHaveBeenCalled();
  });

  it('stores the reason when rejecting', async () => {
    const { service, prisma } = buildService(buildNews({ status: NewsStatus.PENDING_REVIEW }));
    await service.review(publisher, 'news-1', { approve: false, reason: 'Fix the date' });
    const data = prisma.news.update.mock.calls[0][0].data;
    expect(data.status).toBe(NewsStatus.REJECTED);
    expect(data.rejectionReason).toBe('Fix the date');
    expect(data.publishedAt).toBeUndefined();
  });

  it('only features published posts and caps the featured count', async () => {
    const draft = buildService(buildNews());
    await expect(draft.service.setFeatured(publisher, 'news-1', true)).rejects.toThrow(
      ConflictException,
    );

    const full = buildService(buildNews({ status: NewsStatus.PUBLISHED }));
    full.prisma.news.count.mockResolvedValue(3);
    await expect(full.service.setFeatured(publisher, 'news-1', true)).rejects.toThrow(/At most 3/);
  });
});

describe('NewsService public reads', () => {
  it('lists only published, non-deleted news and hides dislike counts', async () => {
    const { service, prisma } = buildService(buildNews());
    prisma.news.findMany.mockResolvedValue([
      { id: 'news-1', headline: 'ዜና', summary: null, content: '<p>የገቢዎች ሚኒስቴር ዜና</p>' },
    ]);
    prisma.news.count = jest.fn().mockResolvedValue(1);
    prisma.newsReaction.groupBy.mockResolvedValue([
      { newsId: 'news-1', type: NewsReactionType.LIKE, _count: { _all: 4 } },
      { newsId: 'news-1', type: NewsReactionType.DISLIKE, _count: { _all: 2 } },
    ]);

    const result = await service.listPublished({}, 'reader');

    expect(prisma.news.findMany.mock.calls[0][0].where).toMatchObject({
      status: NewsStatus.PUBLISHED,
      deletedAt: null,
    });
    const [card] = result.data;
    expect(card.likeCount).toBe(4);
    expect(card).not.toHaveProperty('dislikeCount');
    expect(card).not.toHaveProperty('content');
    expect(card.summary).toBe('የገቢዎች ሚኒስቴር ዜና');
  });

  it('can leave featured posts out of the list (or return only them)', async () => {
    const { service, prisma } = buildService(buildNews());
    prisma.news.count = jest.fn().mockResolvedValue(0);
    await service.listPublished({ featured: false });
    expect(prisma.news.findMany.mock.calls[0][0].where.isFeatured).toBe(false);
    await service.listPublished({ featured: true });
    expect(prisma.news.findMany.mock.calls[1][0].where.isFeatured).toBe(true);
    await service.listPublished({});
    expect(prisma.news.findMany.mock.calls[2][0].where).not.toHaveProperty('isFeatured');
  });
});
