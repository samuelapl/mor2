'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Eye, FilePenLine, PackageOpen, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCourseStore } from '@/lib/stores/course-store';
import { usePermissions } from '@/lib/usePermissions';
import { usePagination } from '@/lib/usePagination';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { CourseCard } from '@/components/features/courses/CourseCard';
import { CourseCreationWizard } from '@/components/features/courses/CourseCreationWizard';
import { ScormUpload } from '@/components/features/courses/ScormUpload';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/ui/FilterBar';
import { COURSE_CATEGORIES } from '@/constants/course-categories';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

import { useTranslation } from '@/lib/i18n/useTranslation';

type StatusTab = 'all' | 'draft' | 'under_review' | 'approved' | 'published' | 'archived';

export default function CoursesPage() {
  const courses = useCourseStore((s) => s.courses);
  const currentUser = useAuthStore((s) => s.currentUser);
  const ready = useAuthStore((s) => s.ready);
  const { can } = usePermissions();
  const { lang, t } = useTranslation('courses');
  const isAmharic = lang === 'am';
  const canCreate = can('course.create');
  const canViewAssignedOnly = can('course.view.assigned') && !can('course.view.all');

  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'scorm' | null>(null);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [category, setCategory] = useState('all');

  const counts = useMemo(() => {
    return {
      all: courses.length,
      draft: courses.filter((c) => c.status === 'draft').length,
      under_review: courses.filter((c) => c.status === 'under_review').length,
      approved: courses.filter((c) => c.status === 'approved' && !c.published).length,
      published: courses.filter((c) => c.published || c.status === 'published').length,
      archived: courses.filter((c) => c.status === 'archived').length,
    };
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (statusTab === 'draft' && course.status !== 'draft') return false;
      if (statusTab === 'under_review' && course.status !== 'under_review') return false;
      if (statusTab === 'approved' && (course.status !== 'approved' || course.published)) return false;
      if (statusTab === 'published' && !course.published && course.status !== 'published') return false;
      if (statusTab === 'archived' && course.status !== 'archived') return false;

      if (category !== 'all' && course.category !== category) return false;

      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) || course.code.toLowerCase().includes(q) || (course.rejectionReason ?? '').toLowerCase().includes(q)
      );
    });
  }, [courses, search, statusTab, category]);

  const { page, totalPages, setPage, pageItems, totalItems, pageSize, setPageSize } = usePagination(filtered, 6);

  const tabs: { id: StatusTab; label: string; count: number }[] = [
    { id: 'all', label: t('contentStatusPage.all'), count: counts.all },
    { id: 'draft', label: t('contentStatusPage.draft'), count: counts.draft },
    {
      id: 'under_review',
      label: t('coursesPage.pendingApproval'),
      count: counts.under_review,
    },
    { id: 'approved', label: t('contentStatusPage.approved'), count: counts.approved },
    { id: 'published', label: t('contentStatusPage.published'), count: counts.published },
    { id: 'archived', label: t('coursesPage.archived'), count: counts.archived },
  ];

  const emptyStateCopy = canViewAssignedOnly
    ? {
        title: t('coursesPage.noCoursesAssignedToYouYet'),
        description: t('coursesPage.onceATrainingAdministratorAssignsYou'),
      }
    : canCreate
      ? {
          title: t('coursesPage.noCoursesYet'),
          description: t('coursesPage.createOneToGetStartedOr'),
        }
      : {
          title: t('coursesPage.noCoursesMatch'),
          description: t('coursesPage.adjustTheFiltersAboveToSee'),
        };

  return (
    <PageShell
      role={currentUser?.role ?? 'course_owner'}
      title={t('coursesPage.courses')}
      description={
        t('coursesPage.browseReviewAndManageCoursesWhat')
      }
      actions={
        canCreate ? (
          <Button onClick={() => setCreateOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4" />
            {t('coursesPage.createCourse')}
          </Button>
        ) : undefined
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-1.5 border-b border-border/80 pb-3">
        {tabs.map((tab) => {
          const active = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusTab(tab.id);
                setPage(1);
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150',
                active ? 'bg-foreground text-background shadow-sm' : 'text-secondary-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  active ? 'bg-foreground text-background' : 'bg-border/70 text-secondary-foreground',
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses…"
        selects={[
          {
            id: 'category',
            label: 'Category',
            value: category,
            onChange: setCategory,
            options: [{ value: 'all', label: 'All Categories' }, ...COURSE_CATEGORIES.map((item) => ({ value: item, label: item }))],
          },
        ]}
        onClear={() => {
          setSearch('');
          setStatusTab('all');
          setCategory('all');
        }}
        hasActiveFilters={search !== '' || statusTab !== 'all' || category !== 'all'}
      />

      {!ready ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton count={6} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={emptyStateCopy.title} description={emptyStateCopy.description}>
          {canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          ) : undefined}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
            >
              {course.status === 'rejected' && course.rejectionReason ? (
                <div className="w-full rounded-xl border border-danger/20 bg-danger-soft/80 px-3 py-2 text-xs text-danger">
                  <p className="font-semibold">Admin feedback</p>
                  <p className="mt-0.5">{course.rejectionReason}</p>
                </div>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => router.push(`/courses/${course.id}`)}>
                <Eye className="h-3.5 w-3.5" />
                Details
              </Button>
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

      <WorkspaceDetailOverlay
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreationMode(null);
        }}
        title={creationMode === 'manual' ? 'Create New Course' : 'Create Course'}
        subtitle={
          creationMode === 'manual'
            ? 'Add course details, build your curriculum, attach content, and set up the final assessment.'
            : creationMode === 'scorm'
              ? 'Import a ready-made SCORM package as a course.'
              : "Choose how you'd like to build this course."
        }
      >
        <div className="w-full">
          {/* ── Step 1: Options picker (no mode selected yet) ── */}
          {!creationMode && (
            <div className="grid w-full gap-4 sm:grid-cols-2">
              {(
                [
                  {
                    key: 'manual' as const,
                    icon: FilePenLine,
                    title: 'Create manually',
                    description: 'Build the course step by step — details, curriculum, materials and a final assessment.',
                  },
                  {
                    key: 'scorm' as const,
                    icon: PackageOpen,
                    title: 'Upload SCORM',
                    description: 'Import a ready-made SCORM package as a course.',
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setCreationMode(option.key)}
                  className={cn(
                    'group flex flex-col items-start rounded-2xl border border-border/80 bg-card p-6 text-left shadow-soft ring-super-soft transition-all duration-200',
                    'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift',
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 transition-transform duration-200 group-hover:scale-110">
                    <option.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-semibold text-foreground">{option.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2a: Manual creation wizard ── */}
          {creationMode === 'manual' && (
            <CourseCreationWizard
              onDone={() => {
                setCreateOpen(false);
                setCreationMode(null);
                toast.success('Course created successfully!');
              }}
              onCancel={() => setCreationMode(null)}
            />
          )}

          {/* ── Step 2b: SCORM upload ── */}
          {creationMode === 'scorm' && (
            <ScormUpload
              onDone={(courseId) => {
                setCreateOpen(false);
                setCreationMode(null);
                toast.success('Course created from SCORM package!');
                if (courseId) router.push(`/courses/${courseId}?edit=1`);
              }}
              onCancel={() => setCreationMode(null)}
            />
          )}
        </div>
      </WorkspaceDetailOverlay>
    </PageShell>
  );
}
