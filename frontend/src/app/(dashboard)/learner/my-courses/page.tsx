'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Laptop } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { useCourseProgress } from '@/lib/api/useCourseProgress';
import { tr } from '@/constants/labels';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { CourseCard } from '@/components/features/courses/CourseCard';
import { EnrolledCourseActions } from '@/components/features/courses/EnrolledCourseActions';
import { isInPersonEnrollment } from '@/lib/session-mode';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { VenueDetailModal } from '@/components/features/sessions/in-person/VenueDetailModal';
import type { ApiVenue } from '@/lib/api/types';

export default function LearnerCoursesPage() {
  const router = useRouter();
  const { courses, lang, currentUser, ready, getEnrollmentForCourse } = useLms();
  const { t, tBilingual } = useTranslation();
  const me = currentUser?.id ?? '';
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress, loading } = useCourseProgress(enrolled.map((c) => c.id));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'ONLINE' | 'IN_PERSON'>('ALL');
  const [inspectVenue, setInspectVenue] = useState<{
    venue: ApiVenue;
    courseTitle: string;
    courseCode: string;
  } | null>(null);

  // Compute counts for filter tabs
  const { onlineCount, inPersonCount } = useMemo(() => {
    let on = 0;
    let inP = 0;
    for (const c of enrolled) {
      const enr = getEnrollmentForCourse(c.id);
      const isPerson = isInPersonEnrollment(c, enr);
      if (isPerson) {
        inP++;
      } else {
        on++;
      }
    }
    return { onlineCount: on, inPersonCount: inP };
  }, [enrolled, getEnrollmentForCourse]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = enrolled.filter((course) => {
      const enr = getEnrollmentForCourse(course.id);
      const isPerson = isInPersonEnrollment(course, enr);

      if (modeFilter === 'ONLINE' && isPerson) return false;
      if (modeFilter === 'IN_PERSON' && !isPerson) return false;

      const percent = progress[course.id]?.stats.overallPercent ?? 0;
      if (statusFilter === 'NOT_STARTED' && percent > 0) return false;
      if (statusFilter === 'IN_PROGRESS' && (percent === 0 || percent >= 100)) return false;
      if (statusFilter === 'COMPLETED' && percent < 100) return false;

      if (q) {
        const titleMatch =
          (course.title ?? '').toLowerCase().includes(q) ||
          (course.titleAm ?? '').toLowerCase().includes(q) ||
          (course.titleEn ?? '').toLowerCase().includes(q);
        const codeMatch = (course.code ?? '').toLowerCase().includes(q);
        const descMatch = (course.description ?? '').toLowerCase().includes(q);
        const catMatch = (course.category ?? '').toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });

    return list
      .map((course) => {
        const enr = getEnrollmentForCourse(course.id);
        const isPerson = isInPersonEnrollment(course, enr);
        return {
          course,
          enrollment: enr,
          isPerson,
          percent: progress[course.id]?.stats.overallPercent ?? 0,
          done: (progress[course.id]?.stats.overallPercent ?? 0) >= 100,
        };
      })
      .sort((a, b) => a.percent - b.percent);
  }, [enrolled, progress, modeFilter, statusFilter, search, getEnrollmentForCourse]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    rows,
    6,
  );

  return (
    <PageShell
      role="learner"
      title={tBilingual('My Courses', 'የእኔ ኮርሶች')}
      description={tBilingual(
        'Courses you are enrolled in across pure online and in-person regional classroom formats.',
        'በመስመር ላይ እና በአካል በሚሰጡ የስልጠና ዓይነቶች የተመዘገቡባቸው ኮርሶች።',
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        {/* Delivery Mode Tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setModeFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
              modeFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tBilingual('All Courses', 'ሁሉም ኮርሶች')} ({enrolled.length})
          </button>
          <button
            type="button"
            onClick={() => setModeFilter('ONLINE')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
              modeFilter === 'ONLINE'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>{tBilingual('Pure Online', 'በመስመር ላይ ብቻ')} ({onlineCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setModeFilter('IN_PERSON')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
              modeFilter === 'IN_PERSON'
                ? 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{tBilingual('In-Person Classroom', 'በአካል የሚሰጥ ስልጠና')} ({inPersonCount})</span>
          </button>
        </div>

        <LanguageToggle />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tBilingual('Search enrolled courses by title, code or topic…', 'የተመዘገቡባቸውን ኮርሶች በርዕስ፣ ኮድ ወይም ርዕሰ ጉዳይ ይፈልጉ…')}
        selects={[
          {
            id: 'status',
            label: tBilingual('Progress Status', 'የስልጠና ሁኔታ'),
            value: statusFilter,
            onChange: (val) => setStatusFilter(val as typeof statusFilter),
            options: [
              { value: 'ALL', label: tBilingual('All Statuses', 'ሁሉም ሁኔታዎች') },
              { value: 'NOT_STARTED', label: tBilingual('Not Started (0%)', 'ያልተጀመረ (0%)') },
              { value: 'IN_PROGRESS', label: tBilingual('In Progress (1-99%)', 'በሂደት ላይ (1-99%)') },
              { value: 'COMPLETED', label: tBilingual('Completed (100%)', 'የተጠናቀቀ (100%)') },
            ],
          },
        ]}
        onClear={() => {
          setSearch('');
          setStatusFilter('ALL');
          setModeFilter('ALL');
        }}
        hasActiveFilters={search !== '' || statusFilter !== 'ALL' || modeFilter !== 'ALL'}
      />

      {!ready ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton count={6} />
        </div>
      ) : enrolled.length === 0 ? (
        <EmptyState
          title={tBilingual('No enrolled courses', 'ምንም የተመዘገቡባቸው ኮርሶች የሉም')}
          description={tBilingual(
            'Browse the catalog to enroll in pure online or in-person Ministry training courses.',
            'በመስመር ላይ ወይም በአካል በሚሰጡ ስልጠናዎች ለመመዝገብ ካታሎጉን ያስሱ።',
          )}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={tBilingual('No matching courses found', 'ምንም የሚዛመድ ኮርስ አልተገኘም')}
          description={tBilingual(
            'Try adjusting your search keywords or filter criteria.',
            'የፍለጋ ቃላትን ወይም የማጣሪያ መስፈርቶችን ያስተካክሉ።',
          )}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map(({ course, enrollment, isPerson, percent, done }) => (
            <CourseCard
              key={course.id}
              course={course}
              showStatus={false}
              progress={loading ? 0 : percent}
              onClick={() => router.push(`/learner/courses/${course.id}/learn`)}
              deliveryMode={isPerson ? 'IN_PERSON_ONLY' : 'ONLINE_ONLY'}
              deliveryDetail={enrollment?.venue?.branch}
              extraBadge={
                done ? (
                  <Badge variant="green">{tBilingual('Completed', 'የተጠናቀቀ')}</Badge>
                ) : (
                  <Badge variant="blue">{percent}%</Badge>
                )
              }
            >
              <EnrolledCourseActions
                courseId={course.id}
                done={done}
                isPerson={isPerson}
                onViewVenue={
                  isPerson && enrollment?.venue
                    ? () =>
                        setInspectVenue({
                          venue: enrollment.venue!,
                          courseTitle: course.title,
                          courseCode: course.code,
                        })
                    : undefined
                }
              />
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

      {/* Classroom Venue Details Inspection Modal */}
      {inspectVenue ? (
        <VenueDetailModal
          open
          onClose={() => setInspectVenue(null)}
          venue={inspectVenue.venue}
          courseTitle={inspectVenue.courseTitle}
          courseCode={inspectVenue.courseCode}
        />
      ) : null}
    </PageShell>
  );
}
