'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookPlus, CheckCircle2, PlayCircle } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { useCourseProgress } from '@/lib/api/useCourseProgress';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { Button } from '@/components/ui/Button';
import { CourseCard } from '@/components/features/courses/CourseCard';
import { CatalogCourseModal } from '@/components/features/courses/CatalogCourseModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { COURSE_CATEGORIES } from '@/constants/course-categories';

export default function LearnerCatalogPage() {
  const { courses, currentUser, lang, enrollSelf } = useLms();
  const { t, tBilingual } = useTranslation();
  const me = currentUser?.id;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [flash, setFlash] = useState<string | null>(null);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  const enrolledCourseIds = useMemo(() => {
    return courses.filter((c) => (me ? c.enrolledLearnerIds.includes(me) : false)).map((c) => c.id);
  }, [courses, me]);
  const { progress } = useCourseProgress(enrolledCourseIds);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (!course.published && course.status !== 'published') return false;
      if (category !== 'all' && course.category !== category) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q)
      );
    });
  }, [courses, search, category]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    available,
    6,
  );

  const enroll = async (courseId: string) => {
    const result = await enrollSelf(courseId);
    setFlash(result.ok ? 'You are enrolled. Open My Courses to start learning.' : result.message);
  };

  return (
    <PageShell
      role="learner"
      title={tBilingual('Available Courses', 'የሚገኙ ኮርሶች')}
      description={tBilingual('Published courses you can enroll in.', 'ሊመዘገቡባቸው የሚችሉ የታተሙ ኮርሶች።')}
    >
      <div className="mb-4 flex justify-end">
        <LanguageToggle />
      </div>
      {flash ? (
        <div className="mb-4 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700">
          {flash}
        </div>
      ) : null}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tBilingual('Search available courses…', 'የሚገኙ ኮርሶችን ይፈልጉ…')}
        selects={[
          {
            id: 'category',
            label: tBilingual('Category', 'ምድብ'),
            value: category,
            onChange: setCategory,
            options: [
              { value: 'all', label: tBilingual('All Categories', 'ሁሉም ምድቦች') },
              ...COURSE_CATEGORIES.map((item) => ({ value: item, label: item })),
            ],
          },
        ]}
        onClear={() => {
          setSearch('');
          setCategory('all');
        }}
        hasActiveFilters={search !== '' || category !== 'all'}
      />

      {available.length === 0 ? (
        <EmptyState
          title={tBilingual('No published courses', 'ምንም የታተሙ ኮርሶች የሉም')}
          description={tBilingual(
            'Approved courses appear here after an administrator publishes them.',
            'የጸደቁ ኮርሶች በአስተዳዳሪ ከታተሙ በኋላ እዚህ ይታያሉ።',
          )}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((course) => {
            const enrolled = me ? course.enrolledLearnerIds.includes(me) : false;
            const percent = progress[course.id]?.stats.overallPercent ?? 0;
            const done = percent >= 100;

            return (
              <CourseCard
                key={course.id}
                course={course}
                showStatus={false}
                progress={enrolled ? percent : undefined}
                onClick={() => {
                  if (enrolled) return;
                  setOpenCourseId(course.id);
                }}
              >
                {enrolled ? (
                  <Link
                    href={`/learner/courses/${course.id}/learn`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {done ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {tBilingual('Completed', 'የተጠናቀቀ')}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline">
                        <PlayCircle className="h-3.5 w-3.5" />
                        {tBilingual('Continue', 'ቀጥል')}
                      </Button>
                    )}
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenCourseId(course.id);
                    }}
                  >
                    <BookPlus className="h-3.5 w-3.5" />
                    {tBilingual('Enroll', 'ተመዝገብ')}
                  </Button>
                )}
              </CourseCard>
            );
          })}
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

      {openCourseId ? (
        <CatalogCourseModal open onClose={() => setOpenCourseId(null)} courseId={openCourseId} />
      ) : null}
    </PageShell>
  );
}
