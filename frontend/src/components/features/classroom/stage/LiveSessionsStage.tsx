'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Globe,
  Info,
  Loader2,
  MapPin,
  Radio,
  User,
  Video,
  XCircle,
} from 'lucide-react';
import { APP_TIME_ZONE, APP_TIME_ZONE_LABEL } from '@/lib/app-time';
import { StartsInBadge } from '@/components/features/sessions/shared/StartsInBadge';
import type { ApiLearnerSession } from '@/lib/api/types';
import { fetchLiveSession, fetchSessionJoinUrl } from '@/lib/api/monitoring';
import { LiveSessionWorkspace } from '@/components/features/sessions/virtual/LiveSessionWorkspace';
import { LearnerCheckInModal } from '@/components/features/sessions/in-person/LearnerCheckInModal';
import { VenueDetailModal } from '@/components/features/sessions/in-person/VenueDetailModal';
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
  const { isAmharic, t } = useTranslation('classroom');
  const [selectedSession, setSelectedSession] = useState<ApiLearnerSession | null>(null);
  const [activeVirtualSession, setActiveVirtualSession] = useState<any | null>(null);
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const [inspectVenueSession, setInspectVenueSession] = useState<ApiLearnerSession | null>(null);
  const [checkInSession, setCheckInSession] = useState<ApiLearnerSession | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);

  // Platform time (EAT), whatever the browser's time zone.
  const fmt = (iso: string) =>
    `${new Date(iso).toLocaleString(isAmharic ? 'am-ET' : 'en-US', {
      timeZone: APP_TIME_ZONE,
      dateStyle: 'full',
      timeStyle: 'short',
    })} ${APP_TIME_ZONE_LABEL}`;

  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  const isPersonSession = (s: ApiLearnerSession) =>
    s.sessionType === 'IN_PERSON' ||
    Boolean(s.venueId) ||
    Boolean(s.venue) ||
    s.platform === 'IN_PERSON' ||
    (s.titleEn || '').toLowerCase().includes('in_person') ||
    (s.titleEn || '').toLowerCase().includes('classroom');

  const anyInPerson = sessions.some(isPersonSession);

  const isTimeReached = (s: ApiLearnerSession) => {
    if (s.status === 'LIVE') return true;
    if (!s.scheduledAt) return false;
    return Date.now() >= new Date(s.scheduledAt).getTime() - FIVE_MINUTES_MS;
  };

  const handleJoinSession = async (s: ApiLearnerSession) => {
    const sessionId = s.sessionId || s.id;
    if (!isTimeReached(s)) {
      toast.warning(
        t('liveSessionsStage.youCanJoin5MinutesBefore'),
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
          t('liveSessionsStage.failedToConnectToTheSession'),
      );
    } finally {
      setJoiningSessionId(null);
    }
  };

  const statusBadge = (s: ApiLearnerSession) => {
    if (s.status === 'TO_BE_SCHEDULED')
      return { label: t('liveSessionsStage.toBeScheduled'), tone: 'bg-secondary text-secondary-foreground border-border', icon: CalendarClock };
    if (s.status === 'LIVE') return { label: t('liveSessionsStage.liveNow'), tone: 'bg-danger-soft text-danger border-danger/30', icon: Radio };
    if (s.status === 'CANCELLED')
      return { label: t('liveSessionsStage.cancelled'), tone: 'bg-secondary text-muted-foreground border-border', icon: XCircle };
    if (s.status === 'COMPLETED')
      return s.attended
        ? { label: t('liveSessionsStage.attended'), tone: 'bg-success-soft text-success border-success/30', icon: CheckCircle2 }
        : { label: t('liveSessionsStage.missed'), tone: 'bg-warning-soft text-warning border-warning/30', icon: XCircle };
    return { label: t('courseGradeSummary.upcoming'), tone: 'bg-info-soft text-info border-info/30', icon: CalendarClock };
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            anyInPerson ? 'bg-warning-soft text-warning' : 'bg-info-soft text-info',
          )}
        >
          {anyInPerson ? <Building2 className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {anyInPerson ? 'Classroom Sessions' : t('classroomSidebar.liveSessions')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {anyInPerson
              ? 'In-person classroom sessions for this course. Attend them at your assigned branch venue; your certificate is issued once you have attended every session and satisfied course requirements.'
              : t('liveSessionsStage.onlineSessionsForThisCourseAttend')}
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {sessions.map((s, i) => {
          const badge = statusBadge(s);
          const Icon = badge.icon;
          const isPerson = isPersonSession(s);
          const isCheckedIn = s.attended || checkedInIds.includes(s.sessionId || s.id);

          return (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
              {(s.missedRounds ?? []).length > 0 && (
                <ul className="mb-3 space-y-1.5 border-b border-border/60 pb-3">
                  {s.missedRounds!.map((r) => (
                    <li key={r.sessionId} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground line-through decoration-danger/60">
                        {fmt(r.scheduledAt)}
                        {r.durationMinutes ? ` · ${r.durationMinutes} ${t('liveSessionsStage.min')}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                        <XCircle className="h-3.5 w-3.5" />
                        {t('liveSessionsStage.notAttended')}
                      </span>
                    </li>
                  ))}
                  {s.status !== 'COMPLETED' && (
                    <li className="text-xs font-medium text-info">{t('liveSessionsStage.attendTheNextSession')}</li>
                  )}
                </ul>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                    {t('liveSessionsStage.session')} {i + 1}
                  </p>
                  <h3 className="font-semibold text-foreground">{s.titleEn}</h3>
                  <p className="mt-1 text-sm text-secondary-foreground">
                    {s.scheduledAt ? fmt(s.scheduledAt) : t('liveSessionsStage.dateToBeAnnounced')}
                    {s.durationMinutes ? ` · ${s.durationMinutes} ${t('liveSessionsStage.min')}` : ''}
                  </p>
                  <StartsInBadge seconds={s.startsInSeconds} className="mt-1" />
                  {s.venue && (
                    <div className="flex items-center gap-1.5 text-xs text-secondary-foreground font-medium mt-1">
                      <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>
                        {s.venue.branch} · {s.venue.name}
                        {s.venue.building ? ` (${s.venue.building})` : ''}
                      </span>
                    </div>
                  )}
                  {(s.platform || s.trainerName) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[s.platform ? (PLATFORM_LABEL[s.platform] ?? s.platform) : null, s.trainerName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5">
                    {isCheckedIn && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Checked In
                      </span>
                    )}
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', badge.tone)}>
                      <Icon className="h-3.5 w-3.5" />
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSession(s)}
                      className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary hover:text-primary"
                    >
                      {t('liveSessionsStage.viewSession')}
                    </button>
                    {isPerson && s.venue && (
                      <button
                        type="button"
                        onClick={() => setInspectVenueSession(s)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground transition hover:bg-muted hover:text-foreground flex items-center gap-1.5 shadow-2xs"
                        title="View classroom venue location & directions"
                      >
                        <MapPin className="h-3.5 w-3.5 text-amber-500" />
                        Venue
                      </button>
                    )}
                    {isPerson ? (
                      <button
                        type="button"
                        onClick={() => setCheckInSession(s)}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 active:bg-amber-800 shadow-xs flex items-center gap-1.5"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        {isCheckedIn ? 'Checked In' : 'Classroom Check-In'}
                      </button>
                    ) : s.status === 'LIVE' ? (
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
                        {t('liveSessionsStage.joinNow')}
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
                            : 'bg-secondary text-muted-foreground border border-border hover:bg-input/60',
                        )}
                      >
                        {joiningSessionId === (s.sessionId || s.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Video className="h-3.5 w-3.5" />
                        )}
                        {isTimeReached(s)
                          ? t('liveSessionsStage.join')
                          : t('liveSessionsStage.timeNotReached')}
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
          subtitle={
            isPersonSession(selectedSession)
              ? 'In-person classroom session schedule and venue details'
              : t('liveSessionsStage.onlineScheduledSessionDetails')
          }
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSession(null)}
              >
                {t('liveSessionsStage.close')}
              </Button>
              {isPersonSession(selectedSession) ? (
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedSession;
                    setSelectedSession(null);
                    setCheckInSession(s);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow transition"
                >
                  <Building2 className="h-4 w-4" />
                  {selectedSession.attended || checkedInIds.includes(selectedSession.sessionId || selectedSession.id)
                    ? 'Checked In'
                    : 'Classroom Check-In'}
                </button>
              ) : selectedSession.status === 'LIVE' ? (
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
                  {t('liveSessionsStage.joinMeetingNow')}
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
                      : 'bg-border text-secondary-foreground border border-input hover:bg-input',
                  )}
                >
                  {joiningSessionId === (selectedSession.sessionId || selectedSession.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {isTimeReached(selectedSession)
                    ? t('liveSessionsStage.goToVirtualRoom')
                    : t('liveSessionsStage.timeNotReached2')}
                </button>
              ) : null}
            </div>
          }
        >
          <div className="space-y-4 py-2 text-sm text-secondary-foreground">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border/80">
              <span className="text-xs font-medium text-muted-foreground">{t('liveSessionsStage.sessionStatus')}</span>
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

            {!isTimeReached(selectedSession) && !isPersonSession(selectedSession) && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-warning-soft border border-warning/30 text-warning text-xs font-medium">
                <Clock className="h-4 w-4 shrink-0 text-warning" />
                <span>
                  {t('liveSessionsStage.theScheduledTimeHasNotBeen')}
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-xl border border-border/60 bg-muted/50">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {t('liveSessionsStage.scheduledTime')}
                </span>
                <p className="mt-1 font-semibold text-foreground text-xs">
                  {selectedSession.scheduledAt ? fmt(selectedSession.scheduledAt) : t('liveSessionsStage.toBeAnnounced')}
                </p>
                <StartsInBadge seconds={selectedSession.startsInSeconds} className="mt-1" />
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-muted/50">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t('liveSessionsStage.duration')}
                </span>
                <p className="mt-1 font-semibold text-foreground text-xs">
                  {selectedSession.durationMinutes ? `${selectedSession.durationMinutes} ${t('liveSessionsStage.minutes')}` : t('liveSessionsStage.standardLesson')}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-muted/50">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  {isPersonSession(selectedSession) ? <Building2 className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {isPersonSession(selectedSession) ? 'Delivery Mode' : t('liveSessionsStage.platform')}
                </span>
                <p className="mt-1 font-semibold text-foreground text-xs">
                  {isPersonSession(selectedSession)
                    ? 'In-Person Physical Classroom'
                    : selectedSession.platform
                      ? (PLATFORM_LABEL[selectedSession.platform] ?? selectedSession.platform)
                      : t('liveSessionsStage.virtualClassroom')}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-muted/50">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  <User className="h-3.5 w-3.5" />
                  {t('liveSessionsStage.trainer')}
                </span>
                <p className="mt-1 font-semibold text-foreground text-xs">
                  {selectedSession.trainerName || t('liveSessionsStage.assignedCourseTrainer')}
                </p>
              </div>

              {selectedSession.venue && (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/50 sm:col-span-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    Classroom Venue Location
                  </span>
                  <p className="mt-1 font-semibold text-foreground text-xs">
                    {selectedSession.venue.branch} · {selectedSession.venue.name}
                    {selectedSession.venue.building ? ` (${selectedSession.venue.building})` : ''}
                  </p>
                  {selectedSession.venue.facilities && selectedSession.venue.facilities.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Facilities: {selectedSession.venue.facilities.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-warning-soft border border-warning/30 text-xs text-warning">
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 shrink-0 text-warning" />
                {t('liveSessionsStage.certificateRequirementPolicy')}
              </p>
              <p className="mt-1 leading-relaxed text-warning">
                {t('liveSessionsStage.learnersAreRequiredToAttendAll')}
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

      {checkInSession && (
        <LearnerCheckInModal
          open={Boolean(checkInSession)}
          onClose={() => setCheckInSession(null)}
          session={
            {
              ...checkInSession,
              id: checkInSession.sessionId || checkInSession.id,
              venue: checkInSession.venue ?? undefined,
            } as any
          }
          onSuccess={() => {
            if (checkInSession) {
              const sid = checkInSession.sessionId || checkInSession.id;
              setCheckedInIds((prev) => (prev.includes(sid) ? prev : [...prev, sid]));
              toast.success('Successfully checked in to classroom session!');
            }
          }}
        />
      )}

      {inspectVenueSession && inspectVenueSession.venue && (
        <VenueDetailModal
          open={Boolean(inspectVenueSession)}
          onClose={() => setInspectVenueSession(null)}
          venue={inspectVenueSession.venue}
          session={
            {
              ...inspectVenueSession,
              id: inspectVenueSession.sessionId || inspectVenueSession.id,
              venue: inspectVenueSession.venue ?? undefined,
            } as any
          }
          courseTitle={inspectVenueSession.titleEn}
        />
      )}
    </div>
  );
}
