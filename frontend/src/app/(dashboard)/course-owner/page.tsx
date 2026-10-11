'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { useCourseStore } from '@/lib/stores/course-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { LifecycleBarChart, RankedBarChart, type ChartDatum } from './OwnerCharts';

const cardClass = 'rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft';

export default function CourseOwnerDashboardPage() {
  const courses = useCourseStore((s) => s.courses);
  const { lang, t } = useTranslation('dashboard');
  const isAmharic = lang === 'am';

  const owned = courses;
  const courseTitle = (c: (typeof owned)[number]) =>
    isAmharic && (c as any).titleAm ? (c as any).titleAm : c.title;

  const totalLearners = useMemo(
    () => new Set(owned.flatMap((c) => c.enrolledLearnerIds)).size,
    [owned],
  );

  // Lifecycle stages in pipeline order; each course sits in exactly one.
  const lifecycle: ChartDatum[] = [
    {
      id: 'draft',
      label: t('trainingAdminDashboardPage.drafts'),
      value: owned.filter((c) => c.status === 'draft').length,
    },
    {
      id: 'review',
      label: t('trainingAdminDashboardPage.underReview'),
      value: owned.filter((c) => c.status === 'under_review').length,
    },
    {
      id: 'approved',
      label: t('trainingAdminDashboardPage.approvedUnpublished'),
      value: owned.filter((c) => c.status === 'approved' && !c.published).length,
    },
    {
      id: 'published',
      label: t('trainingAdminDashboardPage.published'),
      value: owned.filter((c) => c.published).length,
    },
  ];

  const topEnrolled: ChartDatum[] = useMemo(
    () =>
      [...owned]
        .filter((c) => c.enrolledLearnerIds.length > 0)
        .sort((a, b) => b.enrolledLearnerIds.length - a.enrolledLearnerIds.length)
        .slice(0, 6)
        .map((c) => ({ id: c.id, label: courseTitle(c), value: c.enrolledLearnerIds.length })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [owned, isAmharic],
  );

  return (
    <PageShell
      role="course_owner"
      title={t('courseOwnerDashboardPage.courseOwnerDashboard')}
      description={t('courseOwnerDashboardPage.designCurriculumSubmitCoursesForContent')}
      actions={
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
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Course lifecycle: the headline chart */}
        <section className={`${cardClass} lg:col-span-3`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {t('courseOwnerDashboardPage.courseLifecycleDistribution')}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('courseOwnerDashboardPage.statusOfCoursesYouCreated')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold leading-none tabular-nums text-foreground">
                {owned.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('trainingAdminDashboardPage.totalCourses')}
              </p>
            </div>
          </div>

          <div className="mt-8">
            {owned.length > 0 ? (
              <LifecycleBarChart
                data={lifecycle}
                unitLabel={t('trainingAdminDashboardPage.courses').toLowerCase()}
              />
            ) : (
              <p className="py-16 text-center text-sm text-subtle-foreground">
                {t('courseOwnerDashboardPage.noCoursesCreatedInDatabase')}
              </p>
            )}
          </div>
        </section>

        {/* Top courses by enrollment */}
        <section className={`${cardClass} flex flex-col lg:col-span-2`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {t('courseOwnerDashboardPage.topCoursesByEnrollment')}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('courseOwnerDashboardPage.studentEnrollmentNumbersPerCourse')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold leading-none tabular-nums text-foreground">
                {totalLearners}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('trainerDashboardPage.totalLearners')}
              </p>
            </div>
          </div>

          <div className="mt-8 flex-1">
            {topEnrolled.length > 0 ? (
              <RankedBarChart
                data={topEnrolled}
                valueLabel={(count) => t('trainerDashboardPage.learners', { count })}
              />
            ) : (
              <p className="py-16 text-center text-sm text-subtle-foreground">
                {t('courseOwnerDashboardPage.noEnrollmentDataAvailable')}
              </p>
            )}
          </div>

          <Link
            href="/courses"
            className="mt-6 inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:underline"
          >
            {t('courseOwnerDashboardPage.viewAllCourses').replace(/\s*→$/, '')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </PageShell>
  );
}
