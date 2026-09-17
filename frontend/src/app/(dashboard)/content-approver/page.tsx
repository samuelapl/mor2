"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock4,
  FileCheck2,
  FileText,
  Timer,
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

export default function ContentApproverDashboardPage() {
  const { courses } = useLms();
  const pending = courses.filter((c) => c.status === "under_review");
  const approved = courses.filter((c) => c.status === "approved");
  const drafts = courses.filter((c) => c.status === "draft");

  const pendingPage = usePagination(pending, 3);
  const approvedPage = usePagination(approved, 3);

  // Approval rate
  const totalReviewed = approved.length + pending.length;
  const approvalRate =
    totalReviewed > 0 ? Math.round((approved.length / totalReviewed) * 100) : 100;

  // Donut chart: Review Queue Distribution
  const queueSegments = [
    { label: "Approved", value: approved.length, color: "#10b981" },
    { label: "Pending Review", value: pending.length, color: "#6366f1" },
    { label: "Draft Stage", value: drafts.length, color: "#94a3b8" },
  ];

  // Category breakdown for approved & pending courses
  const categoryBars = useMemo(() => {
    const counts: Record<string, number> = {};
    courses.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return Object.entries(counts)
      .slice(0, 5)
      .map(([cat, val]) => ({
        label: cat,
        value: val,
        subLabel: `${val} courses`,
        color: "#4f46e5",
      }));
  }, [courses]);

  return (
    <PageShell
      role="content_approver"
      title="Content Approver Dashboard"
      description="Review submitted curricula, verify quality and compliance, and maintain the approved course repository."
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Timer}
          label="Pending review"
          value={pending.length}
          hint="Awaiting your approval"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved courses"
          value={approved.length}
          hint="In approved repository"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={BookOpen}
          label="Total catalog"
          value={courses.length}
          hint="All active courses"
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock4}
          label="Approval rate"
          value={`${approvalRate}%`}
          hint="Approved vs submitted"
          iconClassName="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Graphical Insights: Review Queue & Category Breakdown */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Review Queue Status Donut */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Approval Queue Status
                </h4>
                <p className="text-xs text-slate-500">Distribution of courses across review stages</p>
              </div>
              <Link href="/courses">
                <Button variant="outline" size="sm">
                  Review queue
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <DonutChart
                segments={queueSegments}
                centerLabel="Courses"
                centerValue={courses.length}
                emptyText="No courses submitted"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{pending.length} courses awaiting your action</span>
            <span className="font-semibold text-emerald-600">
              {approved.length} approved
            </span>
          </div>
        </div>

        {/* Category Distribution Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Courses by Category
                </h4>
                <p className="text-xs text-slate-500">Curriculum distribution across domains</p>
              </div>
              <Badge variant="blue">{courses.length} Courses</Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={categoryBars}
                emptyText="No category data available."
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Categories represented: {categoryBars.length}</span>
            <Link
              href="/courses"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Approved library →
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pending.length > 0 ? (
        <PageSection
          title="Pending approvals"
          description="Courses submitted by Course Owners awaiting review and approval."
          action={
            <Link href="/courses">
              <Button variant="outline" size="sm">
                Review queue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingPage.pageItems.map((course) => (
              <CourseCard key={course.id} course={course}>
                <Badge variant="blue">Pending review</Badge>
                <Link href="/courses">
                  <Button size="sm" variant="outline">
                    Review Curriculum
                  </Button>
                </Link>
              </CourseCard>
            ))}
          </div>
          <Pagination
            page={pendingPage.page}
            totalPages={pendingPage.totalPages}
            onPageChange={pendingPage.setPage}
          />
        </PageSection>
      ) : (
        <PageSection title="Approval queue" description="The approval queue is currently empty.">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">All submissions reviewed</p>
            <p className="mt-1 text-xs text-slate-400">
              There are no pending course submissions requiring approval right now.
            </p>
          </div>
        </PageSection>
      )}

      {/* Recently Approved Section */}
      <PageSection
        title="Recently approved content"
        description="Courses certified for public release and training facilitation."
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              View full library
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {approvedPage.pageItems.map((course) => (
            <CourseCard key={course.id} course={course}>
              <Badge variant="green">Approved</Badge>
            </CourseCard>
          ))}
        </div>
        <Pagination
          page={approvedPage.page}
          totalPages={approvedPage.totalPages}
          onPageChange={approvedPage.setPage}
        />
      </PageSection>
    </PageShell>
  );
}