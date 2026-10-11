'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Edit2, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  deleteOwnNewsComment,
  fetchNewsComments,
  postNewsComment,
  updateOwnNewsComment,
} from '@/lib/api/news';
import type { ApiNewsComment } from '@/lib/api/types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatNewsDate, newsTextLang } from '@/lib/news';
import { toast } from '@/lib/toast';
import { useSignInPrompt } from './useSignInPrompt';

const MAX_LENGTH = 1000;
const PAGE_SIZE = 20;

export function NewsComments({ newsId, allowComments }: { newsId: string; allowComments: boolean }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const ready = useAuthStore((s) => s.ready);
  const { lang, t } = useTranslation('news');
  const { loginHref } = useSignInPrompt();
  const [comments, setComments] = useState<ApiNewsComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const res = await fetchNewsComments(newsId, { page: nextPage, limit: PAGE_SIZE });
        setComments((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
        setTotal(res.meta.total);
        setHasMore(res.meta.hasNextPage);
        setPage(nextPage);
      } catch {
        // leave the list as it was; the section stays usable
      } finally {
        setLoading(false);
      }
    },
    [newsId],
  );

  // Reload once the session is known so `isMine` reflects the signed-in reader.
  useEffect(() => {
    if (ready) void load(1);
  }, [ready, currentUser?.id, load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const comment = await postNewsComment(newsId, content);
      setComments((prev) => [...prev, comment]);
      setTotal((n) => n + 1);
      setDraft('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('newsComments.couldNotPostYourComment'));
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (c: ApiNewsComment) => {
    setEditingId(c.id);
    setEditDraft(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async (commentId: string) => {
    const content = editDraft.trim();
    if (!content || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await updateOwnNewsComment(newsId, commentId, content);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: updated.content } : c)),
      );
      toast.success(t('newsComments.commentUpdatedSuccessfully'));
      setEditingId(null);
      setEditDraft('');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('newsComments.couldNotUpdateComment'),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteOwnNewsComment(newsId, deletingId);
      setComments((prev) => prev.filter((c) => c.id !== deletingId));
      setTotal((n) => Math.max(0, n - 1));
      toast.success(t('newsComments.commentDeletedSuccessfully'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('newsComments.couldNotDeleteTheComment'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-display text-lg font-bold text-foreground">
        {t('newsComments.comments')}{' '}
        <span className="text-sm font-medium text-subtle-foreground">({total})</span>
      </h2>

      {!allowComments ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          {t('newsComments.commentsAreClosedForThisNews')}
        </p>
      ) : currentUser ? (
        <form onSubmit={submit} className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            placeholder={t('newsComments.writeAComment')}
            className="w-full resize-y rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-info/60 focus:ring-4 focus:ring-info/10"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs tabular-nums text-subtle-foreground">
              {draft.length}/{MAX_LENGTH}
            </span>
            <Button type="submit" size="sm" isLoading={posting} disabled={!draft.trim()}>
              {t('newsComments.postComment')}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href={loginHref} className="font-semibold text-info hover:underline">
            {t('newsComments.signIn')}
          </Link>{' '}
          {t('newsComments.toJoinTheConversation')}
        </p>
      )}

      <ul className="mt-6 space-y-5">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            {c.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.author.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-sm font-semibold text-info">
                {c.author.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{c.author.name}</span>
                <span className="text-xs text-subtle-foreground">{formatNewsDate(c.createdAt, lang)}</span>
                {c.isMine && (
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="rounded p-1 text-subtle-foreground hover:bg-secondary hover:text-primary"
                      title={t('newsComments.editComment')}
                      aria-label={t('newsComments.editComment')}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(c.id)}
                      className="rounded p-1 text-subtle-foreground hover:bg-danger-soft hover:text-danger"
                      title={t('newsComments.deleteComment')}
                      aria-label={t('newsComments.deleteComment')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {editingId === c.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_LENGTH))}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-primary/30 bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs tabular-nums text-subtle-foreground">
                      {editDraft.length}/{MAX_LENGTH}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                      >
                        {t('newsComments.cancel')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveEdit(c.id)}
                        isLoading={savingEdit}
                        disabled={!editDraft.trim() || editDraft.trim() === c.content}
                      >
                        {t('newsComments.saveChanges')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Plain text only — never rendered as HTML. */
                <p
                  lang={newsTextLang(c.content)}
                  className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-secondary-foreground"
                >
                  {c.content}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!loading && comments.length === 0 && allowComments && (
        <p className="mt-2 text-sm text-subtle-foreground">
          {t('newsComments.noCommentsYet')}
        </p>
      )}
      {hasMore && (
        <div className="mt-6">
          <Button variant="outline" size="sm" isLoading={loading} onClick={() => load(page + 1)}>
            {t('newsComments.loadMoreComments')}
          </Button>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title={t('newsComments.deleteComment2')}
        description={t('newsComments.thisCannotBeUndone')}
        confirmText={t('newsComments.delete')}
        variant="danger"
      />
    </section>
  );
}
