import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NewsDetailView } from '@/components/features/news/NewsDetailView';
import { fetchPublishedNewsServer, NEWS_REVALIDATE_SECONDS } from '@/lib/api/news-server';
import { buildSummaryText } from '@/lib/news';

export const revalidate = NEWS_REVALIDATE_SECONDS;

interface Params {
  params: { slug: string };
}

/** Ethiopic slugs may reach us percent-encoded; decoding an already-decoded slug is a no-op. */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

// Server-rendered tags are what Telegram/Facebook/X read to build the link preview card.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const news = await fetchPublishedNewsServer(decodeSlug(params.slug));
  if (!news) return { title: 'ዜና | News' };

  const description = news.summary ?? buildSummaryText(news.content);
  const images = news.coverImageUrl ? [{ url: news.coverImageUrl, alt: news.headline }] : [];
  return {
    title: news.headline,
    description,
    openGraph: {
      type: 'article',
      title: news.headline,
      description,
      siteName: 'የገቢዎች ሚኒስቴር | Ministry of Revenues',
      publishedTime: news.publishedAt ?? undefined,
      images,
    },
    twitter: {
      card: news.coverImageUrl ? 'summary_large_image' : 'summary',
      title: news.headline,
      description,
      images: news.coverImageUrl ? [news.coverImageUrl] : [],
    },
  };
}

export default async function NewsDetailPage({ params }: Params) {
  const news = await fetchPublishedNewsServer(decodeSlug(params.slug));
  if (!news) notFound();
  return <NewsDetailView initial={news} />;
}
