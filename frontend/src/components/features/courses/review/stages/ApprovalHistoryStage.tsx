'use client';

import { CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import { StageCard, StageTitle } from './StageParts';

const STATUS_STYLE = {
  APPROVED: { icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50 border-emerald-200', en: 'Approved', am: 'ጸድቋል' },
  REJECTED: { icon: XCircle, tone: 'text-rose-600 bg-rose-50 border-rose-200', en: 'Rejected', am: 'ውድቅ ተደርጓል' },
  NEEDS_REVISION: { icon: XCircle, tone: 'text-amber-700 bg-amber-50 border-amber-200', en: 'Needs revision', am: 'ማሻሻያ ያስፈልገዋል' },
  PENDING: { icon: Clock, tone: 'text-amber-600 bg-amber-50 border-amber-200', en: 'Pending', am: 'በመጠባበቅ ላይ' },
} as const;

/** Reviewer decisions over the life of the course, newest first. */
export function ApprovalHistoryStage({ course }: { course: Course }) {
  const { tBilingual, isAmharic } = useTranslation();
  const entries = course.approvals ?? [];
  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString(isAmharic ? 'am-ET' : undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <div className="space-y-6">
      <StageTitle
        icon={<History className="h-4 w-4" />}
        eyebrow={tBilingual('Approval history', 'የማጽደቅ ታሪክ')}
        title={tBilingual('Reviewer decisions', 'የገምጋሚ ውሳኔዎች')}
        meta={`${entries.length} ${tBilingual(entries.length === 1 ? 'decision' : 'decisions', 'ውሳኔዎች')}`}
      />

      <StageCard>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">
            {course.status === 'under_review'
              ? tBilingual('Submitted and waiting for its first review.', 'ቀርቧል፤ የመጀመሪያ ግምገማ በመጠባበቅ ላይ።')
              : tBilingual('This course has not been reviewed yet.', 'ይህ ኮርስ ገና አልተገመገመም።')}
          </p>
        ) : (
          <ol className="relative space-y-5 border-l border-slate-200 pl-6">
            {entries.map((entry) => {
              const style = STATUS_STYLE[entry.status] ?? STATUS_STYLE.PENDING;
              const Icon = style.icon;
              return (
                <li key={entry.id} className="relative">
                  <span className={cn('absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border bg-white', style.tone)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-md border px-1.5 py-0.5 text-[11px] font-bold', style.tone)}>{tBilingual(style.en, style.am)}</span>
                    <span className="text-sm font-semibold text-slate-800">{entry.reviewerName ?? tBilingual('Reviewer', 'ገምጋሚ')}</span>
                    <span className="text-xs text-slate-400">{formatDate(entry.decidedAt ?? entry.createdAt)}</span>
                  </div>
                  {entry.comments ? (
                    <div
                      className="prose prose-sm mt-2 max-w-none rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-700"
                      dangerouslySetInnerHTML={{ __html: entry.comments }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </StageCard>
    </div>
  );
}
