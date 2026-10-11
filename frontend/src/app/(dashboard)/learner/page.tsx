'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  MapPin,
  PlayCircle,
  Video,
} from 'lucide-react';
import type { ApiLiveSession, ApiVenue } from '@/lib/api/types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useLocaleStore } from '@/lib/stores/locale-store';
import { useCourseStore } from '@/lib/stores/course-store';
import { useEnrollmentForCourse } from '@/lib/stores/enrollment-store';
import { useLiveSessionStore } from '@/lib/stores/live-session-store';
import { useCourseProgress } from '@/lib/api/useCourseProgress';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/charts';
import { LiveSessionWorkspace } from '@/components/features/sessions/virtual/LiveSessionWorkspace';
import { SessionDetailModal } from '@/components/features/sessions/shared/SessionDetailModal';
import { VenueDetailModal } from '@/components/features/sessions/in-person/VenueDetailModal';
import { isInPersonEnrollment, isInPersonSession } from '@/lib/session-mode';
import { formatSessionDate, formatSessionTime } from '@/lib/app-time';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LearnerDashboardPage() {
  const courses = useCourseStore((s) => s.courses);
  const lang = useLocaleStore((s) => s.lang);
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const currentUser = useAuthStore((s) => s.currentUser);
  const getEnrollmentForCourse = useEnrollmentForCourse();
  const me = currentUser?.id ?? '';
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress } = useCourseProgress(enrolled.map((c) => c.id));

  const upcomingSessions = useLiveSessionStore((s) => s.upcoming);
  const upcomingLoaded = useLiveSessionStore((s) => s.upcomingLoaded);
  const loadUpcoming = useLiveSessionStore((s) => s.loadUpcoming);
  const sessionsLoading = !upcomingLoaded;

  // Modals / Workspaces
  const [activeLiveSession, setActiveLiveSession] = useState<ApiLiveSession | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [venueModalData, setVenueModalData] = useState<{
    venue: ApiVenue;
    session?: ApiLiveSession;
    courseTitle?: string;
    courseCode?: string;
  } | null>(null);

  useEffect(() => {
    void loadUpcoming();
  }, [loadUpcoming]);

  const percentOf = (courseId: string) => progress[courseId]?.stats.overallPercent ?? 0;
  const completed = enrolled.filter((c) => percentOf(c.id) >= 100);
  const inProgress = enrolled.filter((c) => percentOf(c.id) > 0 && percentOf(c.id) < 100);
  const notStarted = enrolled.filter((c) => percentOf(c.id) === 0);

  const avgProgress =
    enrolled.length > 0
      ? Math.round(enrolled.reduce((sum, c) => sum + percentOf(c.id), 0) / enrolled.length)
      : 0;

  // Next course up to continue: prioritize active in-progress courses, else first not started
  const nextUp =
    inProgress.length > 0
      ? [...inProgress].sort((a, b) => percentOf(b.id) - percentOf(a.id))[0]
      : notStarted.length > 0
        ? notStarted[0]
        : (enrolled[0] ?? null);

  const nextUpPercent = nextUp ? percentOf(nextUp.id) : 0;

  // Compute counts for online vs in-person courses
  const { onlineCount, inPersonCount } = useMemo(() => {
    let on = 0;
    let inP = 0;
    for (const c of enrolled) {
      const enr = getEnrollmentForCourse(c.id);
      if (isInPersonEnrollment(c, enr)) inP++;
      else on++;
    }
    return { onlineCount: on, inPersonCount: inP };
  }, [enrolled, getEnrollmentForCourse]);

  return (
    <PageShell
      role="learner"
      // The greeting is the heading; "Learner Dashboard" is already clear from the menu.
      title={
        currentUser?.firstName || currentUser?.name
          ? t('learnerDashboardPage.welcomeBack', { value: currentUser.firstName || currentUser.name })
          : t('learnerDashboardPage.welcomeToYourLearningHub')
      }
      description={
        t('learnerDashboardPage.trackYourLearningJourneyResumeActive')
      }
    >
      {/* Hero Learning Section: Continue Learning + Progress summary.
          The progress card is the single place for course counts; with no
          enrollments the hero spans the full width and the zeros are hidden. */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Continue Learning Hero Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/20 ${
            nextUp ? 'lg:col-span-2' : 'lg:col-span-3'
          }`}
        >
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 top-0 h-40 w-40 rounded-full bg-violet-500/15 blur-2xl" />

          <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/30 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-sm">
                  <PlayCircle className="h-3.5 w-3.5 text-indigo-300" />
                  {nextUpPercent > 0 ? 'Continue Learning' : 'Start Learning'}
                </span>
                {nextUp && (
                  <span className="text-xs font-medium text-indigo-200">
                    {nextUpPercent}% completed
                  </span>
                )}
              </div>

              {nextUp ? (
                <div className="mt-4">
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white line-clamp-1">
                    {nextUp.title}
                  </h3>
                  <p className="mt-2 text-sm text-indigo-200/90 line-clamp-2 leading-relaxed">
                    {nextUp.description ||
                      'Pick up right where you left off and advance towards course completion.'}
                  </p>

                  <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between text-xs text-indigo-200/80">
                      <span>Curriculum Progression</span>
                      <span className="font-bold text-white">{nextUpPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-700"
                        style={{ width: `${Math.max(4, nextUpPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 py-4">
                  <h3 className="font-display text-lg font-bold text-white">
                    No active enrollments yet
                  </h3>
                  <p className="mt-1 text-xs text-indigo-200">
                    Explore available courses in the catalog and begin your professional training.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {nextUp ? (
                <Link href={`/learner/courses/${nextUp.id}/learn`}>
                  <Button
                    size="md"
                    className="bg-card text-primary font-semibold hover:bg-primary-soft shadow-md shadow-white/10"
                  >
                    <PlayCircle className="h-4 w-4 text-primary" />
                    {nextUpPercent > 0
                      ? t('learnerDashboardPage.resumeCourse')
                      : t('learnerDashboardPage.startCourse')}
                  </Button>
                </Link>
              ) : null}
              <Link href={nextUp ? '/learner/my-courses' : '/learner/catalog'}>
                <Button
                  variant="outline"
                  size="md"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {nextUp ? tCommon('myCourses') : t('learnerCatalogPage.availableCourses')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Learning Progress Ring & Distribution Card */}
        {nextUp ? (
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft">
          <div>
            <h4 className="font-display text-sm font-bold text-foreground">
              {tCommon('myCourses')} · {enrolled.length}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('learnerDashboardPage.onlineInPerson', { onlineCount, inPersonCount })}
            </p>

            <div className="mt-4 flex justify-center">
              <ProgressRing
                percentage={avgProgress}
                size={140}
                strokeWidth={12}
                subtitle="Avg Progress"
                color={avgProgress >= 80 ? '#10b981' : avgProgress >= 40 ? '#6366f1' : '#f59e0b'}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted p-3 text-center">
            <div>
              <p className="text-[11px] font-semibold text-success">Completed</p>
              <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                {completed.length}
              </p>
            </div>
            <div className="border-x border-border">
              <p className="text-[11px] font-semibold text-primary">In Progress</p>
              <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                {inProgress.length}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Not Started</p>
              <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                {notStarted.length}
              </p>
            </div>
          </div>
        </div>
        ) : null}
      </div>

      {/* Upcoming Scheduled Live Sessions */}
      <PageSection
        title={t('learnerDashboardPage.upcomingLiveSessions')}
        description="Scheduled interactive video sessions for your courses. Join directly inside LMS."
        action={
          <Link href="/learner/live-sessions">
            <Button variant="outline" size="sm">
              View all sessions
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-32 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.slice(0, 3).map((session) => {
              // Platform time (EAT), whatever the browser's time zone.
              const dateStr = formatSessionDate(session.scheduledAt, { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = formatSessionTime(session.scheduledAt);
              const isLive = session.status === 'LIVE';
              const isPerson = isInPersonSession(session);

              return (
                <div
                  key={session.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-soft ring-super-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isLive ? 'green' : isPerson ? 'amber' : 'blue'}>
                        {isLive
                          ? '● LIVE NOW'
                          : isPerson
                            ? '🏢 IN-PERSON CLASSROOM'
                            : 'VIRTUAL LECTURE'}
                      </Badge>
                      <span className="text-[11px] font-medium text-subtle-foreground">
                        {session.durationMinutes} mins
                      </span>
                    </div>

                    <h4 className="mt-3 font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {lang === 'am' && session.titleAm ? session.titleAm : session.titleEn}
                    </h4>
                    {(() => {
                      const cTitle = courses.find((c) => c.id === session.courseId)?.title;
                      return cTitle ? (
                        <p className="mt-1 text-xs text-muted-foreground truncate">{cTitle}</p>
                      ) : null;
                    })()}

                    {/* Venue tag for in-person */}
                    {session.venue && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-warning bg-warning-soft/80 px-2.5 py-1 rounded-lg border border-warning/30">
                        <MapPin className="h-3.5 w-3.5 text-warning shrink-0" />
                        <span className="truncate">
                          {session.venue.branch} · {session.venue.name}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-subtle-foreground" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3">
                    {isPerson ? (
                      <>
                        <Link href="/learner/live-sessions" className="flex-1">
                          <Button
                            size="sm"
                            className="w-full gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            Classroom Check-In
                          </Button>
                        </Link>
                        {session.venue ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const c = courses.find((c) => c.id === session.courseId);
                              setVenueModalData({
                                venue: session.venue!,
                                session,
                                courseTitle: c?.title,
                                courseCode: c?.code,
                              });
                            }}
                            title="Venue & Room Details"
                            className="text-xs"
                          >
                            Venue
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setActiveLiveSession(session)}
                          className={
                            isLive
                              ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'flex-1'
                          }
                        >
                          <Video className="h-3.5 w-3.5" />
                          {isLive ? 'Join Live (In-LMS)' : 'Join Session'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailSessionId(session.id)}
                          title="Session Details"
                        >
                          Details
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-subtle-foreground">
              <Video className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-secondary-foreground">No scheduled sessions</p>
            <p className="mt-1 text-xs text-subtle-foreground">
              Your trainers have not scheduled any upcoming live video sessions for your courses
              yet.
            </p>
          </div>
        )}
      </PageSection>

      {/* Full-Screen Workspaces */}
      {activeLiveSession ? (
        <LiveSessionWorkspace
          open={activeLiveSession !== null}
          session={activeLiveSession}
          onClose={() => setActiveLiveSession(null)}
        />
      ) : null}

      {detailSessionId ? (
        <SessionDetailModal
          open={detailSessionId !== null}
          sessionId={detailSessionId}
          onClose={() => setDetailSessionId(null)}
          onJoin={() => {
            const s = upcomingSessions.find((x) => x.id === detailSessionId);
            setDetailSessionId(null);
            if (s) setActiveLiveSession(s);
          }}
        />
      ) : null}

      {venueModalData ? (
        <VenueDetailModal
          open
          onClose={() => setVenueModalData(null)}
          venue={venueModalData.venue}
          session={venueModalData.session}
          courseTitle={venueModalData.courseTitle}
          courseCode={venueModalData.courseCode}
        />
      ) : null}
    </PageShell>
  );
}
