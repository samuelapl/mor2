'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { reactToNews } from '@/lib/api/news';
import type { NewsReactionType } from '@/lib/api/types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useSignInPrompt } from './useSignInPrompt';

interface NewsReactionsProps {
  newsId: string;
  likeCount: number;
  myReaction: NewsReactionType | null;
}

/** Like / dislike. Only the like count is public; dislikes are feedback for the publishers. */
export function NewsReactions({ newsId, likeCount, myReaction }: NewsReactionsProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { t } = useTranslation('news');
  const { prompt } = useSignInPrompt();
  // Optimistic local copy; re-synced from props when the parent refetches with the user's token.
  const [state, setState] = useState({ likeCount, myReaction });
  const [synced, setSynced] = useState({ likeCount, myReaction });
  if (synced.likeCount !== likeCount || synced.myReaction !== myReaction) {
    setSynced({ likeCount, myReaction });
    setState({ likeCount, myReaction });
  }
  const [pending, setPending] = useState(false);

  const react = async (type: NewsReactionType) => {
    if (!currentUser) {
      prompt('newsReactions.signInToReactToNews');
      return;
    }
    if (pending) return;

    const previous = state;
    const removing = state.myReaction === type;
    const nextReaction = removing ? null : type;
    const likeDelta =
      (nextReaction === 'LIKE' ? 1 : 0) - (state.myReaction === 'LIKE' ? 1 : 0);
    setState({ likeCount: state.likeCount + likeDelta, myReaction: nextReaction });

    setPending(true);
    try {
      setState(await reactToNews(newsId, type));
    } catch (err) {
      setState(previous);
      toast.error(err instanceof Error ? err.message : t('newsReactions.couldNotSaveYourReaction'));
    } finally {
      setPending(false);
    }
  };

  const buttonClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-60',
      active
        ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
        : 'border-border bg-card text-secondary-foreground hover:border-info/30 hover:text-info',
    );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => react('LIKE')}
        disabled={pending}
        aria-pressed={state.myReaction === 'LIKE'}
        className={buttonClass(state.myReaction === 'LIKE')}
      >
        <ThumbsUp className="h-4 w-4" />
        <span>{t('newsReactions.like')}</span>
        <span className="tabular-nums">{state.likeCount}</span>
      </button>
      <button
        type="button"
        onClick={() => react('DISLIKE')}
        disabled={pending}
        aria-pressed={state.myReaction === 'DISLIKE'}
        aria-label={t('newsReactions.dislike')}
        title={t('newsReactions.dislike')}
        className={buttonClass(state.myReaction === 'DISLIKE')}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
