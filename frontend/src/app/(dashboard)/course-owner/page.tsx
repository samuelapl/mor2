"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, Plus, UsersRound } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseCard } from "@/components/features/courses/CourseCard";

export default function CourseOwnerDashboardPage() {
  const { courses } = useLms();
  const owned = courses;
  const review = owned.filter((c) => c.status === "under_review");
  const approved = owned.filter((c) => c.status === "approved");
  const totalLearners = new Set(owned.flatMap((c) => c.enrolledLearnerIds)).size;
  const ownedPage = usePagination(owned, 3);

  return (
    <PageShell
      role="course_owner"
      title="Course Owner Dashboard"
      description="Create and manage your courses, track publishing status, and keep your course catalog healthy."
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Total courses" value={owned.length} hint="Active catalog" />
        <StatCard
          icon={ClipboardList}
          label="In review"
          value={review.length}
          hint="Awaiting content approval"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={approved.length}
          hint="Ready for publication"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersRound}
          label="Total learners"
          value={totalLearners}
          hint="Across all courses"
        />
      </div>

      <PageSection
        title="My Courses"
        description="Your current course catalog with approval status."
        action={
          <Link href="/course-owner/my-courses">
            <Button variant="outline" size="sm">
              View all
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
                  Manage
                </Button>
              </Link>
              {course.status === "under_review" ? (
                <Badge variant="blue">Pending review</Badge>
              ) : null}
            </CourseCard>
          ))}
        </div>
        <Pagination
          page={ownedPage.page}
          totalPages={ownedPage.totalPages}
          onPageChange={ownedPage.setPage}
        />
      </PageSection>

      <PageSection
        title="Catalog pipeline"
        description="Where each course stands in the approval workflow."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(["draft", "under_review", "approved"] as const).map((status) => {
            const items = owned.filter((c) => c.status === status);
            const labels: Record<string, string> = {
              draft: "Draft",
              under_review: "Under review",
              approved: "Approved",
            };
            return (
              <div key={status} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft ring-super-soft">
                <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-gradient-to-bl from-indigo-500/8 to-transparent" />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">{labels[status]}</p>
                  <Badge variant={status === "approved" ? "green" : status === "under_review" ? "blue" : "amber"}>
                    {items.length}
                  </Badge>
                </div>
                {items.length > 0 ? (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {items.map((c) => c.title).join(" · ")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No courses in this stage.</p>
                )}
              </div>
            );
          })}
        </div>
      </PageSection>

      <div className="flex flex-wrap gap-2">
        <Link href="/course-owner/create-course">
          <Button>
            <Plus className="h-4 w-4" />
            Create New Course
          </Button>
        </Link>
        <Link href="/course-owner/content-status">
          <Button variant="outline">Content status</Button>
        </Link>
      </div>
    </PageShell>
  );
}