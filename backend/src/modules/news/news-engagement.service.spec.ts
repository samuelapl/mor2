import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NewsReactionType } from '@prisma/client';
import { NewsEngagementService } from './news-engagement.service';

function buildPrisma(overrides: { allowComments?: boolean; published?: boolean } = {}) {
  const news =
    overrides.published === false
      ? null
      : { id: 'news-1', allowComments: overrides.allowComments ?? true };
  return {
    news: {
      findFirst: jest.fn().mockResolvedValue(news),
      updateMany: jest.fn().mockResolvedValue({ count: news ? 1 : 0 }),
    },
    newsReaction: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    newsComment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('NewsEngagementService reactions', () => {
  it('adds a reaction when the user has none', async () => {
    const prisma = buildPrisma();
    await new NewsEngagementService(prisma as any).react('u1', 'news-1', NewsReactionType.LIKE);
    expect(prisma.newsReaction.upsert).toHaveBeenCalled();
    expect(prisma.newsReaction.delete).not.toHaveBeenCalled();
  });

  it('removes the reaction when the same type is sent again (toggle)', async () => {
    const prisma = buildPrisma();
    prisma.newsReaction.findUnique.mockResolvedValueOnce({ type: NewsReactionType.LIKE });
    await new NewsEngagementService(prisma as any).react('u1', 'news-1', NewsReactionType.LIKE);
    expect(prisma.newsReaction.delete).toHaveBeenCalled();
    expect(prisma.newsReaction.upsert).not.toHaveBeenCalled();
  });

  it('switches like to dislike in place', async () => {
    const prisma = buildPrisma();
    prisma.newsReaction.findUnique.mockResolvedValueOnce({ type: NewsReactionType.LIKE });
    await new NewsEngagementService(prisma as any).react('u1', 'news-1', NewsReactionType.DISLIKE);
    expect(prisma.newsReaction.upsert.mock.calls[0][0].update).toEqual({
      type: NewsReactionType.DISLIKE,
    });
  });

  it('refuses reactions on unpublished news', async () => {
    const prisma = buildPrisma({ published: false });
    await expect(
      new NewsEngagementService(prisma as any).react('u1', 'news-1', NewsReactionType.LIKE),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('NewsEngagementService comments', () => {
  it('refuses comments when they are closed', async () => {
    const prisma = buildPrisma({ allowComments: false });
    await expect(
      new NewsEngagementService(prisma as any).addComment('u1', 'news-1', 'Hello'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('exposes a display name but not the user id or email', async () => {
    const prisma = buildPrisma();
    prisma.newsComment.create.mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      content: 'Hello',
      createdAt: new Date(),
      user: { firstName: 'Abebe', lastName: 'Kebede', avatarUrl: null },
    });
    const comment = await new NewsEngagementService(prisma as any).addComment(
      'u1',
      'news-1',
      'Hello',
    );
    expect(comment.author).toEqual({ name: 'Abebe K.', avatarUrl: null });
    expect(comment.isMine).toBe(true);
    expect(comment).not.toHaveProperty('userId');
  });

  it("blocks deleting someone else's comment", async () => {
    const prisma = buildPrisma();
    prisma.newsComment.findFirst.mockResolvedValue({ id: 'c1', userId: 'someone-else' });
    await expect(
      new NewsEngagementService(prisma as any).deleteOwnComment('u1', 'news-1', 'c1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('404s counters for unpublished news', async () => {
    const prisma = buildPrisma({ published: false });
    await expect(new NewsEngagementService(prisma as any).recordView('news-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
