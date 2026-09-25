"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Laptop,
  MapPin,
  PlayCircle,
  Sparkles,
  Video,
} from "lucide-react";
import { fetchUpcomingSessions } from "@/lib/api/monitoring";
import type { ApiLiveSession, ApiVenue } from "@/lib/api/types";
import { useLms } from "@/lib/lms-store";
import { useCourseProgress } from "@/lib/api/useCourseProgress";
import { tr } from "@/constants/labels";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DonutChart, ProgressRing } from "@/components/ui/charts";
import { LiveSessionWorkspace } from "@/components/features/sessions/LiveSessionWorkspace";
import { SessionDetailModal } from "@/components/features/sessions/SessionDetailModal";
import { VenueDetailModal } from "@/components/features/venues/VenueDetailModal";

export default function LearnerDashboardPage() {
  const { courses, lang, currentUser, getEnrollmentForCourse } = useLms();
  const me = currentUser?.id ?? "";
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress } = useCourseProgress(enrolled.map((c) => c.id));

  const [upcomingSessions, setUpcomingSessions] = useState<ApiLiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

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
    let cancelled = false;
    setSessionsLoading(true);
    fetchUpcomingSessions()
      .then((res) => {
        if (!cancelled) {
          setUpcomingSessions(res.data);
          setSessionsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUpcomingSessions([]);
          setSessionsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      : enrolled[0] ?? null;

  const nextUpPercent = nextUp ? percentOf(nextUp.id) : 0;

  // Donut status segments for learning progress
  const learningSegments = [
    { label: "Completed", value: completed.length, color: "#10b981" },
    { label: "In Progress", value: inProgress.length, color: "#6366f1" },
    { label: "Not Started", value: notStarted.length, color: "#94a3b8" },
  ];

  // Compute counts for online vs in-person courses
  const { onlineCount, inPersonCount } = useMemo(() => {
    let on = 0;
    let inP = 0;
    for (const c of enrolled) {
      const enr = getEnrollmentForCourse(c.id);
      const isPerson =
        enr?.deliveryMode === "IN_PERSON_ONLY" ||
        (Boolean(enr?.venueId) && enr?.deliveryMode !== "ONLINE_ONLY") ||
        c.deliveryMode === "IN_PERSON_ONLY";
      if (isPerson) inP++;
      else on++;
    }
    return { onlineCount: on, inPersonCount: inP };
  }, [enrolled, getEnrollmentForCourse]);

  return (
    <PageShell
      role="learner"
      title={lang === "en" ? "Learner Dashboard" : "የተማሪ ዳሽቦርድ"}
      description={
        lang === "en"
          ? "Track your learning journey, resume active courses, and participate in scheduled live sessions."
          : "የመማር ሂደትዎን ይከታተሉ እና የቀጥታ ስልጠናዎችን ይቀላቀሉ።"
      }
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            {currentUser?.firstName || currentUser?.name
              ? `Welcome back, ${currentUser.firstName || currentUser.name}!`
              : "Welcome to your LMS Learning Hub"}
          </span>
        </div>
        <LanguageToggle />
      </div>

      {/* KPI Stat Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label={tr(lang, "myCourses")}
          value={enrolled.length}
          hint={`${onlineCount} Online · ${inPersonCount} In-Person`}
        />
        <StatCard
          icon={Building2}
          label="In-Person Classroom"
          value={inPersonCount}
          hint="Regional branch venues"
          iconClassName="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={CheckCircle2}
          label={tr(lang, "completed")}
          value={completed.length}
          hint="Finished courses"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Award}
          label={tr(lang, "averageProgress")}
          value={`${avgProgress}%`}
          hint="Platform average"
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Hero Learning Section: Continue Learning + Progress Analytics */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Continue Learning Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/20 lg:col-span-2">
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 top-0 h-40 w-40 rounded-full bg-violet-500/15 blur-2xl" />

          <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-sm">
                  <PlayCircle className="h-3.5 w-3.5 text-indigo-300" />
                  {nextUpPercent > 0 ? "Continue Learning" : "Start Learning"}
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
                    {nextUp.description || "Pick up right where you left off and advance towards course completion."}
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
                  <h3 className="font-display text-lg font-bold text-white">No active enrollments yet</h3>
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
                    className="bg-white text-indigo-950 font-semibold hover:bg-indigo-50 shadow-md shadow-white/10"
                  >
                    <PlayCircle className="h-4 w-4 text-indigo-700" />
                    {nextUpPercent > 0 ? "Resume Course" : "Start Course"}
                  </Button>
                </Link>
              ) : null}
              <Link href="/learner/my-courses">
                <Button
                  variant="outline"
                  size="md"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {tr(lang, "myCourses")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Learning Progress Ring & Distribution Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft">
          <div>
            <h4 className="font-display text-sm font-bold text-slate-900">
              Overall Completion Status
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">Across your enrolled courses</p>

            <div className="mt-4 flex justify-center">
              <ProgressRing
                percentage={avgProgress}
                size={140}
                strokeWidth={12}
                subtitle="Avg Progress"
                color={avgProgress >= 80 ? "#10b981" : avgProgress >= 40 ? "#6366f1" : "#f59e0b"}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700">Completed</p>
              <p className="mt-0.5 font-display text-lg font-bold text-slate-900">{completed.length}</p>
            </div>
            <div className="border-x border-slate-200">
              <p className="text-[11px] font-semibold text-indigo-700">In Progress</p>
              <p className="mt-0.5 font-display text-lg font-bold text-slate-900">{inProgress.length}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Not Started</p>
              <p className="mt-0.5 font-display text-lg font-bold text-slate-900">{notStarted.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Live Sessions */}
      <PageSection
        title={lang === "en" ? "Upcoming Live Sessions" : "ቀጣይ የቀጥታ ስልጠናዎች"}
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
              <div key={n} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.slice(0, 3).map((session) => {
              const dateStr = new Date(session.scheduledAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const timeStr = new Date(session.scheduledAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isLive = session.status === "LIVE";
              const isPerson = session.sessionType === "IN_PERSON" || Boolean(session.venueId);

              return (
                <div
                  key={session.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isLive ? "green" : isPerson ? "amber" : "blue"}>
                        {isLive
                          ? "● LIVE NOW"
                          : isPerson
                          ? "🏢 IN-PERSON CLASSROOM"
                          : "VIRTUAL LECTURE"}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-400">
                        {session.durationMinutes} mins
                      </span>
                    </div>

                    <h4 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {lang === "am" && session.titleAm ? session.titleAm : session.titleEn}
                    </h4>
                    {(() => {
                      const cTitle = courses.find((c) => c.id === session.courseId)?.title;
                      return cTitle ? (
                        <p className="mt-1 text-xs text-slate-500 truncate">{cTitle}</p>
                      ) : null;
                    })()}

                    {/* Venue tag for in-person */}
                    {session.venue && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200">
                        <MapPin className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">
                          {session.venue.branch} · {session.venue.name}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      onClick={() => setActiveLiveSession(session)}
                      className={isLive ? "flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" : "flex-1"}
                    >
                      <Video className="h-3.5 w-3.5" />
                      {isLive ? "Join Live (In-LMS)" : "Join Session"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailSessionId(session.id)}
                      title="Session Details"
                    >
                      Details
                    </Button>
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
                          className={isLive ? "flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" : "flex-1"}
                        >
                          <Video className="h-3.5 w-3.5" />
                          {isLive ? "Join Live (In-LMS)" : "Join Session"}
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
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Video className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-700">No scheduled sessions</p>
            <p className="mt-1 text-xs text-slate-400">
              Your trainers have not scheduled any upcoming live video sessions for your courses yet.
            </p>
          </div>
        )}
      </PageSection>

      {/* Quick Navigation Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/learner/live-sessions" className="group">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-indigo-200 group-hover:shadow-card">
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-indigo-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900">{tr(lang, "liveSessions")}</p>
                  <p className="text-xs text-slate-500">{upcomingSessions.length} available sessions</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </div>
          </div>
        </Link>
        <Link href="/learner/certificates" className="group">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-amber-200 group-hover:shadow-card">
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-amber-400/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900">{tr(lang, "certificates")}</p>
                  <p className="text-xs text-slate-500">{completed.length} earned certificates</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-amber-500" />
            </div>
          </div>
        </Link>
      </div>

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