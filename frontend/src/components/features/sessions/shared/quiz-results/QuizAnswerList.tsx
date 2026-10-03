'use client';

import { CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichContent } from '@/components/ui/RichContent';
import type { ApiLearnerQuizResult, ApiSessionQuizGroup } from '@/lib/api/monitoring';

interface QuizAnswerListProps {
  quiz: ApiSessionQuizGroup;
  result: ApiLearnerQuizResult;
}

/** Each question of a session quiz with the learner's answer, whether it was right, and the correct answer. */
export function QuizAnswerList({ quiz, result }: QuizAnswerListProps) {
  const answerOf = new Map(result.answers.map((a) => [a.questionId, a]));

  return (
    <ol className="space-y-2">
      {quiz.questions.map((q, i) => {
        const a = answerOf.get(q.id);
        const missed = !a || a.answer === null;
        const right = a?.isCorrect === true;
        return (
          <li
            key={q.id}
            className={cn(
              'rounded-xl border p-3',
              missed
                ? 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40'
                : right
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-900/10'
                  : 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-900/10',
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">
                {missed ? (
                  <CircleSlash className="h-4 w-4 text-slate-400" />
                ) : right ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                    <span className="mr-1 text-slate-400">{i + 1}.</span>
                    <RichContent html={q.question} inline inheritText />
                  </p>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                    {right ? q.points : 0} / {q.points} pts
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-600 dark:text-slate-300">
                    Answered:{' '}
                    <strong className={cn(missed ? 'font-medium italic text-slate-400' : right ? 'text-emerald-700' : 'text-rose-700')}>
                      {missed ? 'No answer' : a!.answer}
                    </strong>
                  </span>
                  {!right && q.correctAnswer && (
                    <span className="text-slate-600 dark:text-slate-300">
                      Correct answer: <strong className="text-emerald-700">{q.correctAnswer}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Score badge for one quiz: points earned and percent, plus pass/fail for graded quizzes. */
export function QuizScoreBadge({ quiz, result }: { quiz: ApiSessionQuizGroup; result: ApiLearnerQuizResult }) {
  const passed = quiz.graded && quiz.passingScore !== null ? result.scorePercent >= quiz.passingScore : null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        result.answered === 0
          ? 'bg-slate-100 text-slate-500'
          : passed === false
            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
            : passed === true
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
      )}
    >
      {result.answered === 0 ? 'Not answered' : `${result.scorePercent}% · ${result.earnedPoints}/${result.totalPoints} pts`}
    </span>
  );
}
