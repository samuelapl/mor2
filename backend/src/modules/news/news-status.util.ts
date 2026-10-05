import { ConflictException } from '@nestjs/common';
import { NewsStatus } from '@prisma/client';

// DRAFT → PENDING_REVIEW → PUBLISHED ⇄ ARCHIVED, with PENDING_REVIEW → REJECTED → PENDING_REVIEW.
export const NEWS_TRANSITIONS: Record<NewsStatus, NewsStatus[]> = {
  [NewsStatus.DRAFT]: [NewsStatus.PENDING_REVIEW],
  [NewsStatus.PENDING_REVIEW]: [NewsStatus.PUBLISHED, NewsStatus.REJECTED],
  [NewsStatus.REJECTED]: [NewsStatus.PENDING_REVIEW],
  [NewsStatus.PUBLISHED]: [NewsStatus.ARCHIVED],
  [NewsStatus.ARCHIVED]: [NewsStatus.PUBLISHED],
};

export function canTransition(from: NewsStatus, to: NewsStatus): boolean {
  return NEWS_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: NewsStatus, to: NewsStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Cannot move news from ${from} to ${to}`);
  }
}

/** Statuses an author with only news.manage may still edit or delete. */
export const AUTHOR_EDITABLE_STATUSES: NewsStatus[] = [NewsStatus.DRAFT, NewsStatus.REJECTED];
