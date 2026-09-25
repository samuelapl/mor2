'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FilePenLine, PackageOpen } from 'lucide-react';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import PageShell from '@/components/shared/PageShell';
import { CourseCreationWizard } from '@/components/features/courses/CourseCreationWizard';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

type CreationMode = 'manual' | 'scorm' | null;

export default function CreateCoursePage() {
  const router = useRouter();
  const { tBilingual } = useTranslation();
  const [mode, setMode] = useState<CreationMode>(null);

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
        onClose={() => setMode(null)}
        title={tBilingual('Create New Course', 'አዲስ ኮርስ ፍጠር')}
        subtitle={tBilingual(
          'Add course details, build your curriculum, attach content, and set up the final assessment.',
          'የኮርስ ዝርዝሮችን ያክሉ፣ ሥርዓተ-ትምህርትዎን ይገንቡ፣ ይዘቶችን ያያይዙ እና የመጨረሻ ምዘና ያዘጋጁ።',
        )}
      >
        <div className="w-full">
          <CourseCreationWizard
            onDone={() => router.push('/courses')}
            onCancel={() => setMode(null)}
          />
        </div>
      </WorkspaceDetailOverlay>

      {/* SCORM placeholder */}
      <WorkspaceDetailOverlay
        open={mode === 'scorm'}
        onClose={() => setMode(null)}
        title={tBilingual('Upload SCORM Package', 'የ SCORM ጥቅል ጫን')}
        subtitle={tBilingual(
          'Import a ready-made SCORM package as a course.',
          'የተዘጋጀ የ SCORM ጥቅል እንደ ኮርስ ያስመጡ።',
        )}
      >
        <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <PackageOpen className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
            {tBilingual('SCORM upload — coming soon', 'የ SCORM ጭነት — በቅርቡ ይጠብቁ')}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            {tBilingual(
              "Uploading and importing SCORM packages isn't wired up yet. For now, build your course manually.",
              'የ SCORM ጥቅሎችን መጫን እና ማስመጣት ገና አልተጠናቀቀም። ለአሁን ኮርስዎን በእጅ ይገንቡ።',
            )}
          </p>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tBilingual('Back', 'ተመለስ')}
          </button>
        </div>
      </WorkspaceDetailOverlay>
    </>
  );
}
