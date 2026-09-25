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
import { useLms } from '@/lib/lms-store';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { CourseCard } from '@/components/features/courses/CourseCard';
import { DonutChart, BarChart } from '@/components/ui/charts';

export default function CourseOwnerDashboardPage() {
  const { courses } = useLms();
  const { lang } = useTranslation();
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
      label: isAmharic ? 'የታተሙ' : 'Published',
      value: published.length,
      color: '#10b981',
    },
    {
      label: isAmharic ? 'የጸደቁ (ያልታተሙ)' : 'Approved (Unpublished)',
      value: approved.filter((c) => !c.published).length,
      color: '#06b6d4',
    },
    {
      label: isAmharic ? 'በግምገማ ላይ' : 'Under Review',
      value: review.length,
      color: '#6366f1',
    },
    {
      label: isAmharic ? 'ረቂቆች' : 'Drafts',
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
        subLabel: isAmharic
          ? `${c.enrolledLearnerIds.length} ሰልጣኞች`
          : `${c.enrolledLearnerIds.length} learners`,
        color: '#6366f1',
      }));
  }, [owned, isAmharic]);

  return (
    <PageShell
      role="course_owner"
      title={isAmharic ? 'የኮርስ ባለቤት ዳሽቦርድ' : 'Course Owner Dashboard'}
      description={
        isAmharic
          ? 'ስርዓተ-ትምህርቶችን ያዘጋጁ፣ ለግምገማ ያቅርቡ፣ የማጽደቅ ደረጃዎችን ይከታተሉ እና የተማሪዎችን ምዝገባ ይቆጣጠሩ።'
          : 'Design curriculum, submit courses for content review, track approval milestones, and monitor student enrollment.'
      }
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label={isAmharic ? 'ጠቅላላ ኮርሶች' : 'Total courses'}
          value={owned.length}
          hint={isAmharic ? 'በእርስዎ ቡድን የተዘጋጁ' : 'Created by your team'}
        />
        <StatCard
          icon={ClipboardList}
          label={isAmharic ? 'በግምገማ ላይ' : 'In review'}
          value={review.length}
          hint={isAmharic ? 'የአጽዳቂ ግምገማ የሚጠብቁ' : 'Pending reviewer approval'}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={isAmharic ? 'የጸደቁ' : 'Approved'}
          value={approved.length}
          hint={isAmharic ? `${published.length} የታተሙ` : `${published.length} published`}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersRound}
          label={isAmharic ? 'ጠቅላላ ሰልጣኞች' : 'Total learners'}
          value={totalLearners}
          hint={isAmharic ? 'በስርዓተ-ትምህርትዎ ውስጥ' : 'Across your curriculum'}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Action Banner */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-slate-50 p-5 shadow-soft">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900">
            {isAmharic ? 'ሙያዊ ስልጠናዎችን ያዘጋጁ እና ያትሙ' : 'Design & Publish Professional Courses'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {isAmharic
              ? 'ምዕራፎችን፣ ትምህርቶችን፣ ምዘናዎችን ያዋቅሩ እና ለይዘት አጽዳቂዎች ያቅርቡ።'
              : 'Build rich modules, lessons, assessments, and submit to content approvers.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/course-owner/create-course">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {isAmharic ? 'አዲስ ኮርስ ፍጠር' : 'Create New Course'}
            </Button>
          </Link>
          <Link href="/course-owner/content-status">
            <Button variant="outline" size="sm">
              {isAmharic ? 'የማጽደቅ ሂደት እይ' : 'Review Pipeline'}
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
                  {isAmharic ? 'የኮርሶች የሂደት ሁኔታ' : 'Course Lifecycle Distribution'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAmharic ? 'ያዘጋጇቸው ኮርሶች ወቅታዊ ደረጃ' : 'Status of courses you created'}
                </p>
              </div>
              <Link href="/course-owner/content-status">
                <Button variant="outline" size="sm">
                  {isAmharic ? 'ሁኔታ' : 'Status'}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <DonutChart
                segments={courseStatusSegments}
                centerLabel={isAmharic ? 'ኮርሶች' : 'Courses'}
                centerValue={owned.length}
                emptyText={isAmharic ? 'ምንም የተዘጋጀ ኮርስ የለም' : 'No courses created'}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{isAmharic ? `ረቂቆች: ${drafts.length}` : `Drafts: ${drafts.length}`}</span>
            <span className="font-semibold text-emerald-600">
              {isAmharic
                ? `${approved.length} ለህትመት ዝግጁ የሆኑ`
                : `${approved.length} approved for release`}
            </span>
          </div>
        </div>

        {/* Enrollment by Course Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {isAmharic ? 'ብዙ ተማሪ የተመዘገበባቸው ኮርሶች' : 'Top Courses by Enrollment'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAmharic
                    ? 'በእያንዳንዱ ኮርስ የተመዘገቡ ተማሪዎች ብዛት'
                    : 'Student enrollment numbers per course'}
                </p>
              </div>
              <Badge variant="blue">
                {isAmharic ? `ጠቅላላ ${totalLearners} ሰልጣኞች` : `${totalLearners} Total Students`}
              </Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={topEnrolledBars}
                emptyText={isAmharic ? 'ምንም የምዝገባ መረጃ የለም።' : 'No enrollment data available.'}
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {isAmharic
                ? `ጠቅላላ የተዘጋጁ ኮርሶች: ${owned.length}`
                : `Total courses created: ${owned.length}`}
            </span>
            <Link href="/courses" className="font-semibold text-indigo-600 hover:underline">
              {isAmharic ? 'ሁሉንም ኮርሶች እይ →' : 'View all courses →'}
            </Link>
          </div>
        </div>
      </div>

      {/* My Courses Catalog Section with Modern Pagination */}
      <PageSection
        title={isAmharic ? 'የእኔ ኮርሶች' : 'My Courses'}
        description={
          isAmharic
            ? 'የእርስዎ የስልጠና ካታሎግ ከአርትዖት እና የማጽደቅ ሁኔታ ጋር።'
            : 'Your course catalog with editing access and approval status.'
        }
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              {isAmharic ? 'ሁሉንም ኮርሶች እይ' : 'View all courses'}
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
                  {isAmharic ? 'ስርዓተ-ትምህርት አስተዳድር' : 'Manage Curriculum'}
                </Button>
              </Link>
              {course.status === 'under_review' ? (
                <Badge variant="blue">{isAmharic ? 'በግምገማ ላይ' : 'Under review'}</Badge>
              ) : course.status === 'draft' ? (
                <Badge variant="amber">{isAmharic ? 'ረቂቅ' : 'Draft'}</Badge>
              ) : (
                <Badge variant="green">{isAmharic ? 'የጸደቀ' : 'Approved'}</Badge>
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
        title={isAmharic ? 'የግምገማ እና የህትመት ሂደት' : 'Review & Publishing Pipeline'}
        description={
          isAmharic
            ? 'በግምገማ ሂደት ውስጥ ያሉ ኮርሶች ወቅታዊ ደረጃ።'
            : 'Current standing of courses in the review process.'
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {(['draft', 'under_review', 'approved'] as const).map((status) => {
            const items = owned.filter((c) => c.status === status);
            const labels: Record<string, string> = {
              draft: isAmharic ? 'የረቂቅ ደረጃ' : 'Draft Stage',
              under_review: isAmharic ? 'በግምገማ ላይ' : 'Under Review',
              approved: isAmharic ? 'የጸደቀ እና ዝግጁ' : 'Approved & Ready',
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
                    {items.length} {isAmharic ? 'ኮርሶች' : items.length === 1 ? 'course' : 'courses'}
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
                        +{items.length - 3} {isAmharic ? 'ተጨማሪ' : 'more'}
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    {isAmharic ? 'በዚህ ደረጃ ውስጥ ምንም ኮርስ የለም።' : 'No courses in this stage.'}
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
