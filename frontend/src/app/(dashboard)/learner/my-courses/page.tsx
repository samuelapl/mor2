'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Award, CheckCircle2, PlayCircle } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { useCourseProgress } from '@/lib/api/useCourseProgress';
import { tr } from '@/constants/labels';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { CourseCard } from '@/components/features/courses/CourseCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';

export default function LearnerCoursesPage() {
  const { courses, lang, currentUser, ready } = useLms();
  const { t, tBilingual } = useTranslation();
  const me = currentUser?.id ?? '';
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress, loading } = useCourseProgress(enrolled.map((c) => c.id));

  const rows = useMemo(
    () =>
      enrolled
        .map((course) => ({
          course,
          percent: progress[course.id]?.stats.overallPercent ?? 0,
          done: (progress[course.id]?.stats.overallPercent ?? 0) >= 100,
        }))
        .sort((a, b) => a.percent - b.percent),
    [enrolled, progress],
  );

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    rows,
    6,
  );

  return (
    <PageShell
      role="learner"
      title={tBilingual('My Courses', 'የእኔ ኮርሶች')}
      description={tBilingual('Courses you are enrolled in.', 'የተመዘገቡባቸው ኮርሶች።')}
    >
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>

      {!ready ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton count={6} />
        </div>
      ) : enrolled.length === 0 ? (
        <EmptyState
          title={tBilingual('No enrolled courses', 'ምንም የተመዘገቡባቸው ኮርሶች የሉም')}
          description={tBilingual(
            'Browse the catalog to enroll in courses.',
            'በኮርሶች ለመመዝገብ ካታሎጉን ያስሱ።',
          )}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map(({ course, percent, done }) => (
            <CourseCard
              key={course.id}
              course={course}
              showStatus={false}
              progress={loading ? 0 : percent}
              extraBadge={
                done ? (
                  <Badge variant="green">{tBilingual('Completed', 'የተጠናቀቀ')}</Badge>
                ) : (
                  <Badge variant="blue">{percent}%</Badge>
                )
              }
            >
              <div className="flex flex-wrap gap-2">
                {done ? (
                  <Link href={`/learner/courses/${course.id}/learn`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {tBilingual('Completed', 'የተጠናቀቀ')}
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/learner/courses/${course.id}/learn`}>
                    <Button size="sm">
                      <PlayCircle className="h-3.5 w-3.5" />
                      {tBilingual('Continue', 'ቀጥል')}
                    </Button>
                  </Link>
                )}
                {done ? (
                  <Link href="/learner/certificates">
                    <Button size="sm" variant="outline">
                      <Award className="h-3.5 w-3.5" />
                      {tBilingual('Certificates', 'የምስክር ወረቀቶች')}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </CourseCard>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[6, 12, 24, 48]}
      />
    </PageShell>
  );
}
