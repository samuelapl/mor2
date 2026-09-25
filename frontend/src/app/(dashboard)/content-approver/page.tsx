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
import { useTranslation } from "@/lib/i18n/useTranslation";
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
  const { lang } = useTranslation();
  const isAmharic = lang === "am";

  const pending = courses.filter((c) => c.status === "under_review");
  const approved = courses.filter((c) => c.status === "approved");
  const drafts = courses.filter((c) => c.status === "draft");

  const pendingPage = usePagination(pending, 6);
  const approvedPage = usePagination(approved, 6);

  // Approval rate
  const totalReviewed = approved.length + pending.length;
  const approvalRate =
    totalReviewed > 0 ? Math.round((approved.length / totalReviewed) * 100) : 100;

  // Donut chart: Review Queue Distribution
  const queueSegments = [
    {
      label: isAmharic ? "የጸደቁ" : "Approved",
      value: approved.length,
      color: "#10b981",
    },
    {
      label: isAmharic ? "ግምገማ የሚጠብቁ" : "Pending Review",
      value: pending.length,
      color: "#6366f1",
    },
    {
      label: isAmharic ? "የረቂቅ ደረጃ" : "Draft Stage",
      value: drafts.length,
      color: "#94a3b8",
    },
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
        subLabel: isAmharic ? `${val} ኮርሶች` : `${val} courses`,
        color: "#4f46e5",
      }));
  }, [courses, isAmharic]);

  return (
    <PageShell
      role="content_approver"
      title={isAmharic ? "የይዘት አጽዳቂ ዳሽቦርድ" : "Content Approver Dashboard"}
      description={
        isAmharic
          ? "የቀረቡ የስልጠና ይዘቶችን ይገምግሙ፣ ጥራትን እና ተገቢነትን ያረጋግጡ፣ የጸደቁ ኮርሶችን ያቀናብሩ።"
          : "Review submitted curricula, verify quality and compliance, and maintain the approved course repository."
      }
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Timer}
          label={isAmharic ? "ግምገማ የሚጠብቁ" : "Pending review"}
          value={pending.length}
          hint={isAmharic ? "ማጽደቅዎን የሚጠብቁ" : "Awaiting your approval"}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={isAmharic ? "የጸደቁ ኮርሶች" : "Approved courses"}
          value={approved.length}
          hint={isAmharic ? "በጸደቁ ኮርሶች ማከማቻ ውስጥ" : "In approved repository"}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={BookOpen}
          label={isAmharic ? "ጠቅላላ ካታሎግ" : "Total catalog"}
          value={courses.length}
          hint={isAmharic ? "ሁሉም ንቁ ኮርሶች" : "All active courses"}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock4}
          label={isAmharic ? "የማጽደቅ ምጣኔ" : "Approval rate"}
          value={`${approvalRate}%`}
          hint={isAmharic ? "የጸደቁ ከቀረቡት አንፃር" : "Approved vs submitted"}
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
                  {isAmharic ? "የግምገማ ሂደት ሁኔታ" : "Approval Queue Status"}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAmharic ? "የኮርሶች ስርጭት በግምገማ ደረጃዎች" : "Distribution of courses across review stages"}
                </p>
              </div>
              <Link href="/courses">
                <Button variant="outline" size="sm">
                  {isAmharic ? "የግምገማ ዝርዝር" : "Review queue"}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex justify-center">
              <DonutChart
                segments={queueSegments}
                centerLabel={isAmharic ? "ኮርሶች" : "Courses"}
                centerValue={courses.length}
                emptyText={isAmharic ? "ምንም የቀረበ ኮርስ የለም" : "No courses submitted"}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{isAmharic ? `${pending.length} ኮርሶች እርምጃዎን ይጠብቃሉ` : `${pending.length} courses awaiting your action`}</span>
            <span className="font-semibold text-emerald-600">
              {isAmharic ? `${approved.length} የጸደቁ` : `${approved.length} approved`}
            </span>
          </div>
        </div>

        {/* Category Distribution Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {isAmharic ? "ኮርሶች በምድብ" : "Courses by Category"}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAmharic ? "የስርዓተ-ትምህርት ስርጭት በስራ መስኮች" : "Curriculum distribution across domains"}
                </p>
              </div>
              <Badge variant="blue">
                {isAmharic ? `${courses.length} ኮርሶች` : `${courses.length} Courses`}
              </Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={categoryBars}
                emptyText={isAmharic ? "ምንም የምድብ መረጃ የለም።" : "No category data available."}
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{isAmharic ? `የምድቦች ብዛት: ${categoryBars.length}` : `Categories represented: ${categoryBars.length}`}</span>
            <Link
              href="/courses"
              className="font-semibold text-indigo-600 hover:underline"
            >
              {isAmharic ? "የጸደቁ ኮርሶች ቤተ-መጽሐፍት →" : "Approved library →"}
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section with Modern Pagination */}
      {pending.length > 0 ? (
        <PageSection
          title={isAmharic ? "ግምገማ የሚጠብቁ ኮርሶች" : "Pending approvals"}
          description={
            isAmharic
              ? "በኮርስ ባለቤቶች የቀረቡ እና የእርስዎን ግምገማ እና ማጽደቅ የሚጠብቁ ኮርሶች።"
              : "Courses submitted by Course Owners awaiting review and approval."
          }
          action={
            <Link href="/courses">
              <Button variant="outline" size="sm">
                {isAmharic ? "የግምገማ ማዕከል" : "Review queue"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingPage.pageItems.map((course) => (
              <CourseCard key={course.id} course={course}>
                <Badge variant="blue">{isAmharic ? "በግምገማ ላይ" : "Pending review"}</Badge>
                <Link href="/courses">
                  <Button size="sm" variant="outline">
                    {isAmharic ? "ይዘት መርምር" : "Review Curriculum"}
                  </Button>
                </Link>
              </CourseCard>
            ))}
          </div>
          <Pagination
            page={pendingPage.page}
            totalPages={pendingPage.totalPages}
            onPageChange={pendingPage.setPage}
            totalItems={pending.length}
            pageSize={pendingPage.pageSize}
            onPageSizeChange={pendingPage.setPageSize}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </PageSection>
      ) : (
        <PageSection
          title={isAmharic ? "የግምገማ ማዕከል" : "Approval queue"}
          description={isAmharic ? "የማጽደቂያው ዝርዝር በአሁኑ ጊዜ ባዶ ነው።" : "The approval queue is currently empty."}
        >
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {isAmharic ? "ሁሉም የቀረቡ ኮርሶች ተገምግመዋል" : "All submissions reviewed"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {isAmharic
                ? "በአሁኑ ሰዓት ማጽደቅ የሚያስፈልገው አዲስ የቀረበ ኮርስ የለም።"
                : "There are no pending course submissions requiring approval right now."}
            </p>
          </div>
        </PageSection>
      )}

      {/* Recently Approved Section with Modern Pagination */}
      <PageSection
        title={isAmharic ? "በቅርቡ የጸደቁ ይዘቶች" : "Recently approved content"}
        description={
          isAmharic
            ? "ለህዝብ ህትመት እና ለስልጠና ዝግጁ የሆኑ የተመሰከረላቸው ኮርሶች።"
            : "Courses certified for public release and training facilitation."
        }
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              {isAmharic ? "ሙሉውን ቤተ-መጽሐፍት እይ" : "View full library"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {approvedPage.pageItems.map((course) => (
            <CourseCard key={course.id} course={course}>
              <Badge variant="green">{isAmharic ? "የጸደቀ" : "Approved"}</Badge>
            </CourseCard>
          ))}
        </div>
        <Pagination
          page={approvedPage.page}
          totalPages={approvedPage.totalPages}
          onPageChange={approvedPage.setPage}
          totalItems={approved.length}
          pageSize={approvedPage.pageSize}
          onPageSizeChange={approvedPage.setPageSize}
          pageSizeOptions={[6, 12, 24, 48]}
        />
      </PageSection>
    </PageShell>
  );
}