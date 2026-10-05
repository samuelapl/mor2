import type { Metadata } from 'next';
import { NewsListView } from '@/components/features/news/NewsListView';

export const metadata: Metadata = {
  title: 'ዜናዎች | News',
  description: 'የገቢዎች ሚኒስቴር ዜናዎች እና ማስታወቂያዎች — Ministry of Revenues news and announcements.',
};

export default function NewsPage() {
  return <NewsListView />;
}
