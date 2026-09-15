"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileQuestion,
  Presentation,
  Video,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import { fetchCourseAssessments } from "@/lib/api/quiz";
import { fetchCourseLearnersProgress } from "@/lib/api/progress";
import { fetchLiveSessions } from "@/lib/api/monitoring";
import type { ApiLearnerProgress } from "@/lib/api/types";
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

const QUICK_LINKS = [
  {
    href: "/trainer/sessions",
    title: "My Sessions",
    description: "Schedule and manage live sessions.",
    icon: Presentation,
  },
  {
    href: "/trainer/create-quiz",
    title: "Create Quiz",
    description: "Build and manage course quizzes.",
    icon: FileQuestion,
  },
  {
    href: "/trainer/attendance",
    title: "Attendance",
    description: "Mark attendance for live sessions.",
    icon: ClipboardCheck,
  },
];

export default function TrainerDashboardPage() {
  const { courses, currentUser } = useLms();
  const assigned = courses.filter((c) => c.trainerId === currentUser?.id);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const assignedIds = new Set(
      courses.filter((c) => c.trainerId === currentUser.id).map((c) => c.id),
    );
    fetchLiveSessions({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setUpcomingCount(
          res.data.filter(
            (s) =>
              (s.status === "SCHEDULED" || s.status === "LIVE") && assignedIds.has(s.courseId),
          ).length,
        );
      })
      .catch(() => {
        if (!cancelled) setUpcomingCount(0);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

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

  return (
    <PageShell
      role="trainer"
      title="Trainer Dashboard"
      description="Run live sessions, create quizzes, and track learner progress."
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Presentation} label="Assigned courses" value={assigned.length} hint="Courses you train" />
        <StatCard
          icon={Video}
          label="Upcoming sessions"
          value={upcomingCount}
          hint="In the next weeks"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={FileQuestion}
          label="Quizzes created"
          value={quizzes.length}
          hint="Across your courses"
        />
      </div>

      <PageSection
        title="My courses"
        description="Courses assigned to you for facilitation."
        action={
          <Link href="/trainer/sessions">
            <Button variant="outline" size="sm">
              All sessions
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignedPage.pageItems.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              extraBadge={quizReady[course.id] ? <Badge variant="green">Quiz ready</Badge> : <Badge variant="outline">No quiz</Badge>}
            >
              <Link href="/trainer/create-quiz">
                <Button size="sm" variant="outline">
                  Manage quiz
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

      <PageSection
        title="Learner progress"
        description="Track completion across your assigned courses."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Course</label>
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

        {learnersError ? (
          <p className="text-sm text-red-500">{learnersError}</p>
        ) : learners === null ? (
          <p className="text-sm text-slate-400">Choose a course to see learner progress.</p>
        ) : learners.length === 0 ? (
          <p className="text-sm text-slate-400">No enrolled learners yet.</p>
        ) : (
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
        )}
      </PageSection>

      <PageSection title="Quick actions" description="Common trainer tasks.">
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
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageSection>
    </PageShell>
  );
}