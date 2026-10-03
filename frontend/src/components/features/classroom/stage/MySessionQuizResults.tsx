'use client';

import { useState } from 'react';
import { ChevronDown, ClipboardCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { fetchMySessionQuizResults, type ApiSessionQuizResults } from '@/lib/api/monitoring';
import { QuizAnswerList, QuizScoreBadge } from '@/components/features/sessions/shared/quiz-results/QuizAnswerList';

/** A learner's own answers and score for a completed session's live quizzes, loaded on first open. */
export function MySessionQuizResults({ sessionId }: { sessionId: string }) {
  const { tBilingual } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<(ApiSessionQuizResults & { available: boolean }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || data || loading) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMySessionQuizResults(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your quiz results');
    } finally {
      setLoading(false);
    }
  };

  const me = data?.learners[0];

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-indigo-700 dark:text-indigo-400"
      >
        <span className="inline-flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4" />
          {tBilingual('View my quiz results', 'የፈተና ውጤቴን ይመልከቱ')}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : !data?.available || !me || data.quizzes.length === 0 ? (
            <p className="text-sm text-slate-500">
              {tBilingual('No quiz was run in this session.', 'በዚህ ክፍለ-ጊዜ ፈተና አልተካሄደም።')}
            </p>
          ) : (
            data.quizzes.map((quiz) => {
              const result = me.quizzes.find((r) => r.quizId === quiz.id)!;
              return (
                <div key={quiz.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{quiz.title}</h4>
                    <QuizScoreBadge quiz={quiz} result={result} />
                    {quiz.graded && (
                      <span className="text-[11px] text-slate-500">
                        {quiz.weight}% {tBilingual('of the course grade', 'ከኮርሱ ውጤት')} · {tBilingual('pass', 'ማለፊያ')}{' '}
                        {quiz.passingScore}%
                      </span>
                    )}
                  </div>
                  {result.answered === 0 ? (
                    <p className="text-xs text-slate-500">
                      {quiz.graded
                        ? tBilingual("You didn't answer this quiz, so it counts as 0.", 'ይህን ፈተና ስላልመለሱ 0 ይቆጠራል።')
                        : tBilingual("You didn't answer this quiz.", 'ይህን ፈተና አልመለሱም።')}
                    </p>
                  ) : (
                    <QuizAnswerList quiz={quiz} result={result} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
