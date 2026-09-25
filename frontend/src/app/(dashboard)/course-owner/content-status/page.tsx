'use client';

import { useMemo, useState } from 'react';
import { Eye, Send } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { Table, Td } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge, CourseStatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { CourseDetailModal } from '@/components/features/courses/CourseDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';

export default function ContentStatusPage() {
  const { courses, submitForApproval } = useLms();
  const { t, tBilingual } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (status !== 'all' && course.status !== status) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        (course.rejectionReason ?? '').toLowerCase().includes(q)
      );
    });
  }, [courses, search, status]);
  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    filtered,
    5,
  );

  return (
    <PageShell
      role="course_owner"
      title={tBilingual('Content Status', 'የይዘት ሁኔታ')}
      description={tBilingual(
        'Monitor the approval pipeline and administrator rejection feedback.',
        'የማረጋገጫ ሂደቱን እና የአስተዳዳሪ ግብረመልስን ይከታተሉ።',
      )}
    >
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tBilingual('Search courses or feedback…', 'ኮርሶችን ወይም ግብረመልስን ይፈልጉ…')}
        selects={[
          {
            id: 'status',
            label: tBilingual('Status', 'ሁኔታ'),
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: tBilingual('All', 'ሁሉም') },
              { value: 'draft', label: tBilingual('Draft', 'ረቂቅ') },
              { value: 'under_review', label: tBilingual('Pending approval', 'ማረጋገጫ በመጠባበቅ ላይ') },
              { value: 'approved', label: tBilingual('Approved', 'የጸደቀ') },
              { value: 'rejected', label: tBilingual('Rejected', 'ውድቅ የተደረገ') },
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
          title={tBilingual('No courses', 'ምንም ኮርሶች የሉም')}
          description={tBilingual(
            'Nothing matches the current filters.',
            'ከአሁኑ ማጣሪያዎች ጋር የሚዛመድ ምንም ነገር የለም።',
          )}
        />
      ) : (
        <Table
          columns={[
            tBilingual('Course', 'ኮርስ'),
            tBilingual('Approval status', 'የማረጋገጫ ሁኔታ'),
            tBilingual('Publish status', 'የህትመት ሁኔታ'),
            tBilingual('Admin feedback', 'የአስተዳዳሪ ግብረመልስ'),
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
                  {course.published
                    ? tBilingual('Published', 'የታተመ')
                    : tBilingual('Not published', 'ያልታተመ')}
                </Badge>
              </Td>
              <Td className="max-w-[260px]">
                {course.status === 'rejected' && course.rejectionReason ? (
                  <span className="text-xs text-red-600">{course.rejectionReason}</span>
                ) : course.lastRejectionReason ? (
                  <span className="text-xs text-amber-700">
                    {tBilingual('Previous:', 'ቀዳሚ:')} {course.lastRejectionReason}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                    <Eye className="h-3.5 w-3.5" />
                    {tBilingual('Details', 'ዝርዝሮች')}
                  </Button>
                  {course.status === 'draft' || course.status === 'rejected' ? (
                    <Button size="sm" onClick={() => void submitForApproval(course.id)}>
                      <Send className="h-3.5 w-3.5" />
                      {course.status === 'rejected'
                        ? tBilingual('Resubmit', 'እንደገና አስገባ')
                        : tBilingual('Submit', 'አስገባ')}
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

      <CourseDetailModal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        courseId={selectedId ?? ''}
      />
    </PageShell>
  );
}
