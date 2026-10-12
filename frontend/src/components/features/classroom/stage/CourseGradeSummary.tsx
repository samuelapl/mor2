'use client';

import { AlertTriangle, CheckCircle2, LifeBuoy, RotateCcw, Video, XCircle } from 'lucide-react';
import type { ApiCourseCompletion } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

/**
 * Course grade vs. the certificate requirement, with a per-assessment breakdown, so a
 * learner can see exactly why the certificate is (or is not) unlocked. Live session quizzes
 * are formative: listed apart with their score, outside the grade.
 */
export function CourseGradeSummary({ completion }: { completion: ApiCourseCompletion }) {
  const { t } = useTranslation('classroom');
  const all = completion.assessmentBreakdown ?? [];
  const breakdown = all.filter((a) => a.type !== 'SESSION_ASSESSMENT');
  const sessionQuizzes = all.filter((a) => a.type === 'SESSION_ASSESSMENT');
  if (all.length === 0) return null;

  const grade = completion.totalCourseGrade ?? 0;
  const required = completion.passingScorePercent ?? 0;
  const gradeShort = completion.gradeSatisfied === false;
  // Finished everything they were asked to and still short: the only case where the
  // learner is truly blocked, so tell them what to do next.
  const blockedByGrade = completion.contentCompleted && completion.allAssessmentsPassed !== false && gradeShort;
  const canRetakeSomething = breakdown.some((a) => a.retakeAvailable);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-left shadow-2xs">
      {blockedByGrade && (
        <div className="flex gap-3 rounded-xl border border-danger/30 bg-danger-soft/80 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="space-y-1 text-sm">
            <p className="font-bold text-danger">
              {t('courseGradeSummary.youDidNotReachTheRequired', { grade, required })}
            </p>
            <p className="flex items-center gap-1.5 text-danger">
              {canRetakeSomething ? <RotateCcw className="h-3.5 w-3.5" /> : <LifeBuoy className="h-3.5 w-3.5" />}
              {canRetakeSomething
                ? t('courseGradeSummary.retakeAnAssessmentToImproveYour')
                : t('courseGradeSummary.noRetakesAreLeftPleaseContact')}
            </p>
          </div>
        </div>
      )}

      {breakdown.length > 0 && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-secondary-foreground">{t('courseGradeSummary.courseGrade')}</span>
              <span className={cn('font-mono', gradeShort ? 'text-danger' : 'text-success')}>
                {grade}% / {t('courseGradeSummary.required', { required })}
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full transition-all duration-500', gradeShort ? 'bg-rose-500' : 'bg-emerald-500')}
                style={{ width: `${Math.min(100, grade)}%` }}
              />
              <div className="absolute top-0 h-full w-0.5 bg-secondary-foreground" style={{ left: `${Math.min(100, required)}%` }} title={`${required}%`} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-subtle-foreground">
                  <th className="py-2 pr-3 font-semibold">{t('courseGradeSummary.assessment')}</th>
                  <th className="py-2 pr-3 text-right font-semibold">{t('courseGradeSummary.best')}</th>
                  <th className="py-2 pr-3 text-right font-semibold">{t('courseGradeSummary.passMark')}</th>
                  <th className="py-2 pr-3 text-right font-semibold">{t('courseGradeSummary.weight')}</th>
                  <th className="py-2 text-right font-semibold">{t('courseGradeSummary.points')}</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((a) => (
                  <tr key={a.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        {a.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className={cn('h-3.5 w-3.5 shrink-0', a.attempted ? 'text-rose-500' : 'text-subtle-foreground')} />
                        )}
                        {a.titleEn}
                        {!a.attempted && (
                          <span className="rounded bg-secondary px-1 text-[10px] font-semibold text-muted-foreground">
                            {t('courseGradeSummary.notTaken')}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{a.attempted ? `${a.bestScore ?? 0}%` : '—'}</td>
                    <td className="py-2 pr-3 text-right font-mono">{a.passingScore}%</td>
                    <td className="py-2 pr-3 text-right font-mono">{a.weight ?? 0}%</td>
                    <td className="py-2 text-right font-mono font-semibold">{a.earnedPoints ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sessionQuizzes.length > 0 && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            <Video className="h-3.5 w-3.5" />
            {t('courseGradeSummary.sessionQuizzes')}
          </p>
          <ul className="space-y-1 text-xs">
            {sessionQuizzes.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{a.titleEn}</span>
                <span className="font-mono text-muted-foreground">
                  {a.attempted ? `${a.bestScore ?? 0}%` : t('courseGradeSummary.noScoreYet')}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">{t('courseGradeSummary.sessionQuizzesNote')}</p>
        </div>
      )}
    </div>
  );
}
