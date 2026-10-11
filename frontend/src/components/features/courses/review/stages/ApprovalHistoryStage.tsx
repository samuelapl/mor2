'use client';

import { CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import { StageCard, StageTitle } from './StageParts';

const STATUS_STYLE = {
  APPROVED: { icon: CheckCircle2, tone: 'text-success bg-success-soft border-success/30', labelKey: 'approvalHistoryStage.approved' },
  REJECTED: { icon: XCircle, tone: 'text-danger bg-danger-soft border-danger/30', labelKey: 'approvalHistoryStage.rejected' },
  NEEDS_REVISION: { icon: XCircle, tone: 'text-warning bg-warning-soft border-warning/30', labelKey: 'approvalHistoryStage.needsRevision' },
  PENDING: { icon: Clock, tone: 'text-warning bg-warning-soft border-warning/30', labelKey: 'sessionPlanStage.pending' },
} as const;

/** Reviewer decisions over the life of the course, newest first. */
export function ApprovalHistoryStage({ course }: { course: Course }) {
  const { isAmharic, t } = useTranslation('courses');
  const entries = course.approvals ?? [];
  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString(isAmharic ? 'am-ET' : undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <div className="space-y-6">
      <StageTitle
        icon={<History className="h-4 w-4" />}
        eyebrow={t('approvalHistoryStage.approvalHistory')}
        title={t('approvalHistoryStage.reviewerDecisions')}
        meta={`${entries.length} ${t(entries.length === 1 ? 'approvalHistoryStage.decisionUnit' : 'approvalHistoryStage.decisionsUnit')}`}
      />

      <StageCard>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {course.status === 'under_review'
              ? t('approvalHistoryStage.submittedAndWaitingForItsFirst')
              : t('approvalHistoryStage.thisCourseHasNotBeenReviewed')}
          </p>
        ) : (
          <ol className="relative space-y-5 border-l border-border pl-6">
            {entries.map((entry) => {
              const style = STATUS_STYLE[entry.status] ?? STATUS_STYLE.PENDING;
              const Icon = style.icon;
              return (
                <li key={entry.id} className="relative">
                  <span className={cn('absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border bg-card', style.tone)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-md border px-1.5 py-0.5 text-[11px] font-bold', style.tone)}>{t(style.labelKey)}</span>
                    <span className="text-sm font-semibold text-foreground">{entry.reviewerName ?? t('approvalHistoryStage.reviewer')}</span>
                    <span className="text-xs text-subtle-foreground">{formatDate(entry.decidedAt ?? entry.createdAt)}</span>
                  </div>
                  {entry.comments ? (
                    <div
                      className="prose prose-sm mt-2 max-w-none rounded-xl border border-border/60 bg-muted/70 p-3 text-sm text-secondary-foreground"
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
