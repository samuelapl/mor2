'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilePenLine, PackageOpen } from 'lucide-react';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import PageShell from '@/components/shared/PageShell';
import { CourseCreationWizard } from '@/components/features/courses/CourseCreationWizard';
import { ScormUpload } from '@/components/features/courses/ScormUpload';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLms } from '@/lib/lms-store';
import { cn } from '@/lib/utils';

type CreationMode = 'manual' | 'scorm' | null;

function CreateCourseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const { courses } = useLms();
  const { tBilingual } = useTranslation();

  const editingCourse = useMemo(() => {
    if (!courseIdParam) return null;
    return courses.find((c) => c.id === courseIdParam) ?? null;
  }, [courseIdParam, courses]);

  const [mode, setMode] = useState<CreationMode>(() => (courseIdParam ? 'manual' : null));

  useEffect(() => {
    if (courseIdParam && mode !== 'manual') {
      setMode('manual');
    }
  }, [courseIdParam, mode]);

  const handleCancelManual = () => {
    setMode(null);
    if (courseIdParam && typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('courseId');
      window.history.replaceState(null, '', url.pathname);
    }
  };

  return (
    <>
      <PageShell
        role="course_owner"
        title={tBilingual('Create New Course', 'አዲስ ኮርስ ፍጠር')}
        description={tBilingual(
          "Choose how you'd like to build this course.",
          'ይህንን ኮርስ እንዴት መገንባት እንደሚፈልጉ ይምረጡ።',
        )}
      >
        <div className="grid w-full gap-4 sm:grid-cols-2">
          {[
            {
              key: 'manual' as const,
              icon: FilePenLine,
              title: tBilingual('Create manually', 'በእጅ ፍጠር'),
              description: tBilingual(
                'Build the course step by step — details, curriculum, materials and a final assessment.',
                'ኮርሱን ደረጃ በደረጃ ይገንቡ — ዝርዝሮች፣ ሥርዓተ-ትምህርት፣ የማስተማሪያ ግብዓቶች እና የመጨረሻ ምዘና።',
              ),
            },
            {
              key: 'scorm' as const,
              icon: PackageOpen,
              title: tBilingual('Upload SCORM', 'SCORM ፋይል ጫን'),
              description: tBilingual(
                'Import a ready-made SCORM package as a course.',
                'የተዘጋጀ የ SCORM ጥቅል እንደ ኮርስ ያስመጡ።',
              ),
            },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setMode(option.key)}
              className={cn(
                'group flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-soft ring-super-soft transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift',
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 transition-transform duration-200 group-hover:scale-110">
                <option.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
                {option.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{option.description}</p>
            </button>
          ))}
        </div>
      </PageShell>

      {/* Manual creation — full-screen workspace overlay */}
      <WorkspaceDetailOverlay
        open={mode === 'manual'}
        onClose={handleCancelManual}
        title={tBilingual('Create New Course', 'አዲስ ኮርስ ፍጠር')}
        subtitle={tBilingual(
          'Add course details, build your curriculum, attach content, and set up the final assessment.',
          'የኮርስ ዝርዝሮችን ያክሉ፣ ሥርዓተ-ትምህርትዎን ይገንቡ፣ ይዘቶችን ያያይዙ እና የመጨረሻ ምዘና ያዘጋጁ።',
        )}
      >
        <div className="w-full">
          <CourseCreationWizard
            editingCourse={editingCourse}
            onDone={() => router.push('/courses')}
            onCancel={handleCancelManual}
          />
        </div>
      </WorkspaceDetailOverlay>

      {/* SCORM upload */}
      <WorkspaceDetailOverlay
        open={mode === 'scorm'}
        onClose={() => setMode(null)}
        title={tBilingual('Upload SCORM Package', 'የ SCORM ጥቅል ጫን')}
        subtitle={tBilingual(
          'Import a ready-made SCORM package as a course.',
          'የተዘጋጀ የ SCORM ጥቅል እንደ ኮርስ ያስመጡ።',
        )}
      >
        <div className="w-full">
          <ScormUpload
            onDone={(courseId) =>
              courseId ? router.push(`/courses/${courseId}?edit=1`) : router.push('/courses')
            }
            onCancel={() => setMode(null)}
          />
        </div>
      </WorkspaceDetailOverlay>
    </>
  );
}

export default function CreateCoursePage() {
  return (
    <Suspense fallback={null}>
      <CreateCourseContent />
    </Suspense>
  );
}
