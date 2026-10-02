'use client';

import { AlertTriangle, CheckCircle2, LifeBuoy, RotateCcw, XCircle } from 'lucide-react';
import type { ApiCourseCompletion } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

/**
 * Course grade vs. the certificate requirement, with a per-assessment breakdown, so a
 * learner can see exactly why the certificate is (or is not) unlocked.
 */
export function CourseGradeSummary({ completion }: { completion: ApiCourseCompletion }) {
  const { tBilingual } = useTranslation();
  const breakdown = completion.assessmentBreakdown ?? [];
  if (breakdown.length === 0) return null;

  const grade = completion.totalCourseGrade ?? 0;
  const required = completion.passingScorePercent ?? 0;
  const gradeShort = completion.gradeSatisfied === false;
  // Finished everything they were asked to and still short: the only case where the
  // learner is truly blocked, so tell them what to do next.
  // While a session quiz is still to come the grade is provisional, so don't call it a miss yet.
  const sessionsPending = completion.sessionsPending ?? 0;
  const blockedByGrade =
    sessionsPending === 0 && completion.contentCompleted && completion.allAssessmentsPassed !== false && gradeShort;
  const canRetakeSomething = breakdown.some((a) => a.retakeAvailable);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xs">
      {blockedByGrade && (
        <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="space-y-1 text-sm">
            <p className="font-bold text-rose-800">
              {tBilingual(
                `You did not reach the required course grade (${grade}% of ${required}%).`,
                `የሚያስፈልገውን የኮርስ ውጤት አላሟሉም (${grade}% ከ ${required}%)።`,
              )}
            </p>
            <p className="flex items-center gap-1.5 text-rose-700">
              {canRetakeSomething ? <RotateCcw className="h-3.5 w-3.5" /> : <LifeBuoy className="h-3.5 w-3.5" />}
              {canRetakeSomething
                ? tBilingual('Retake an assessment to improve your score, or contact support.', 'ውጤትዎን ለማሻሻል ምዘናውን እንደገና ይውሰዱ ወይም ድጋፍ ያግኙ።')
                : tBilingual('No retakes are left. Please contact support.', 'የቀረ ሙከራ የለም። እባክዎ ድጋፍ ያግኙ።')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-700">{tBilingual('Course grade', 'የኮርስ ውጤት')}</span>
          <span className={cn('font-mono', gradeShort ? 'text-rose-600' : 'text-emerald-600')}>
            {grade}% / {tBilingual(`${required}% required`, `${required}% ያስፈልጋል`)}
          </span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all duration-500', gradeShort ? 'bg-rose-500' : 'bg-emerald-500')}
            style={{ width: `${Math.min(100, grade)}%` }}
          />
          <div className="absolute top-0 h-full w-0.5 bg-slate-700" style={{ left: `${Math.min(100, required)}%` }} title={`${required}%`} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-3 font-semibold">{tBilingual('Assessment', 'ምዘና')}</th>
              <th className="py-2 pr-3 text-right font-semibold">{tBilingual('Best', 'ምርጥ')}</th>
              <th className="py-2 pr-3 text-right font-semibold">{tBilingual('Pass mark', 'ማለፊያ')}</th>
              <th className="py-2 pr-3 text-right font-semibold">{tBilingual('Weight', 'ክብደት')}</th>
              <th className="py-2 text-right font-semibold">{tBilingual('Points', 'ነጥብ')}</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-1.5 font-medium text-slate-800">
                    {a.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className={cn('h-3.5 w-3.5 shrink-0', a.attempted ? 'text-rose-500' : 'text-slate-300')} />
                    )}
                    {a.titleEn}
                    {a.type === 'SESSION_ASSESSMENT' && (
                      <span className="rounded bg-sky-100 px-1 text-[10px] font-semibold text-sky-700">{tBilingual('Live session', 'የቀጥታ ክፍለ-ጊዜ')}</span>
                    )}
                    {!a.attempted && (
                      <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">
                        {a.type === 'SESSION_ASSESSMENT' ? tBilingual('Upcoming', 'ይጠበቃል') : tBilingual('Not taken', 'አልተወሰደም')}
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
    </div>
  );
}
