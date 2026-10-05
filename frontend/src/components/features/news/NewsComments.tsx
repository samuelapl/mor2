'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { deleteOwnNewsComment, fetchNewsComments, postNewsComment } from '@/lib/api/news';
import type { ApiNewsComment } from '@/lib/api/types';
import { useLms } from '@/lib/lms-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatNewsDate, newsTextLang } from '@/lib/news';
import { toast } from '@/lib/toast';
import { useSignInPrompt } from './useSignInPrompt';

const MAX_LENGTH = 1000;
const PAGE_SIZE = 20;

export function NewsComments({ newsId, allowComments }: { newsId: string; allowComments: boolean }) {
  const { currentUser, ready } = useLms();
  const { tBilingual, lang } = useTranslation();
  const { loginHref } = useSignInPrompt();
  const [comments, setComments] = useState<ApiNewsComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      toast.error(err instanceof Error ? err.message : tBilingual('Could not post your comment', 'አስተያየትዎን መለጠፍ አልተቻለም'));
    } finally {
      setPosting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteOwnNewsComment(newsId, deletingId);
      setComments((prev) => prev.filter((c) => c.id !== deletingId));
      setTotal((n) => Math.max(0, n - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tBilingual('Could not delete the comment', 'አስተያየቱን መሰረዝ አልተቻለም'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
      <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
        {tBilingual('Comments', 'አስተያየቶች')}{' '}
        <span className="text-sm font-medium text-slate-400">({total})</span>
      </h2>

      {!allowComments ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <Lock className="h-4 w-4" />
          {tBilingual('Comments are closed for this news.', 'ለዚህ ዜና አስተያየት መስጠት ተዘግቷል።')}
        </p>
      ) : currentUser ? (
        <form onSubmit={submit} className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            placeholder={tBilingual('Write a comment…', 'አስተያየት ይጻፉ…')}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs tabular-nums text-slate-400">
              {draft.length}/{MAX_LENGTH}
            </span>
            <Button type="submit" size="sm" isLoading={posting} disabled={!draft.trim()}>
              {tBilingual('Post comment', 'አስተያየት ለጥፍ')}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          <Link href={loginHref} className="font-semibold text-sky-700 hover:underline dark:text-sky-400">
            {tBilingual('Sign in', 'ይግቡ')}
          </Link>{' '}
          {tBilingual('to join the conversation.', 'እና በውይይቱ ይሳተፉ።')}
        </p>
      )}

      <ul className="mt-6 space-y-5">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            {c.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.author.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                {c.author.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.author.name}</span>
                <span className="text-xs text-slate-400">{formatNewsDate(c.createdAt, lang)}</span>
                {c.isMine && (
                  <button
                    type="button"
                    onClick={() => setDeletingId(c.id)}
                    className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label={tBilingual('Delete comment', 'አስተያየት ሰርዝ')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {/* Plain text only — never rendered as HTML. */}
              <p
                lang={newsTextLang(c.content)}
                className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              >
                {c.content}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {!loading && comments.length === 0 && allowComments && (
        <p className="mt-2 text-sm text-slate-400">
          {tBilingual('No comments yet.', 'እስካሁን ምንም አስተያየት የለም።')}
        </p>
      )}
      {hasMore && (
        <div className="mt-6">
          <Button variant="outline" size="sm" isLoading={loading} onClick={() => load(page + 1)}>
            {tBilingual('Load more comments', 'ተጨማሪ አስተያየቶችን አሳይ')}
          </Button>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title={tBilingual('Delete comment?', 'አስተያየቱ ይሰረዝ?')}
        description={tBilingual('This cannot be undone.', 'ይህ ሊቀለበስ አይችልም።')}
        confirmText={tBilingual('Delete', 'ሰርዝ')}
        variant="danger"
      />
    </section>
  );
}
