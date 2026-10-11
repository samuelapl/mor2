'use client';

import { useState } from 'react';
import { ChevronDown, ClipboardCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { fetchMySessionQuizResults, type ApiSessionQuizResults } from '@/lib/api/monitoring';
import { QuizAnswerList, QuizScoreBadge } from '@/components/features/sessions/shared/quiz-results/QuizAnswerList';

/** A learner's own answers and score for a completed session's live quizzes, loaded on first open. */
export function MySessionQuizResults({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('classroom');
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
    <div className="mt-3 border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-primary"
      >
        <span className="inline-flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4" />
          {t('mySessionQuizResults.viewMyQuizResults')}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : !data?.available || !me || data.quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('mySessionQuizResults.noQuizWasRunInThis')}
            </p>
          ) : (
            data.quizzes.map((quiz) => {
              const result = me.quizzes.find((r) => r.quizId === quiz.id)!;
              return (
                <div key={quiz.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">{quiz.title}</h4>
                    <QuizScoreBadge quiz={quiz} result={result} />
                    {quiz.graded && (
                      <span className="text-[11px] text-muted-foreground">
                        {quiz.weight}% {t('mySessionQuizResults.ofTheCourseGrade')} · {t('mySessionQuizResults.pass')}{' '}
                        {quiz.passingScore}%
                      </span>
                    )}
                  </div>
                  {result.answered === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {quiz.graded
                        ? t('mySessionQuizResults.youDidnTAnswerThisQuiz')
                        : t('mySessionQuizResults.youDidnTAnswerThisQuiz2')}
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
