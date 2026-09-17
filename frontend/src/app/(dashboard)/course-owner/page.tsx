"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  Globe2,
  Plus,
  UsersRound,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { DonutChart, BarChart } from "@/components/ui/charts";

export default function CourseOwnerDashboardPage() {
  const { courses } = useLms();
  const owned = courses;
  const drafts = owned.filter((c) => c.status === "draft");
  const review = owned.filter((c) => c.status === "under_review");
  const approved = owned.filter((c) => c.status === "approved");
  const published = owned.filter((c) => c.published);

  const totalLearners = useMemo(() => {
    return new Set(owned.flatMap((c) => c.enrolledLearnerIds)).size;
  }, [owned]);

  const ownedPage = usePagination(owned, 3);

  // Donut chart: Course Status Distribution
  const courseStatusSegments = [
    { label: "Published", value: published.length, color: "#10b981" },
    {
      label: "Approved (Unpublished)",
      value: approved.filter((c) => !c.published).length,
      color: "#06b6d4",
    },
    { label: "Under Review", value: review.length, color: "#6366f1" },
    { label: "Drafts", value: drafts.length, color: "#f59e0b" },
  ];

  // Bar chart: Top Courses by Enrollment
  const topEnrolledBars = useMemo(() => {
    return [...owned]
      .sort((a, b) => b.enrolledLearnerIds.length - a.enrolledLearnerIds.length)
      .slice(0, 5)
      .map((c) => ({
        label: c.title,
        value: c.enrolledLearnerIds.length,
        subLabel: `${c.enrolledLearnerIds.length} learners`,
        color: "#6366f1",
      }));
  }, [owned]);

  return (
    <PageShell
      role="course_owner"
      title="Course Owner Dashboard"
      description="Design curriculum, submit courses for content review, track approval milestones, and monitor student enrollment."
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Total courses"
          value={owned.length}
          hint="Created by your team"
        />
        <StatCard
          icon={ClipboardList}
          label="In review"
          value={review.length}
          hint="Pending reviewer approval"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={approved.length}
          hint={`${published.length} published`}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersRound}
          label="Total learners"
          value={totalLearners}
          hint="Across your curriculum"
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Action Banner */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-slate-50 p-5 shadow-soft">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900">
            Design & Publish Professional Courses
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Build rich modules, lessons, assessments, and submit to content approvers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/course-owner/create-course">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Create New Course
            </Button>
          </Link>
          <Link href="/course-owner/content-status">
            <Button variant="outline" size="sm">
              Review Pipeline
            </Button>
          </Link>
        </div>
      </div>

      {/* Graphical Section: Status Distribution & Enrollment by Course */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Status Distribution Donut */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Course Lifecycle Distribution
                </h4>
                <p className="text-xs text-slate-500">Status of courses you created</p>
              </div>
              <Link href="/course-owner/content-status">
                <Button variant="outline" size="sm">
                  Status
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <DonutChart
                segments={courseStatusSegments}
                centerLabel="Courses"
                centerValue={owned.length}
                emptyText="No courses created"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Drafts: {drafts.length}</span>
            <span className="font-semibold text-emerald-600">
              {approved.length} approved for release
            </span>
          </div>
        </div>

        {/* Enrollment by Course Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Top Courses by Enrollment
                </h4>
                <p className="text-xs text-slate-500">Student enrollment numbers per course</p>
              </div>
              <Badge variant="blue">{totalLearners} Total Students</Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={topEnrolledBars}
                emptyText="No enrollment data available."
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Total courses created: {owned.length}</span>
            <Link href="/course-owner/my-courses" className="font-semibold text-indigo-600 hover:underline">
              View all courses →
            </Link>
          </div>
        </div>
      </div>

      {/* My Courses Catalog Section */}
      <PageSection
        title="My Courses"
        description="Your course catalog with editing access and approval status."
        action={
          <Link href="/course-owner/my-courses">
            <Button variant="outline" size="sm">
              View all courses
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownedPage.pageItems.map((course) => (
            <CourseCard key={course.id} course={course}>
              <Link href={`/course-owner/my-courses`}>
                <Button size="sm" variant="outline">
                  Manage Curriculum
                </Button>
              </Link>
              {course.status === "under_review" ? (
                <Badge variant="blue">Under review</Badge>
              ) : course.status === "draft" ? (
                <Badge variant="amber">Draft</Badge>
              ) : (
                <Badge variant="green">Approved</Badge>
              )}
            </CourseCard>
          ))}
        </div>
        <Pagination
          page={ownedPage.page}
          totalPages={ownedPage.totalPages}
          onPageChange={ownedPage.setPage}
        />
      </PageSection>

      {/* Catalog Pipeline Summary */}
      <PageSection
        title="Review & Publishing Pipeline"
        description="Current standing of courses in the review process."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(["draft", "under_review", "approved"] as const).map((status) => {
            const items = owned.filter((c) => c.status === status);
            const labels: Record<string, string> = {
              draft: "Draft Stage",
              under_review: "Under Review",
              approved: "Approved & Ready",
            };
            return (
              <div
                key={status}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{labels[status]}</p>
                  <Badge
                    variant={
                      status === "approved"
                        ? "green"
                        : status === "under_review"
                        ? "blue"
                        : "amber"
                    }
                  >
                    {items.length} {items.length === 1 ? "course" : "courses"}
                  </Badge>
                </div>
                {items.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {items.slice(0, 3).map((c) => (
                      <li key={c.id} className="truncate font-medium">
                        • {c.title}
                      </li>
                    ))}
                    {items.length > 3 && (
                      <li className="text-[11px] text-slate-400 italic">
                        +{items.length - 3} more
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">No courses in this stage.</p>
                )}
              </div>
            );
          })}
        </div>
      </PageSection>
    </PageShell>
  );
}