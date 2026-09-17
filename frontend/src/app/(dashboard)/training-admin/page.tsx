"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Globe2,
  UsersRound,
  Video,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { useDashboardStats } from "@/lib/api/useDashboardStats";
import { fetchLiveSessions } from "@/lib/api/monitoring";
import type { ApiLiveSession } from "@/lib/api/types";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { DonutChart, BarChart } from "@/components/ui/charts";

const QUICK_LINKS = [
  {
    href: "/courses",
    title: "Courses",
    description: "Inspect every course, publish approved ones, and manage lifecycle states.",
    icon: BookOpenCheck,
  },
  {
    href: "/training-admin/enrollments",
    title: "Learner Enrollments",
    description: "Assign learners to courses individually or in batches.",
    icon: UsersRound,
  },
  {
    href: "/training-admin/sessions",
    title: "Live Sessions",
    description: "Schedule sessions and monitor facilitator attendance.",
    icon: Video,
  },
];

export default function TrainingAdminDashboardPage() {
  const { courses } = useLms();
  const { stats } = useDashboardStats();

  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    fetchLiveSessions({ limit: 50 })
      .then((res) => {
        if (!cancelled) {
          setSessions(res.data);
          setSessionsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          setSessionsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const published = courses.filter((c) => c.published);
  const underReview = courses.filter((c) => c.status === "under_review");
  const drafts = courses.filter((c) => c.status === "draft");
  const publishNext = courses.filter((c) => c.status === "approved" && !c.published);
  const publishNextPage = usePagination(publishNext, 3);

  const totalCourses = stats?.totals.courses ?? courses.length;
  const publishedCourses = stats?.statuses.publishedCourses ?? published.length;
  const activeEnrollments = stats?.statuses.activeEnrollments ?? 0;
  const totalSessions = stats?.totals.liveSessions ?? sessions.length;

  const upcomingSessions = sessions.filter(
    (s) => s.status === "SCHEDULED" || s.status === "LIVE"
  );
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");

  // Donut chart: Course Catalog Pipeline
  const coursePipelineSegments = [
    { label: "Published", value: publishedCourses, color: "#10b981" },
    { label: "Approved (Unpublished)", value: publishNext.length, color: "#06b6d4" },
    { label: "Under Review", value: underReview.length, color: "#6366f1" },
    { label: "Drafts", value: drafts.length, color: "#94a3b8" },
  ];

  // Donut chart: Live Training Sessions
  const sessionSegments = [
    {
      label: "Upcoming",
      value: sessions.filter((s) => s.status === "SCHEDULED").length,
      color: "#6366f1",
    },
    {
      label: "Live Now",
      value: sessions.filter((s) => s.status === "LIVE").length,
      color: "#10b981",
    },
    {
      label: "Completed",
      value: completedSessions.length,
      color: "#94a3b8",
    },
    {
      label: "Cancelled",
      value: sessions.filter((s) => s.status === "CANCELLED").length,
      color: "#f43f5e",
    },
  ];

  return (
    <PageShell
      role="training_admin"
      title="Training Administrator Dashboard"
      description="Manage enterprise courses, oversee learner enrollments, release approved content, and schedule interactive training."
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpenCheck}
          label="Total courses"
          value={totalCourses}
          hint="Across all lifecycle stages"
        />
        <StatCard
          icon={Globe2}
          label="Published catalog"
          value={publishedCourses}
          hint="Available to learners"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersRound}
          label="Active enrollments"
          value={activeEnrollments}
          hint="Current learner seats"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Video}
          label="Live sessions"
          value={totalSessions}
          hint={`${upcomingSessions.length} upcoming or active`}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Graphical Insights: Catalog Pipeline & Session Distribution */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Catalog Pipeline Donut */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Course Catalog Lifecycle
                </h4>
                <p className="text-xs text-slate-500">Distribution across publishing states</p>
              </div>
              <Link href="/courses">
                <Button variant="outline" size="sm">
                  Publishing queue
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <DonutChart
                segments={coursePipelineSegments}
                centerLabel="Courses"
                centerValue={totalCourses}
                emptyText="No courses created"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{publishedCourses} courses available to learners</span>
            <span className="font-semibold text-indigo-600">
              {publishNext.length} ready to publish
            </span>
          </div>
        </div>

        {/* Live Sessions Distribution Donut */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Training Session Breakdown
                </h4>
                <p className="text-xs text-slate-500">Live facilitator sessions across the platform</p>
              </div>
              <Link href="/training-admin/sessions">
                <Button variant="outline" size="sm">
                  Manage sessions
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <DonutChart
                segments={sessionSegments}
                centerLabel="Sessions"
                centerValue={sessions.length}
                emptyText="No sessions recorded"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Completed training: {completedSessions.length}</span>
            <span className="font-semibold text-emerald-600">
              {upcomingSessions.length} active or scheduled
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <PageSection title="Quick actions" description="Core administration workflows.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card interactive className="flex h-full flex-col justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4">
                    <CardTitle>{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-500 transition-transform duration-200 group-hover:translate-x-0.5">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageSection>

      {/* Upcoming Training Sessions Widget */}
      <PageSection
        title="Upcoming live sessions"
        description="Upcoming scheduled classes facilitated by trainers."
        action={
          <Link href="/training-admin/sessions">
            <Button variant="outline" size="sm">
              Schedule & manage
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.slice(0, 3).map((session) => {
              const isLive = session.status === "LIVE";
              const dateStr = new Date(session.scheduledAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const timeStr = new Date(session.scheduledAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={session.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isLive ? "green" : "blue"}>
                        {isLive ? "● LIVE NOW" : "SCHEDULED"}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-400">
                        {session.durationMinutes} mins
                      </span>
                    </div>

                    <h4 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {session.titleEn}
                    </h4>
                    {(() => {
                      const cTitle = courses.find((c) => c.id === session.courseId)?.title;
                      return cTitle ? (
                        <p className="mt-1 text-xs text-slate-500 truncate">{cTitle}</p>
                      ) : null;
                    })()}

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
                    <Link href={`/training-admin/sessions`} className="w-full">
                      <Button size="sm" variant="outline" className="w-full">
                        View in sessions workspace
                      </Button>
                    </Link>
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
            <p className="mt-3 text-xs font-semibold text-slate-700">No upcoming training sessions</p>
            <p className="mt-1 text-xs text-slate-400">
              Schedule interactive sessions for approved courses from the sessions workspace.
            </p>
          </div>
        )}
      </PageSection>

      {/* Ready to Publish Section */}
      <PageSection
        title="Ready to publish"
        description="Courses approved by content reviewers awaiting public release."
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              Publishing center
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {publishNext.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {publishNextPage.pageItems.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="blue">Approved</Badge>
                    <span className="text-xs text-slate-400">{course.code}</span>
                  </div>
                  <h4 className="mt-3 font-display text-sm font-bold text-slate-900 line-clamp-1">
                    {course.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {course.description || "No description provided."}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">{course.category}</span>
                    <Link href="/courses">
                      <Button size="sm" variant="outline">
                        Publish course
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={publishNextPage.page}
              totalPages={publishNextPage.totalPages}
              onPageChange={publishNextPage.setPage}
            />
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center">
            <p className="text-xs text-slate-400">No courses currently waiting for publication.</p>
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}