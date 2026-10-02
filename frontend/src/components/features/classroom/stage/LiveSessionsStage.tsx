'use client';

import Link from 'next/link';
import { CalendarClock, CheckCircle2, Radio, Video, XCircle } from 'lucide-react';
import type { ApiLearnerSession } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

const PLATFORM_LABEL: Record<string, string> = {
  LIVEKIT: 'Virtual classroom',
  ZOOM: 'Zoom',
  GOOGLE_MEET: 'Google Meet',
  MS_TEAMS: 'Microsoft Teams',
  CUSTOM: 'Online meeting',
};

/** The course's online sessions as a learner sees them: when, where and whether they attended. */
export function LiveSessionsStage({ sessions }: { sessions: ApiLearnerSession[] }) {
  const { tBilingual, isAmharic } = useTranslation();
  const fmt = (iso: string) => new Date(iso).toLocaleString(isAmharic ? 'am-ET' : undefined, { dateStyle: 'full', timeStyle: 'short' });

  const statusBadge = (s: ApiLearnerSession) => {
    if (s.status === 'TO_BE_SCHEDULED')
      return { label: tBilingual('To be scheduled', 'ገና ይታቀዳል'), tone: 'bg-slate-100 text-slate-600 border-slate-200', icon: CalendarClock };
    if (s.status === 'LIVE') return { label: tBilingual('Live now', 'አሁን በቀጥታ'), tone: 'bg-rose-50 text-rose-700 border-rose-200', icon: Radio };
    if (s.status === 'CANCELLED')
      return { label: tBilingual('Cancelled', 'ተሰርዟል'), tone: 'bg-slate-100 text-slate-500 border-slate-200', icon: XCircle };
    if (s.status === 'COMPLETED')
      return s.attended
        ? { label: tBilingual('Attended', 'ተገኝተዋል'), tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
        : { label: tBilingual('Missed', 'አልተገኙም'), tone: 'bg-amber-50 text-amber-800 border-amber-200', icon: XCircle };
    return { label: tBilingual('Upcoming', 'ይጠበቃል'), tone: 'bg-sky-50 text-sky-700 border-sky-200', icon: CalendarClock };
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tBilingual('Live Sessions', 'የቀጥታ ክፍለ-ጊዜዎች')}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {tBilingual(
              'Online sessions for this course. Attend them live; your certificate is issued after every session has been held.',
              'የዚህ ኮርስ የኦንላይን ክፍለ-ጊዜዎች። በቀጥታ ይሳተፉ፤ ሰርተፊኬትዎ የሚሰጠው ሁሉም ክፍለ-ጊዜዎች ከተካሄዱ በኋላ ነው።',
            )}
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {sessions.map((s, i) => {
          const badge = statusBadge(s);
          const Icon = badge.icon;
          const joinable = s.status === 'LIVE' || s.status === 'SCHEDULED';
          return (
            <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {tBilingual('Session', 'ክፍለ-ጊዜ')} {i + 1}
                  </p>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{s.titleEn}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {s.scheduledAt ? fmt(s.scheduledAt) : tBilingual('Date to be announced', 'ቀኑ ይገለጻል')}
                    {s.durationMinutes ? ` · ${s.durationMinutes} ${tBilingual('min', 'ደቂቃ')}` : ''}
                  </p>
                  {(s.platform || s.trainerName) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[s.platform ? (PLATFORM_LABEL[s.platform] ?? s.platform) : null, s.trainerName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', badge.tone)}>
                    <Icon className="h-3.5 w-3.5" />
                    {badge.label}
                  </span>
                  {joinable && (
                    <Link
                      href="/learner/live-sessions"
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                    >
                      {s.status === 'LIVE' ? tBilingual('Join now', 'አሁን ይቀላቀሉ') : tBilingual('View session', 'ክፍለ-ጊዜውን ይመልከቱ')}
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
