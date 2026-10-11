'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Trash2 } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Table, TableRow, Td } from '@/components/ui/Table';
import {
  adminDeleteNewsComment,
  adminGetNews,
  adminListNewsComments,
  moderateNewsComment,
} from '@/lib/api/news';
import type { ApiAdminNewsComment, ApiMeta } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePermissions } from '@/lib/usePermissions';
import { NEWS_PERMISSIONS, formatNewsDate, newsTextLang } from '@/lib/news';
import { toast } from '@/lib/toast';

const PAGE_SIZE = 20;

/** Comment moderation for one post (news.publish): hide/unhide or delete any comment. */
export default function NewsCommentsModerationPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const { lang, t } = useTranslation('news');
  const [headline, setHeadline] = useState('');
  const [items, setItems] = useState<ApiAdminNewsComment[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<ApiAdminNewsComment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListNewsComments(id, { page, limit: PAGE_SIZE });
      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load comments');
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminGetNews(id)
      .then((n) => setHeadline(n.headline))
      .catch(() => undefined);
  }, [id]);

  if (!can(NEWS_PERMISSIONS.publish)) {
    return (
      <PageShell title={t('newsComments.comments')}>
        <EmptyState
          title={t('newsCommentsModerationPage.publishersOnly')}
          description={t('newsCommentsModerationPage.moderatingCommentsNeedsTheNewsPublish')}
        />
      </PageShell>
    );
  }

  const toggleHidden = async (c: ApiAdminNewsComment) => {
    try {
      await moderateNewsComment(id, c.id, !c.isHidden);
      setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, isHidden: !c.isHidden } : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the comment');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await adminDeleteNewsComment(id, deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the comment');
    }
  };

  return (
    <PageShell
      title={t('newsComments.comments')}
      description={headline ? <span lang={newsTextLang(headline)}>{headline}</span> : undefined}
      actions={
        <Link
          href={`/news-management/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('newsCommentsModerationPage.backToTheNews')}
        </Link>
      }
    >
      {loading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : items.length === 0 ? (
        <EmptyState title={t('newsCommentsModerationPage.noCommentsYet')} />
      ) : (
        <>
          <Table
            columns={[
              { name: 'author', label: t('newsEditor.author') },
              { name: 'comment', label: t('newsCommentsModerationPage.comment') },
              { name: 'visibility', label: t('newsCommentsModerationPage.visibility') },
              { name: 'actions', label: '' },
            ]}
          >
            {items.map((c) => (
              <TableRow key={c.id} className={c.isHidden ? 'opacity-60' : undefined}>
                <Td className="whitespace-nowrap">
                  <p className="text-sm font-semibold text-foreground">
                    {c.user.firstName} {c.user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.user.email}</p>
                  <p className="text-xs text-subtle-foreground">{formatNewsDate(c.createdAt, lang)}</p>
                </Td>
                <Td>
                  <p
                    lang={newsTextLang(c.content)}
                    className="max-w-xl whitespace-pre-line break-words text-sm"
                  >
                    {c.content}
                  </p>
                </Td>
                <Td>
                  {c.isHidden ? (
                    <Badge variant="outline">{t('newsCommentsModerationPage.hidden')}</Badge>
                  ) : (
                    <Badge variant="green">{t('newsCommentsModerationPage.visible')}</Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => void toggleHidden(c)}
                    className="rounded-lg p-1.5 text-subtle-foreground hover:bg-secondary hover:text-secondary-foreground"
                    aria-label={c.isHidden ? t('newsCommentsModerationPage.show') : t('newsCommentsModerationPage.hide')}
                    title={c.isHidden ? t('newsCommentsModerationPage.show') : t('newsCommentsModerationPage.hide')}
                  >
                    {c.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(c)}
                    className="rounded-lg p-1.5 text-subtle-foreground hover:bg-danger-soft hover:text-danger"
                    aria-label={t('newsComments.delete')}
                    title={t('newsComments.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </TableRow>
            ))}
          </Table>
          {meta && (
            <Pagination
              className="mt-6"
              page={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={setPage}
              hideOnSinglePage
            />
          )}
        </>
      )}

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={t('newsCommentsModerationPage.deleteThisComment')}
        description={t('newsCommentsModerationPage.itWillBeRemovedForEveryone')}
        confirmText={t('newsComments.delete')}
        variant="danger"
      />
    </PageShell>
  );
}
