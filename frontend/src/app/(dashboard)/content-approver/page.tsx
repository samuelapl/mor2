'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock4,
  FileCheck2,
  FileText,
  Timer,
} from 'lucide-react';
import { useCourseStore } from '@/lib/stores/course-store';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { CourseCard } from '@/components/features/courses/CourseCard';
import { VerticalBarChart, BarChart } from '@/components/ui/charts';

export default function ContentApproverDashboardPage() {
  const courses = useCourseStore((s) => s.courses);
  const { lang, t } = useTranslation('dashboard');
  const isAmharic = lang === 'am';

  const pending = courses.filter((c) => c.status === 'under_review');
  const approved = courses.filter((c) => c.status === 'approved');
  const drafts = courses.filter((c) => c.status === 'draft');

  const pendingPage = usePagination(pending, 6);
  const approvedPage = usePagination(approved, 6);

  // Approval rate
  const totalReviewed = approved.length + pending.length;
  const approvalRate =
    totalReviewed > 0 ? Math.round((approved.length / totalReviewed) * 100) : 100;

  // Donut chart: Review Queue Distribution
  const queueSegments = [
    {
      label: t('courseOwnerDashboardPage.approved'),
      value: approved.length,
      color: '#10b981',
    },
    {
      label: t('contentApproverDashboardPage.pendingReview'),
      value: pending.length,
      color: '#6366f1',
    },
    {
      label: t('courseOwnerDashboardPage.draftStage'),
      value: drafts.length,
      color: '#94a3b8',
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
        subLabel: t('contentApproverDashboardPage.courses', { val }),
        color: '#4f46e5',
      }));
  }, [courses, isAmharic]);

  return (
    <PageShell
      role="content_approver"
      title={t('contentApproverDashboardPage.contentApproverDashboard')}
      description={
        t('contentApproverDashboardPage.reviewSubmittedCurriculaVerifyQualityAnd')
      }
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Timer}
          label={t('contentApproverDashboardPage.pendingReview2')}
          value={pending.length}
          hint={t('contentApproverDashboardPage.awaitingYourApproval')}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={t('contentApproverDashboardPage.approvedCourses')}
          value={approved.length}
          hint={t('contentApproverDashboardPage.inApprovedRepository')}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={BookOpen}
          label={t('contentApproverDashboardPage.totalCatalog')}
          value={courses.length}
          hint={t('contentApproverDashboardPage.allActiveCourses')}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={Clock4}
          label={t('contentApproverDashboardPage.approvalRate')}
          value={`${approvalRate}%`}
          hint={t('contentApproverDashboardPage.approvedVsSubmitted')}
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
                  {t('contentApproverDashboardPage.approvalQueueStatus')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('contentApproverDashboardPage.distributionOfCoursesAcrossReviewStages')}
                </p>
              </div>
              <Link href="/courses">
                <Button variant="outline" size="sm">
                  {t('contentApproverDashboardPage.reviewQueue')}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <VerticalBarChart
                items={queueSegments}
                totalValue={courses.length}
                unitLabel={t('trainingAdminDashboardPage.courses')}
                emptyText={t('contentApproverDashboardPage.noCoursesSubmittedInDatabase')}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {t('contentApproverDashboardPage.coursesAwaitingYourAction', { count: pending.length })}
            </span>
            <span className="font-semibold text-emerald-600">
              {t('contentApproverDashboardPage.approved', { count: approved.length })}
            </span>
          </div>
        </div>

        {/* Category Distribution Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {t('contentApproverDashboardPage.coursesByCategory')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('contentApproverDashboardPage.curriculumDistributionAcrossDomains')}
                </p>
              </div>
              <Badge variant="blue">
                {t('trainerDashboardPage.courses', { count: courses.length })}
              </Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={categoryBars}
                emptyText={t('contentApproverDashboardPage.noCategoryDataAvailable')}
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {t('contentApproverDashboardPage.categoriesRepresented', { count: categoryBars.length })}
            </span>
            <Link href="/courses" className="font-semibold text-indigo-600 hover:underline">
              {t('contentApproverDashboardPage.approvedLibrary')}
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section with Modern Pagination */}
      {pending.length > 0 ? (
        <PageSection
          title={t('contentApproverDashboardPage.pendingApprovals')}
          description={
            t('contentApproverDashboardPage.coursesSubmittedByCourseOwnersAwaiting')
          }
          action={
            <Link href="/courses">
              <Button variant="outline" size="sm">
                {t('contentApproverDashboardPage.reviewQueue')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingPage.pageItems.map((course) => (
              <CourseCard key={course.id} course={course}>
                <Badge variant="blue">{t('contentApproverDashboardPage.pendingReview3')}</Badge>
                <Link href="/courses">
                  <Button size="sm" variant="outline">
                    {t('contentApproverDashboardPage.reviewCurriculum')}
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
          title={t('contentApproverDashboardPage.approvalQueue')}
          description={
            t('contentApproverDashboardPage.theApprovalQueueIsCurrentlyEmpty')
          }
        >
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {t('contentApproverDashboardPage.allSubmissionsReviewed')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {t('contentApproverDashboardPage.thereAreNoPendingCourseSubmissions')}
            </p>
          </div>
        </PageSection>
      )}

      {/* Recently Approved Section with Modern Pagination */}
      <PageSection
        title={t('contentApproverDashboardPage.recentlyApprovedContent')}
        description={
          t('contentApproverDashboardPage.coursesCertifiedForPublicReleaseAnd')
        }
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              {t('contentApproverDashboardPage.viewFullLibrary')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {approvedPage.pageItems.map((course) => (
            <CourseCard key={course.id} course={course}>
              <Badge variant="green">{t('trainingAdminDashboardPage.approved')}</Badge>
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
