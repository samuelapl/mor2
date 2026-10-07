'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Globe,
  Info,
  Loader2,
  Radio,
  User,
  Video,
  XCircle,
} from 'lucide-react';
import type { ApiLearnerSession } from '@/lib/api/types';
import { fetchLiveSession, fetchSessionJoinUrl } from '@/lib/api/monitoring';
import { LiveSessionWorkspace } from '@/components/features/sessions/virtual/LiveSessionWorkspace';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { MySessionQuizResults } from './MySessionQuizResults';

const PLATFORM_LABEL: Record<string, string> = {
  LIVEKIT: 'Virtual classroom',
  ZOOM: 'Zoom',
  GOOGLE_MEET: 'Google Meet',
  MS_TEAMS: 'Microsoft Teams',
  CUSTOM: 'Online meeting',
};

/** The course's online sessions as a learner sees them: when, where and whether they attended. */
export function LiveSessionsStage({ sessions }: { sessions: ApiLearnerSession[] }) {
  const router = useRouter();
  const { tBilingual, isAmharic } = useTranslation();
  const [selectedSession, setSelectedSession] = useState<ApiLearnerSession | null>(null);
  const [activeVirtualSession, setActiveVirtualSession] = useState<any | null>(null);
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(isAmharic ? 'am-ET' : undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
    });

  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  const isTimeReached = (s: ApiLearnerSession) => {
    if (s.status === 'LIVE') return true;
    if (!s.scheduledAt) return false;
    return Date.now() >= new Date(s.scheduledAt).getTime() - FIVE_MINUTES_MS;
  };

  const handleJoinSession = async (s: ApiLearnerSession) => {
    const sessionId = s.sessionId || s.id;
    if (!isTimeReached(s)) {
      toast.warning(
        tBilingual(
          'You can join 5 minutes before the session starts.',
          'ክፍለ-ጊዜው ከመጀመሩ 5 ደቂቃ በፊት መቀላቀል ይችላሉ።',
        ),
      );
      return;
    }

    setJoiningSessionId(sessionId);
    try {
      // 1. Check if session has a custom external URL (Zoom, Meet, Teams, etc.)
      const joinData = await fetchSessionJoinUrl(sessionId).catch(() => null);
      if (
        joinData?.joinUrl &&
        (joinData.platform !== 'LIVEKIT' || joinData.joinUrl.startsWith('http'))
      ) {
        window.open(joinData.joinUrl, '_blank');
        return;
      }

      // 2. Fetch full session details to open the in-app virtual classroom room directly
      const fullSession = await fetchLiveSession(sessionId).catch(() => null);
      if (fullSession) {
        setActiveVirtualSession(fullSession);
        setSelectedSession(null);
        return;
      }

      // 3. Fallback: navigate directly to that specific session on the live-sessions page
      router.push(`/learner/live-sessions?sessionId=${sessionId}`);
    } catch (err: any) {
      toast.error(
        err?.message ||
          tBilingual('Failed to connect to the session.', 'ክፍለ-ጊዜውን መቀላቀል አልተቻለም።'),
      );
    } finally {
      setJoiningSessionId(null);
    }
  };

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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSession(s)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {tBilingual('View session', 'ክፍለ-ጊዜውን ይመልከቱ')}
                    </button>
                    {s.status === 'LIVE' ? (
                      <button
                        type="button"
                        onClick={() => handleJoinSession(s)}
                        disabled={joiningSessionId === (s.sessionId || s.id)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 shadow-xs animate-pulse flex items-center gap-1.5"
                      >
                        {joiningSessionId === (s.sessionId || s.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Radio className="h-3.5 w-3.5" />
                        )}
                        {tBilingual('Join now', 'አሁን ይቀላቀሉ')}
                      </button>
                    ) : s.status === 'SCHEDULED' ? (
                      <button
                        type="button"
                        onClick={() => handleJoinSession(s)}
                        disabled={joiningSessionId === (s.sessionId || s.id)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-semibold transition shadow-xs flex items-center gap-1.5',
                          isTimeReached(s)
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
                        )}
                      >
                        {joiningSessionId === (s.sessionId || s.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Video className="h-3.5 w-3.5" />
                        )}
                        {isTimeReached(s)
                          ? tBilingual('Join', 'ተቀላቀል')
                          : tBilingual('Time not reached', 'ሰዓቱ አልደረሰም')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              {s.status === 'COMPLETED' && s.sessionId && <MySessionQuizResults sessionId={s.sessionId} />}
            </li>
          );
        })}
      </ol>

      {selectedSession && (
        <Modal
          open={Boolean(selectedSession)}
          onClose={() => setSelectedSession(null)}
          title={selectedSession.titleEn}
          subtitle={tBilingual('Online Scheduled Session Details', 'የቀጥታ ክፍለ-ጊዜ ዝርዝር መረጃ')}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSession(null)}
              >
                {tBilingual('Close', 'ዝጋ')}
              </Button>
              {selectedSession.status === 'LIVE' ? (
                <button
                  type="button"
                  onClick={() => handleJoinSession(selectedSession)}
                  disabled={joiningSessionId === (selectedSession.sessionId || selectedSession.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow transition"
                >
                  {joiningSessionId === (selectedSession.sessionId || selectedSession.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Radio className="h-4 w-4" />
                  )}
                  {tBilingual('Join Meeting Now', 'አሁን ስብሰባውን ይቀላቀሉ')}
                </button>
              ) : selectedSession.status === 'SCHEDULED' ? (
                <button
                  type="button"
                  onClick={() => handleJoinSession(selectedSession)}
                  disabled={joiningSessionId === (selectedSession.sessionId || selectedSession.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow transition',
                    isTimeReached(selectedSession)
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  {joiningSessionId === (selectedSession.sessionId || selectedSession.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {isTimeReached(selectedSession)
                    ? tBilingual('Go to Virtual Room', 'ወደ ስብሰባ ክፍል ይሂዱ')
                    : tBilingual('Time Not Reached', 'ሰዓቱ አልደረሰም')}
                </button>
              ) : null}
            </div>
          }
        >
          <div className="space-y-4 py-2 text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-500">{tBilingual('Session Status', 'የክፍለ-ጊዜ ሁኔታ')}</span>
              {(() => {
                const b = statusBadge(selectedSession);
                const Icon = b.icon;
                return (
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', b.tone)}>
                    <Icon className="h-3.5 w-3.5" />
                    {b.label}
                  </span>
                );
              })()}
            </div>

            {!isTimeReached(selectedSession) && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium">
                <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {tBilingual(
                    'The scheduled time has not been reached yet. You can join 5 minutes before the session starts.',
                    'የተያዘው ሰዓት ገና አልደረሰም። ክፍለ-ጊዜው ከመጀመሩ 5 ደቂቃ በፊት መቀላቀል ይችላሉ።',
                  )}
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {tBilingual('Scheduled Time', 'የተያዘበት ሰዓት')}
                </span>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white text-xs">
                  {selectedSession.scheduledAt ? fmt(selectedSession.scheduledAt) : tBilingual('To be announced', 'ቀኑ ይገለጻል')}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {tBilingual('Duration', 'የሚፈጀው ጊዜ')}
                </span>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white text-xs">
                  {selectedSession.durationMinutes ? `${selectedSession.durationMinutes} ${tBilingual('minutes', 'ደቂቃዎች')}` : tBilingual('Standard lesson', 'መደበኛ ክፍለ-ጊዜ')}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Globe className="h-3.5 w-3.5" />
                  {tBilingual('Platform', 'የስብሰባ ዘዴ')}
                </span>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white text-xs">
                  {selectedSession.platform ? (PLATFORM_LABEL[selectedSession.platform] ?? selectedSession.platform) : tBilingual('Virtual Classroom', 'የኦንላይን ክፍል')}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <User className="h-3.5 w-3.5" />
                  {tBilingual('Trainer', 'አሰልጣኝ')}
                </span>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white text-xs">
                  {selectedSession.trainerName || tBilingual('Assigned Course Trainer', 'የተመደበው አሰልጣኝ')}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                {tBilingual('Certificate Requirement Policy', 'የሰርተፊኬት አሰጣጥ ደንብ')}
              </p>
              <p className="mt-1 leading-relaxed text-amber-700 dark:text-amber-400">
                {tBilingual(
                  'Learners are required to attend all scheduled live sessions. Session attendance is tracked and verified before course certificate issuance.',
                  'ተማሪዎች በሁሉም የጊዜ ሰሌዳ በተያዘላቸው የቀጥታ ክፍለ-ጊዜዎች መሳተፍ አለባቸው። ሰርተፊኬት ከመሰጠቱ በፊት የክፍለ-ጊዜ ተሳትፎ ይረጋገጣል።',
                )}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {activeVirtualSession && (
        <LiveSessionWorkspace
          open={Boolean(activeVirtualSession)}
          onClose={() => setActiveVirtualSession(null)}
          session={activeVirtualSession}
          courseTitle={activeVirtualSession.course?.title || activeVirtualSession.course?.titleEn || 'Course Training'}
          courseCode={activeVirtualSession.course?.code || 'TRAINING'}
          trainerName={
            activeVirtualSession.trainer
              ? `${activeVirtualSession.trainer.firstName} ${activeVirtualSession.trainer.lastName}`
              : selectedSession?.trainerName || undefined
          }
          userRole="learner"
        />
      )}
    </div>
  );
}
