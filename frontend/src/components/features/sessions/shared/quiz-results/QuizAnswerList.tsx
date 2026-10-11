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
                ? 'border-border bg-muted/60'
                : right
                  ? 'border-success/30 bg-success-soft/50'
                  : 'border-danger/30 bg-danger-soft/50',
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">
                {missed ? (
                  <CircleSlash className="h-4 w-4 text-subtle-foreground" />
                ) : right ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-danger" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    <span className="mr-1 text-subtle-foreground">{i + 1}.</span>
                    <RichContent html={q.question} inline inheritText />
                  </p>
                  <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                    {right ? q.points : 0} / {q.points} pts
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-secondary-foreground">
                    Answered:{' '}
                    <strong className={cn(missed ? 'font-medium italic text-subtle-foreground' : right ? 'text-success' : 'text-danger')}>
                      {missed ? 'No answer' : a!.answer}
                    </strong>
                  </span>
                  {!right && q.correctAnswer && (
                    <span className="text-secondary-foreground">
                      Correct answer: <strong className="text-success">{q.correctAnswer}</strong>
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
          ? 'bg-secondary text-muted-foreground'
          : passed === false
            ? 'bg-danger-soft text-danger ring-1 ring-danger/20'
            : passed === true
              ? 'bg-success-soft text-success ring-1 ring-success/20'
              : 'bg-primary-soft text-primary ring-1 ring-ring/20',
      )}
    >
      {result.answered === 0 ? 'Not answered' : `${result.scorePercent}% · ${result.earnedPoints}/${result.totalPoints} pts`}
    </span>
  );
}
