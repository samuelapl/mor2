"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileQuestion,
  GraduationCap,
  PlayCircle,
  Presentation,
  UsersRound,
  Video,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import { fetchCourseAssessments } from "@/lib/api/quiz";
import { fetchCourseLearnersProgress } from "@/lib/api/progress";
import { fetchLiveSessions } from "@/lib/api/monitoring";
import type { ApiLearnerProgress, ApiLiveSession } from "@/lib/api/types";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Table, Td } from "@/components/ui/Table";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { DonutChart, BarChart } from "@/components/ui/charts";
import { LiveSessionWorkspace } from "@/components/features/sessions/LiveSessionWorkspace";
import { SessionDetailModal } from "@/components/features/sessions/SessionDetailModal";

const QUICK_LINKS = [
  {
    href: "/trainer/sessions",
    title: "My Live Sessions",
    description: "Schedule, manage, and facilitate live classes.",
    icon: Presentation,
  },
  {
    href: "/trainer/question-bank",
    title: "Question Bank & Quizzes",
    description: "Author questions and assemble comprehensive quizzes.",
    icon: FileQuestion,
  },
  {
    href: "/trainer/sessions",
    title: "My Sessions",
    description: "Conduct scheduled training sessions and track attendance.",
    icon: Presentation,
  },
];

export default function TrainerDashboardPage() {
  const { courses, currentUser } = useLms();
  const assigned = courses.filter((c) => c.trainerId === currentUser?.id);

  const [allSessions, setAllSessions] = useState<ApiLiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Overlays
  const [activeLiveSession, setActiveLiveSession] = useState<ApiLiveSession | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const assignedIds = new Set(assigned.map((c) => c.id));

    setSessionsLoading(true);
    fetchLiveSessions({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        // Filter sessions for courses assigned to this trainer
        const relevant = res.data.filter((s) => assignedIds.has(s.courseId));
        setAllSessions(relevant);
        setSessionsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setAllSessions([]);
          setSessionsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, assigned.length]);

  const upcomingSessions = allSessions.filter(
    (s) => s.status === "SCHEDULED" || s.status === "LIVE"
  );
  const completedSessions = allSessions.filter((s) => s.status === "COMPLETED");

  const [quizReady, setQuizReady] = useState<Record<string, boolean>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [learners, setLearners] = useState<ApiLearnerProgress[] | null>(null);
  const [learnersError, setLearnersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        assigned.map(async (course) => {
          try {
            const list = await fetchCourseAssessments(course.id);
            return { id: course.id, hasQuiz: list.length > 0 };
          } catch {
            return { id: course.id, hasQuiz: false };
          }
        }),
      );
      if (cancelled) return;
      setQuizReady(
        Object.fromEntries(entries.map((entry) => [entry.id, entry.hasQuiz])),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, assigned.length]);

  useEffect(() => {
    if (!selectedCourseId) {
      setLearners(null);
      return;
    }
    let cancelled = false;
    setLearners(null);
    setLearnersError(null);
    fetchCourseLearnersProgress(selectedCourseId)
      .then((res) => {
        if (!cancelled) setLearners(res.learners);
      })
      .catch(() => {
        if (!cancelled) setLearnersError("Unable to load learner progress.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  const quizzes = useMemo(
    () => assigned.filter((course) => quizReady[course.id]),
    [assigned, quizReady],
  );
  const assignedPage = usePagination(assigned, 3);

  // Total unique learners across assigned courses
  const totalEnrolledLearners = useMemo(() => {
    const ids = new Set<string>();
    assigned.forEach((c) => c.enrolledLearnerIds.forEach((id) => ids.add(id)));
    return ids.size;
  }, [assigned]);

  // Session status segments for Donut chart
  const sessionStatusSegments = [
    {
      label: "Upcoming",
      value: allSessions.filter((s) => s.status === "SCHEDULED").length,
      color: "#6366f1",
    },
    {
      label: "Live Now",
      value: allSessions.filter((s) => s.status === "LIVE").length,
      color: "#10b981",
    },
    {
      label: "Completed",
      value: completedSessions.length,
      color: "#94a3b8",
    },
    {
      label: "Cancelled",
      value: allSessions.filter((s) => s.status === "CANCELLED").length,
      color: "#f43f5e",
    },
  ];

  // Learner completion metrics if course is selected
  const learnerStatusSegments = useMemo(() => {
    if (!learners || learners.length === 0) return [];
    const completed = learners.filter((l) => l.progressPercent >= 100).length;
    const inProg = learners.filter((l) => l.progressPercent > 0 && l.progressPercent < 100).length;
    const notStarted = learners.filter((l) => l.progressPercent === 0).length;
    return [
      { label: "Completed", value: completed, color: "#10b981" },
      { label: "In Progress", value: inProg, color: "#6366f1" },
      { label: "Not Started", value: notStarted, color: "#cbd5e1" },
    ];
  }, [learners]);

  // Course enrollment comparison items for Bar chart
  const courseEnrollmentBars = useMemo(() => {
    return assigned.slice(0, 5).map((c) => ({
      label: c.title,
      value: c.enrolledLearnerIds.length,
      subLabel: `${c.enrolledLearnerIds.length} learners`,
      color: "#6366f1",
    }));
  }, [assigned]);

  return (
    <PageShell
      role="trainer"
      title="Trainer Dashboard"
      description="Manage live training sessions, mark student attendance, author questions, and track learner achievement."
    >
      {/* Top Stat Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Presentation}
          label="Assigned courses"
          value={assigned.length}
          hint="Courses you facilitate"
        />
        <StatCard
          icon={Video}
          label="Upcoming sessions"
          value={upcomingSessions.length}
          hint={`${allSessions.length} total scheduled`}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={UsersRound}
          label="Total learners"
          value={totalEnrolledLearners}
          hint="Across assigned courses"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={FileQuestion}
          label="Quizzes ready"
          value={quizzes.length}
          hint="From question bank"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Graphical Section: Session Distribution + Course Enrollments */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Session Distribution Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Live Session Distribution
                </h4>
                <p className="text-xs text-slate-500">Breakdown of scheduled and completed training</p>
              </div>
              <Link href="/trainer/sessions">
                <Button variant="outline" size="sm">
                  Sessions
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <DonutChart
                segments={sessionStatusSegments}
                centerLabel="Sessions"
                centerValue={allSessions.length}
                emptyText="No sessions created"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Completed training: {completedSessions.length}</span>
            <span className="font-medium text-indigo-600">
              {upcomingSessions.length} upcoming
            </span>
          </div>
        </div>

        {/* Course Enrollment Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Enrollment by Course
                </h4>
                <p className="text-xs text-slate-500">Student enrollment across your training catalog</p>
              </div>
              <Badge variant="blue">{assigned.length} Courses</Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={courseEnrollmentBars}
                emptyText="No courses assigned yet."
                barColor="#4f46e5"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Total enrolled students: {totalEnrolledLearners}</span>
            <Link href="/trainer/sessions" className="font-semibold text-indigo-600 hover:underline">
              View sessions & attendance →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <PageSection title="Quick actions" description="Direct access to trainer workflows.">
        <div className="grid gap-4 sm:grid-cols-3">
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
                    Open workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageSection>

      {/* Upcoming Sessions List */}
      <PageSection
        title="Upcoming live sessions"
        description="Sessions scheduled for your assigned courses."
        action={
          <Link href="/trainer/sessions">
            <Button variant="outline" size="sm">
              All sessions
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
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
                    <Button
                      size="sm"
                      onClick={() => setActiveLiveSession(session)}
                      className={isLive ? "flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" : "flex-1"}
                    >
                      <Video className="h-3.5 w-3.5" />
                      {isLive ? "Start Meeting (In-LMS)" : "Start Session"}
                    </Button>
                    <Link href="/trainer/sessions">
                      <Button size="sm" variant="outline" title="Session Details & Attendance">
                        <ClipboardCheck className="h-3.5 w-3.5" />
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
              <Presentation className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-700">No scheduled sessions</p>
            <p className="mt-1 text-xs text-slate-400">
              Schedule live video sessions for your courses or review previously completed classes.
            </p>
          </div>
        )}
      </PageSection>

      {/* Assigned Courses Section */}
      <PageSection
        title="Assigned courses"
        description="Courses assigned to you for instruction and assessment."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignedPage.pageItems.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              extraBadge={
                quizReady[course.id] ? (
                  <Badge variant="green">Quiz ready</Badge>
                ) : (
                  <Badge variant="outline">No quiz</Badge>
                )
              }
            >
              <Link href="/trainer/question-bank">
                <Button size="sm" variant="outline">
                  Question bank
                </Button>
              </Link>
            </CourseCard>
          ))}
        </div>
        <Pagination
          page={assignedPage.page}
          totalPages={assignedPage.totalPages}
          onPageChange={assignedPage.setPage}
        />
      </PageSection>

      {/* Learner Progress & Achievement */}
      <PageSection
        title="Learner progress & performance"
        description="Inspect student completion and progress across your training courses."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Filter by Course:</label>
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
              className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="">Select a course…</option>
              {assigned.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {learners && learners.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{learners.length} Students Enrolled</span>
              <span className="font-semibold text-emerald-600">
                {learners.filter((l) => l.progressPercent >= 100).length} Completed
              </span>
            </div>
          )}
        </div>

        {learnersError ? (
          <p className="text-sm text-red-500">{learnersError}</p>
        ) : learners === null ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center">
            <p className="text-xs text-slate-400">Choose a course above to inspect learner progress.</p>
          </div>
        ) : learners.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center">
            <p className="text-xs text-slate-400">No enrolled learners in this course yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Donut breakdown for selected course */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
              <DonutChart
                segments={learnerStatusSegments}
                centerLabel="Students"
                centerValue={learners.length}
                size={140}
              />
            </div>

            <Table columns={["Learner", "Email", "Progress", "Status"]}>
              {learners.map((learner) => (
                <tr key={learner.userId}>
                  <Td>
                    <span className="font-medium text-slate-900">
                      {learner.firstName} {learner.lastName}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-sm text-slate-500">{learner.email}</span>
                  </Td>
                  <Td className="w-56">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={learner.progressPercent} className="flex-1" />
                      <span className="w-10 text-right text-xs font-medium text-slate-600">
                        {learner.progressPercent}%
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={learner.status === "COMPLETED" ? "green" : "blue"}>
                      {learner.status === "COMPLETED"
                        ? "Completed"
                        : learner.status === "ACTIVE"
                        ? "Active"
                        : learner.status}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </PageSection>

      {/* Full-Screen Live Meeting Overlay */}
      {activeLiveSession && (
        <LiveSessionWorkspace
          open={activeLiveSession !== null}
          session={activeLiveSession}
          onClose={() => setActiveLiveSession(null)}
        />
      )}

      {/* Full-Screen Session Details Overlay */}
      {detailSessionId && (
        <SessionDetailModal
          open={detailSessionId !== null}
          sessionId={detailSessionId}
          onClose={() => setDetailSessionId(null)}
          onJoin={() => {
            const s = allSessions.find((x) => x.id === detailSessionId);
            setDetailSessionId(null);
            if (s) setActiveLiveSession(s);
          }}
        />
      )}
    </PageShell>
  );
}