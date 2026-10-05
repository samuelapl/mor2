'use client';

import { useParams } from 'next/navigation';
import { NewsEditor } from '@/components/features/news/NewsEditor';

export default function EditNewsPage() {
  const { id } = useParams<{ id: string }>();
  // key: switching posts (e.g. after creating a draft) remounts with fresh state.
  return <NewsEditor key={id} newsId={id} />;
}
