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
    <ol className="space-y-3">
      {quiz.questions.map((q, i) => {
        const a = answerOf.get(q.id);
        const missed = !a || a.answer === null;
        const right = a?.isCorrect === true;
        const hasOptions = Array.isArray(q.options) && q.options.length > 0;

        return (
          <li
            key={q.id}
            className={cn(
              'rounded-xl border p-3.5 space-y-2.5 transition',
              missed
                ? 'border-border bg-muted/40'
                : right
                  ? 'border-success/30 bg-success-soft/30'
                  : 'border-danger/30 bg-danger-soft/30',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span className="mt-0.5 shrink-0">
                  {missed ? (
                    <CircleSlash className="h-4 w-4 text-subtle-foreground" />
                  ) : right ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-danger" />
                  )}
                </span>
                <div className="text-sm font-semibold leading-snug text-foreground">
                  <span className="mr-1.5 text-subtle-foreground">{i + 1}.</span>
                  <RichContent html={q.question} inline inheritText />
                </div>
              </div>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold bg-muted text-secondary-foreground border border-border">
                {right ? q.points : 0} / {q.points} pts
              </span>
            </div>

            {hasOptions ? (
              <div className="ml-6 space-y-1.5 pt-0.5">
                {q.options.map((option, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isCorrect =
                    Boolean(q.correctAnswer) &&
                    String(q.correctAnswer).trim().toLowerCase() === String(option).trim().toLowerCase();
                  const isSelected = Boolean(
                    a?.selected?.some((s) => String(s).trim().toLowerCase() === String(option).trim().toLowerCase()) ||
                      (a?.answer && String(a.answer).trim().toLowerCase() === String(option).trim().toLowerCase())
                  );

                  return (
                    <div
                      key={optIdx}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition',
                        isSelected && isCorrect
                          ? 'border-success bg-success-soft font-semibold text-foreground ring-1 ring-success/30'
                          : isSelected && !isCorrect
                            ? 'border-danger bg-danger-soft font-semibold text-foreground ring-1 ring-danger/30'
                            : !isSelected && isCorrect
                              ? 'border-success/70 bg-success-soft/50 font-semibold text-foreground'
                              : 'border-border/60 bg-card/60 text-muted-foreground',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                            isSelected && isCorrect
                              ? 'bg-success text-success-foreground'
                              : isSelected && !isCorrect
                                ? 'bg-danger text-danger-foreground'
                                : !isSelected && isCorrect
                                  ? 'bg-success/20 text-success'
                                  : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {letter}
                        </span>
                        <span className="truncate">{option}</span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold">
                        {isSelected && isCorrect && (
                          <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-success">
                            <CheckCircle2 className="h-3 w-3" />
                            Your answer (Correct)
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="inline-flex items-center gap-1 rounded bg-danger/15 px-1.5 py-0.5 text-danger">
                            <XCircle className="h-3 w-3" />
                            Your answer
                          </span>
                        )}
                        {!isSelected && isCorrect && (
                          <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-success">
                            <CheckCircle2 className="h-3 w-3" />
                            Correct answer
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Score badge for one quiz: points earned and percent. Session quizzes have no pass mark. */
export function QuizScoreBadge({ result }: { result: ApiLearnerQuizResult }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        result.answered === 0 ? 'bg-secondary text-muted-foreground' : 'bg-primary-soft text-primary ring-1 ring-ring/20',
      )}
    >
      {result.answered === 0 ? 'Not answered' : `${result.scorePercent}% · ${result.earnedPoints}/${result.totalPoints} pts`}
    </span>
  );
}
