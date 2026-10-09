'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronDown, Lock, PlayCircle } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { useCourseProgress } from '@/lib/api/useCourseProgress';
import { tr } from '@/constants/labels';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { Table, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export default function ProgressPage() {
  const router = useRouter();
  const { courses, lang, currentUser } = useLms();
  const { t, tBilingual } = useTranslation();
  const me = currentUser?.id ?? '';
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress, loading } = useCourseProgress(enrolled.map((c) => c.id));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = enrolled
    .map((course) => ({
      course,
      data: progress[course.id],
      percent: progress[course.id]?.stats.overallPercent ?? 0,
    }))
    .sort((a, b) => a.percent - b.percent);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    rows,
    6,
  );

  return (
    <PageShell
      role="learner"
      title={tBilingual('My Progress', 'የእኔ ሂደት')}
      description={tBilingual(
        'Your completion progress across all enrolled courses.',
        'በሁሉም የተመዘገቡባቸው ኮርሶች የማጠናቀቂያ ሂደትዎ።',
      )}
    >
      {loading && rows.length === 0 ? (
        <div className="space-y-3">
          <CardSkeleton count={4} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={tBilingual('No courses', 'ምንም ኮርሶች የሉም')}
          description={tBilingual('Enrolled courses will appear here.', 'የተመዘገቡባቸው ኮርሶች እዚህ ይታያሉ።')}
        />
      ) : (
        <div className="space-y-3">
          {pageItems.map(({ course, data, percent }) => {
            const done = percent >= 100;
            const open = Boolean(expanded[course.id]);
            return (
              <div
                key={course.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [course.id]: !prev[course.id] }))
                  }
                  // Phones: title + chevron, then the bar, then status + action. One row from `sm`.
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/60 sm:flex-nowrap sm:px-5"
                >
                  <div className="order-1 min-w-0 flex-1 sm:order-none">
                    <p className="truncate font-medium text-slate-900">{course.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {data
                        ? `${data.stats.completedLessons}/${data.stats.totalLessons} lessons · ${data.stats.totalModules} modules`
                        : course.code}
                    </p>
                  </div>
                  <div className="order-3 w-full sm:order-none sm:w-40">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={percent} className="flex-1" />
                      <span className="w-10 text-right text-xs font-medium text-slate-600">
                        {data ? `${percent}%` : '…'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={done ? 'green' : 'blue'} className="order-4 sm:order-none">
                    {done ? tr(lang, 'completed') : tr(lang, 'inProgress')}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      'order-5 ml-auto sm:order-none sm:ml-0',
                      done &&
                        'border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/learner/courses/${course.id}/learn`);
                    }}
                  >
                    {done ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {tr(lang, 'completed')}
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        Continue
                      </>
                    )}
                  </Button>
                  <ChevronDown
                    className={cn(
                      'order-2 h-4 w-4 shrink-0 text-slate-400 transition-transform sm:order-none',
                      open ? 'rotate-180' : '',
                    )}
                  />
                </button>
                {open && data ? (
                  <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                    {data.modules.map((mod) => (
                      <div key={mod.moduleId}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 text-sm font-semibold text-slate-700">
                            {mod.unlocked === false ? (
                              <Lock className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                            ) : null}
                            {mod.title || mod.titleEn}
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              {mod.completedLessons}/{mod.totalLessons} lessons
                            </span>
                          </p>
                          <Badge variant={mod.moduleCompleted ? 'green' : 'outline'}>
                            {mod.moduleCompleted ? 'Complete' : `${mod.progressPercent}%`}
                          </Badge>
                        </div>
                        <Table columns={['Lesson', 'Status']}>
                          {mod.lessons.map((lesson) => (
                            <tr key={lesson.lessonId}>
                              <Td>
                                <span
                                  className={cn(
                                    'font-medium',
                                    lesson.unlocked === false ? 'text-slate-400' : 'text-slate-700',
                                  )}
                                >
                                  {lesson.title || lesson.titleEn}
                                </span>
                              </Td>
                              <Td>
                                <Badge
                                  variant={
                                    lesson.completed
                                      ? 'green'
                                      : lesson.unlocked === false
                                        ? 'slate'
                                        : 'outline'
                                  }
                                >
                                  {lesson.completed
                                    ? 'Completed'
                                    : lesson.unlocked === false
                                      ? 'Locked'
                                      : 'Not started'}
                                </Badge>
                              </Td>
                            </tr>
                          ))}
                        </Table>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
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
    </PageShell>
  );
}
