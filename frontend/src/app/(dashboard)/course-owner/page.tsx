'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  Globe2,
  Plus,
  UsersRound,
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

export default function CourseOwnerDashboardPage() {
  const courses = useCourseStore((s) => s.courses);
  const { lang, t } = useTranslation('dashboard');
  const isAmharic = lang === 'am';

  const owned = courses;
  const drafts = owned.filter((c) => c.status === 'draft');
  const review = owned.filter((c) => c.status === 'under_review');
  const approved = owned.filter((c) => c.status === 'approved');
  const published = owned.filter((c) => c.published);

  const totalLearners = useMemo(() => {
    return new Set(owned.flatMap((c) => c.enrolledLearnerIds)).size;
  }, [owned]);

  const ownedPage = usePagination(owned, 6);

  // Donut chart: Course Status Distribution
  const courseStatusSegments = [
    {
      label: t('trainingAdminDashboardPage.published'),
      value: published.length,
      color: '#10b981',
    },
    {
      label: t('trainingAdminDashboardPage.approvedUnpublished'),
      value: approved.filter((c) => !c.published).length,
      color: '#06b6d4',
    },
    {
      label: t('trainingAdminDashboardPage.underReview'),
      value: review.length,
      color: '#6366f1',
    },
    {
      label: t('trainingAdminDashboardPage.drafts'),
      value: drafts.length,
      color: '#f59e0b',
    },
  ];

  // Bar chart: Top Courses by Enrollment
  const topEnrolledBars = useMemo(() => {
    return [...owned]
      .sort((a, b) => b.enrolledLearnerIds.length - a.enrolledLearnerIds.length)
      .slice(0, 5)
      .map((c) => ({
        label: isAmharic && (c as any).titleAm ? (c as any).titleAm : c.title,
        value: c.enrolledLearnerIds.length,
        subLabel: t('trainerDashboardPage.learners', { count: c.enrolledLearnerIds.length }),
        color: '#6366f1',
      }));
  }, [owned, isAmharic]);

  return (
    <PageShell
      role="course_owner"
      title={t('courseOwnerDashboardPage.courseOwnerDashboard')}
      description={
        t('courseOwnerDashboardPage.designCurriculumSubmitCoursesForContent')
      }
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label={t('trainingAdminDashboardPage.totalCourses')}
          value={owned.length}
          hint={t('courseOwnerDashboardPage.createdByYourTeam')}
        />
        <StatCard
          icon={ClipboardList}
          label={t('courseOwnerDashboardPage.inReview')}
          value={review.length}
          hint={t('courseOwnerDashboardPage.pendingReviewerApproval')}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={t('courseOwnerDashboardPage.approved')}
          value={approved.length}
          hint={t('courseOwnerDashboardPage.published', { count: published.length })}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersRound}
          label={t('trainerDashboardPage.totalLearners')}
          value={totalLearners}
          hint={t('courseOwnerDashboardPage.acrossYourCurriculum')}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Action Banner */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-slate-50 p-5 shadow-soft">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900">
            {t('courseOwnerDashboardPage.designPublishProfessionalCourses')}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('courseOwnerDashboardPage.buildRichModulesLessonsAssessmentsAnd')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/course-owner/create-course">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t('courseOwnerDashboardPage.createNewCourse')}
            </Button>
          </Link>
          <Link href="/course-owner/content-status">
            <Button variant="outline" size="sm">
              {t('courseOwnerDashboardPage.reviewPipeline')}
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
                  {t('courseOwnerDashboardPage.courseLifecycleDistribution')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('courseOwnerDashboardPage.statusOfCoursesYouCreated')}
                </p>
              </div>
              <Link href="/course-owner/content-status">
                <Button variant="outline" size="sm">
                  {t('trainerDashboardPage.status')}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <VerticalBarChart
                items={courseStatusSegments}
                totalValue={owned.length}
                unitLabel={t('trainingAdminDashboardPage.courses')}
                emptyText={t('courseOwnerDashboardPage.noCoursesCreatedInDatabase')}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{t('courseOwnerDashboardPage.drafts', { count: drafts.length })}</span>
            <span className="font-semibold text-emerald-600">
              {t('courseOwnerDashboardPage.approvedForRelease', { count: approved.length })}
            </span>
          </div>
        </div>

        {/* Enrollment by Course Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {t('courseOwnerDashboardPage.topCoursesByEnrollment')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('courseOwnerDashboardPage.studentEnrollmentNumbersPerCourse')}
                </p>
              </div>
              <Badge variant="blue">
                {t('courseOwnerDashboardPage.totalStudents', { totalLearners })}
              </Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={topEnrolledBars}
                emptyText={t('courseOwnerDashboardPage.noEnrollmentDataAvailable')}
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {t('courseOwnerDashboardPage.totalCoursesCreated', { count: owned.length })}
            </span>
            <Link href="/courses" className="font-semibold text-indigo-600 hover:underline">
              {t('courseOwnerDashboardPage.viewAllCourses')}
            </Link>
          </div>
        </div>
      </div>

      {/* My Courses Catalog Section with Modern Pagination */}
      <PageSection
        title={t('learnerCoursesPage.myCourses')}
        description={
          t('courseOwnerDashboardPage.yourCourseCatalogWithEditingAccess')
        }
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              {t('courseOwnerDashboardPage.viewAllCourses2')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ownedPage.pageItems.map((course) => (
            <CourseCard key={course.id} course={course}>
              <Link href={`/courses`}>
                <Button size="sm" variant="outline">
                  {t('courseOwnerDashboardPage.manageCurriculum')}
                </Button>
              </Link>
              {course.status === 'under_review' ? (
                <Badge variant="blue">{t('courseOwnerDashboardPage.underReview')}</Badge>
              ) : course.status === 'draft' ? (
                <Badge variant="amber">{t('courseOwnerDashboardPage.draft')}</Badge>
              ) : (
                <Badge variant="green">{t('trainingAdminDashboardPage.approved')}</Badge>
              )}
            </CourseCard>
          ))}
        </div>
        <Pagination
          page={ownedPage.page}
          totalPages={ownedPage.totalPages}
          onPageChange={ownedPage.setPage}
          totalItems={owned.length}
          pageSize={ownedPage.pageSize}
          onPageSizeChange={ownedPage.setPageSize}
          pageSizeOptions={[6, 12, 24, 48]}
        />
      </PageSection>

      {/* Catalog Pipeline Summary */}
      <PageSection
        title={t('courseOwnerDashboardPage.reviewPublishingPipeline')}
        description={
          t('courseOwnerDashboardPage.currentStandingOfCoursesInThe')
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(['draft', 'under_review', 'approved'] as const).map((status) => {
            const items = owned.filter((c) => c.status === status);
            const labels: Record<string, string> = {
              draft: t('courseOwnerDashboardPage.draftStage'),
              under_review: t('trainingAdminDashboardPage.underReview'),
              approved: t('courseOwnerDashboardPage.approvedReady'),
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
                      status === 'approved' ? 'green' : status === 'under_review' ? 'blue' : 'amber'
                    }
                  >
                    {t(items.length === 1 ? 'courseOwnerDashboardPage.courseCountOne' : 'courseOwnerDashboardPage.courseCountOther', { count: items.length })}
                  </Badge>
                </div>
                {items.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {items.slice(0, 3).map((c) => (
                      <li key={c.id} className="truncate font-medium">
                        • {isAmharic && (c as any).titleAm ? (c as any).titleAm : c.title}
                      </li>
                    ))}
                    {items.length > 3 && (
                      <li className="text-[11px] text-slate-400 italic">
                        +{items.length - 3} {t('courseOwnerDashboardPage.more')}
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    {t('courseOwnerDashboardPage.noCoursesInThisStage')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </PageSection>
    </PageShell>
  );
}
