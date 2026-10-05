'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { reactToNews } from '@/lib/api/news';
import type { NewsReactionType } from '@/lib/api/types';
import { useLms } from '@/lib/lms-store';
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
  const { currentUser } = useLms();
  const { tBilingual } = useTranslation();
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
      prompt({ en: 'Sign in to react to news', am: 'ለዜናው ምላሽ ለመስጠት ይግቡ' });
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
      toast.error(err instanceof Error ? err.message : tBilingual('Could not save your reaction', 'ምላሽዎን ማስቀመጥ አልተቻለም'));
    } finally {
      setPending(false);
    }
  };

  const buttonClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-60',
      active
        ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
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
        <span>{tBilingual('Like', 'ወደድኩት')}</span>
        <span className="tabular-nums">{state.likeCount}</span>
      </button>
      <button
        type="button"
        onClick={() => react('DISLIKE')}
        disabled={pending}
        aria-pressed={state.myReaction === 'DISLIKE'}
        aria-label={tBilingual('Dislike', 'አልወደድኩትም')}
        title={tBilingual('Dislike', 'አልወደድኩትም')}
        className={buttonClass(state.myReaction === 'DISLIKE')}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
