'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Eye, Send } from 'lucide-react';
import { useCourseStore } from '@/lib/stores/course-store';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { Table, Td } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge, CourseStatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';

export default function ContentStatusPage() {
  const courses = useCourseStore((s) => s.courses);
  const submitForApproval = useCourseStore((s) => s.submitForApproval);
  const { t } = useTranslation('courses');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (status !== 'all' && course.status !== status) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) || course.code.toLowerCase().includes(q) || (course.rejectionReason ?? '').toLowerCase().includes(q)
      );
    });
  }, [courses, search, status]);
  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(filtered, 5);

  return (
    <PageShell
      role="course_owner"
      title={t('contentStatusPage.contentStatus')}
      description={t('contentStatusPage.monitorTheApprovalPipelineAndAdministrat')}
    >
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('contentStatusPage.searchCoursesOrFeedback')}
        selects={[
          {
            id: 'status',
            label: t('sessionPlanStage.status'),
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: t('contentStatusPage.all') },
              { value: 'draft', label: t('contentStatusPage.draft') },
              { value: 'under_review', label: t('contentStatusPage.pendingApproval') },
              { value: 'approved', label: t('contentStatusPage.approved') },
              { value: 'rejected', label: t('contentStatusPage.rejected') },
            ],
          },
        ]}
        onClear={() => {
          setSearch('');
          setStatus('all');
        }}
        hasActiveFilters={search !== '' || status !== 'all'}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={t('contentStatusPage.noCourses')}
          description={t('contentStatusPage.nothingMatchesTheCurrentFilters')}
        />
      ) : (
        <Table
          columns={[
            t('contentStatusPage.course'),
            t('contentStatusPage.approvalStatus'),
            t('contentStatusPage.publishStatus'),
            t('contentStatusPage.adminFeedback'),
            '',
          ]}
        >
          {pageItems.map((course) => (
            <tr key={course.id}>
              <Td>
                <span className="font-medium text-slate-900">{course.title}</span>
                <span className="block text-[11px] text-slate-400">
                  {course.code} · {course.category}
                </span>
              </Td>
              <Td>
                <CourseStatusBadge status={course.status} />
              </Td>
              <Td>
                <Badge variant={course.published ? 'green' : 'slate'}>
                  {course.published ? t('contentStatusPage.published') : t('contentStatusPage.notPublished')}
                </Badge>
              </Td>
              <Td className="max-w-[260px]">
                {course.status === 'rejected' && course.rejectionReason ? (
                  <span className="text-xs text-red-600">{course.rejectionReason}</span>
                ) : course.lastRejectionReason ? (
                  <span className="text-xs text-amber-700">
                    {t('contentStatusPage.previous')} {course.lastRejectionReason}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/courses/${course.id}`)}>
                    <Eye className="h-3.5 w-3.5" />
                    {t('contentStatusPage.details')}
                  </Button>
                  {course.status === 'draft' || course.status === 'rejected' ? (
                    <Button size="sm" onClick={() => void submitForApproval(course.id)}>
                      <Send className="h-3.5 w-3.5" />
                      {course.status === 'rejected' ? t('contentStatusPage.resubmit') : t('contentStatusPage.submit')}
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
      />
    </PageShell>
  );
}
