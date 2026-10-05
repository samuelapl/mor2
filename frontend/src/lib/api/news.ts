import { api, getAccessToken, API_BASE_URL } from './client';
import type {
  ApiAdminNews,
  ApiAdminNewsComment,
  ApiNewsCard,
  ApiNewsComment,
  ApiNewsDetail,
  ApiNewsImage,
  ApiNewsReactionState,
  ApiPaginated,
  NewsCategory,
  NewsInput,
  NewsReactionType,
  NewsStatus,
} from './types';

/* -------------------------------------------------------------------------- */
/*  Public                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchNewsList(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: NewsCategory;
    /** true: only featured posts; false: leave them out. */
    featured?: boolean;
  } = {},
): Promise<ApiPaginated<ApiNewsCard>> {
  return api<ApiPaginated<ApiNewsCard>>('news', { query: params });
}

export async function fetchFeaturedNews(): Promise<ApiNewsCard[]> {
  return api<ApiNewsCard[]>('news/featured');
}

export async function fetchNewsBySlug(slug: string): Promise<ApiNewsDetail> {
  return api<ApiNewsDetail>(`news/${encodeURIComponent(slug)}`);
}

export async function recordNewsView(id: string): Promise<void> {
  return api<void>(`news/${id}/view`, { method: 'POST' });
}

export async function recordNewsShare(id: string): Promise<void> {
  return api<void>(`news/${id}/share`, { method: 'POST' });
}

/* -------------------------------------------------------------------------- */
/*  Signed-in readers                                                          */
/* -------------------------------------------------------------------------- */

/** Sending the reaction the user already has removes it (server-side toggle). */
export async function reactToNews(id: string, type: NewsReactionType): Promise<ApiNewsReactionState> {
  return api<ApiNewsReactionState>(`news/${id}/reaction`, { method: 'PUT', body: { type } });
}

export async function fetchNewsComments(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<ApiPaginated<ApiNewsComment>> {
  return api<ApiPaginated<ApiNewsComment>>(`news/${id}/comments`, { query: params });
}

export async function postNewsComment(id: string, content: string): Promise<ApiNewsComment> {
  return api<ApiNewsComment>(`news/${id}/comments`, { method: 'POST', body: { content } });
}

export async function deleteOwnNewsComment(id: string, commentId: string): Promise<void> {
  await api(`news/${id}/comments/${commentId}`, { method: 'DELETE' });
}

/* -------------------------------------------------------------------------- */
/*  Admin (news.manage / news.publish)                                         */
/* -------------------------------------------------------------------------- */

export async function adminListNews(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: NewsCategory;
    status?: NewsStatus;
  } = {},
): Promise<ApiPaginated<ApiAdminNews>> {
  return api<ApiPaginated<ApiAdminNews>>('news/admin', { query: params });
}

export async function adminGetNews(id: string): Promise<ApiAdminNews> {
  return api<ApiAdminNews>(`news/admin/${id}`);
}

export async function createNews(body: NewsInput): Promise<ApiAdminNews> {
  return api<ApiAdminNews>('news/admin', { method: 'POST', body });
}

export async function updateNews(id: string, body: Partial<NewsInput>): Promise<ApiAdminNews> {
  return api<ApiAdminNews>(`news/admin/${id}`, { method: 'PATCH', body });
}

export async function deleteNews(id: string): Promise<void> {
  await api(`news/admin/${id}`, { method: 'DELETE' });
}

export async function submitNews(id: string): Promise<ApiAdminNews> {
  return api<ApiAdminNews>(`news/admin/${id}/submit`, { method: 'POST' });
}

export async function reviewNews(
  id: string,
  body: { approve: boolean; reason?: string },
): Promise<ApiAdminNews> {
  return api<ApiAdminNews>(`news/admin/${id}/review`, { method: 'POST', body });
}

export async function unpublishNews(id: string): Promise<ApiAdminNews> {
  return api<ApiAdminNews>(`news/admin/${id}/unpublish`, { method: 'POST' });
}

export async function republishNews(id: string): Promise<ApiAdminNews> {
  return api<ApiAdminNews>(`news/admin/${id}/republish`, { method: 'POST' });
}

export async function featureNews(id: string, isFeatured: boolean): Promise<ApiAdminNews> {
  return api<ApiAdminNews>(`news/admin/${id}/feature`, { method: 'PATCH', body: { isFeatured } });
}

/** Uploads the cover (`asCover`) or a gallery image; multipart, so it bypasses the JSON client. */
export async function uploadNewsImage(
  id: string,
  file: File,
  asCover: boolean,
): Promise<{ coverImageUrl?: string } & Partial<ApiNewsImage>> {
  const form = new FormData();
  form.append('file', file);
  const token = getAccessToken();
  const res = await fetch(
    `${API_BASE_URL.replace(/\/+$/, '')}/news/admin/${id}/images${asCover ? '?cover=true' : ''}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: 'include',
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message;
    throw new Error(
      Array.isArray(message) ? message.join(', ') : message || `Upload failed (${res.status})`,
    );
  }
  return body?.data ?? {};
}

export async function updateNewsImage(
  id: string,
  imageId: string,
  body: { caption?: string | null; sortOrder?: number },
): Promise<ApiNewsImage> {
  return api<ApiNewsImage>(`news/admin/${id}/images/${imageId}`, { method: 'PATCH', body });
}

export async function deleteNewsImage(id: string, imageId: string): Promise<void> {
  await api(`news/admin/${id}/images/${imageId}`, { method: 'DELETE' });
}

export async function adminListNewsComments(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<ApiPaginated<ApiAdminNewsComment>> {
  return api<ApiPaginated<ApiAdminNewsComment>>(`news/admin/${id}/comments`, { query: params });
}

export async function moderateNewsComment(
  id: string,
  commentId: string,
  isHidden: boolean,
): Promise<void> {
  await api(`news/admin/${id}/comments/${commentId}`, { method: 'PATCH', body: { isHidden } });
}

export async function adminDeleteNewsComment(id: string, commentId: string): Promise<void> {
  await api(`news/admin/${id}/comments/${commentId}`, { method: 'DELETE' });
}
