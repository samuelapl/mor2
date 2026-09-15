"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Globe2,
  Send,
  UsersRound,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { useDashboardStats } from "@/lib/api/useDashboardStats";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";

const QUICK_LINKS = [
  {
    href: "/training-admin/courses",
    title: "Course Management",
    description: "View every course and its publish state.",
    icon: BookOpenCheck,
  },
  {
    href: "/training-admin/enrollments",
    title: "Enrollments",
    description: "Assign users to courses individually.",
    icon: UsersRound,
  },
  {
    href: "/training-admin/publish",
    title: "Publish Courses",
    description: "Release approved courses to learners.",
    icon: Send,
  },
  {
    href: "/training-admin/calendar",
    title: "Calendar",
    description: "Upcoming live training sessions.",
    icon: CalendarDays,
  },
];

export default function TrainingAdminDashboardPage() {
  const { courses } = useLms();
  const { stats } = useDashboardStats();
  const published = courses.filter((c) => c.published);
  const publishNext = courses.filter((c) => c.status === "approved" && !c.published);
  const publishNextPage = usePagination(publishNext, 3);

  const totalCourses = stats?.totals.courses ?? courses.length;
  const publishedCourses = stats?.statuses.publishedCourses ?? published.length;
  const activeEnrollments = stats?.statuses.activeEnrollments ?? 0;
  const certificatesIssued = stats?.statuses.certificatesIssued ?? 0;

  return (
    <PageShell
      role="training_admin"
      title="Training Administrator Dashboard"
      description="Manage courses, enrollments, publishing, and the overall training calendar."
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpenCheck}
          label="Total courses"
          value={totalCourses}
          hint="In the catalog"
        />
        <StatCard
          icon={Globe2}
          label="Published"
          value={publishedCourses}
          hint="Available to learners"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersRound}
          label="Active enrollments"
          value={activeEnrollments}
          hint="Learners enrolled now"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={BookOpenCheck}
          label="Certificates issued"
          value={certificatesIssued}
          hint="Across the platform"
          iconClassName="bg-amber-50 text-amber-600"
        />
      </div>

      <PageSection title="Quick actions" description="Common administrative tasks.">
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

      <PageSection
        title="Publish next"
        description="Courses approved but not yet released."
        action={
          <Link href="/training-admin/publish">
            <Button variant="outline" size="sm">
              Go to publishing
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publishNextPage.pageItems.map((course) => (
            <Card key={course.id}>
              <CardTitle>{course.title}</CardTitle>
              <CardDescription>
                {course.code} · {course.category}
              </CardDescription>
            </Card>
          ))}
        </div>
        <Pagination
          page={publishNextPage.page}
          totalPages={publishNextPage.totalPages}
          onPageChange={publishNextPage.setPage}
        />
      </PageSection>
    </PageShell>
  );
}