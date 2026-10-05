'use client';

import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { NEWS_CATEGORY_LABELS, NEWS_STATUS_LABELS, NEWS_STATUS_VARIANTS } from '@/lib/news';
import type { NewsCategory, NewsStatus } from '@/lib/api/types';

export function NewsCategoryBadge({ category, className }: { category: NewsCategory; className?: string }) {
  const { tBilingual } = useTranslation();
  return (
    <Badge variant="blue" className={className}>
      {tBilingual(NEWS_CATEGORY_LABELS[category])}
    </Badge>
  );
}

export function NewsStatusBadge({ status }: { status: NewsStatus }) {
  const { tBilingual } = useTranslation();
  return (
    <Badge variant={NEWS_STATUS_VARIANTS[status]} dot>
      {tBilingual(NEWS_STATUS_LABELS[status])}
    </Badge>
  );
}
