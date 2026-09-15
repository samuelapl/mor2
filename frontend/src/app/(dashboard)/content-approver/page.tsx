"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock4, FileCheck2, Timer } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseCard } from "@/components/features/courses/CourseCard";

export default function ContentApproverDashboardPage() {
  const { courses } = useLms();
  const pending = courses.filter((c) => c.status === "under_review");
  const approved = courses.filter((c) => c.status === "approved");
  const pendingPage = usePagination(pending, 3);
  const approvedPage = usePagination(approved, 3);

  return (
    <PageShell
      role="content_approver"
      title="Content Approver Dashboard"
      description="Review pending course submissions and manage the approved content library."
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Timer}
          label="Pending approvals"
          value={pending.length}
          hint="Awaiting your review"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved courses"
          value={approved.length}
          hint="In the approved library"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Clock4}
          label="Avg review time"
          value="1.2 d"
          hint="Last 30 days"
        />
      </div>

      {pending.length > 0 ? (
        <PageSection
          title="Pending approvals"
          description="Courses waiting for your review."
          action={
            <Link href="/content-approver/pending-approvals">
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
                <Link href="/content-approver/pending-approvals">
                  <Button size="sm" variant="outline">
                    Review
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
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">All caught up</p>
            <p className="mt-1 text-xs text-slate-400">
              New submissions will appear here for approval.
            </p>
          </div>
        </PageSection>
      )}

      <PageSection
        title="Recently approved"
        description="Your approved content library."
        action={
          <Link href="/content-approver/approved-courses">
            <Button variant="outline" size="sm">
              View library
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {approvedPage.pageItems.map((course) => (
            <CourseCard key={course.id} course={course} />
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