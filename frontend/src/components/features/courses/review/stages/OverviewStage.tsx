'use client';

import { formatDuration, getCourseDurationMinutes } from '@/lib/duration';
import { useMemo } from 'react';
import { BookOpen, Paperclip, Pencil, Trash2, UserPlus, UserRound } from 'lucide-react';
import { Badge, courseLevelLabel, courseLevelVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichContent, stripHtmlTags } from '@/components/ui/RichContent';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLms } from '@/lib/lms-store';
import type { Course, UploadedResource, User } from '@/types';
import { AttachmentCard } from '../../detail/AttachmentCard';
import { getItemAttachments } from '../../wizard-components';
import type { AssessmentsByScope } from '../types';

interface OverviewStageProps {
  course: Course;
  assessments: AssessmentsByScope;
  canEdit: boolean;
  onEdit: () => void;
  canAssignTrainer: boolean;
  trainerOptions: User[];
  busy: boolean;
  onAssignTrainer: (trainerId: string) => void;
  onRemoveTrainer: (trainerId: string) => void;
}

export function OverviewStage({
  course,
  assessments,
  canEdit,
  onEdit,
  canAssignTrainer,
  trainerOptions,
  busy,
  onAssignTrainer,
  onRemoveTrainer,
}: OverviewStageProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const { userName } = useLms();

  const courseFiles: UploadedResource[] = useMemo(
    () => (course.attachments || []).map((a) => ({ id: a.id, name: a.name, url: a.url, type: a.type })),
    [course.attachments],
  );

  const stats = useMemo(() => {
    let lessons = 0;
    let subLessons = 0;
    let files = courseFiles.length;
    for (const m of course.modules) {
      files += getItemAttachments(m).length;
      lessons += m.lessons.length;
      for (const l of m.lessons) {
        files += getItemAttachments(l).length;
        subLessons += l.subLessons?.length ?? 0;
        for (const s of l.subLessons ?? []) files += getItemAttachments(s).length;
      }
    }
    const minutes = getCourseDurationMinutes(course);
    const questions = assessments.all.reduce((sum, a) => sum + (a.questions?.length || 0), 0);
    const weight = assessments.all.reduce((sum, a) => sum + (a.weight ?? 0), 0);
    return { lessons, subLessons, files, minutes, questions, weight };
  }, [course, courseFiles.length, assessments.all]);

  const duration = formatDuration(stats.minutes, isAmharic);

  const trainers = course.trainerIds?.length ? course.trainerIds : course.trainerId ? [course.trainerId] : [];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label={tBilingual('Modules', 'ሞጁሎች')} value={course.modules.length} />
        <Stat label={tBilingual('Lessons', 'ትምህርቶች')} value={stats.lessons} />
        <Stat label={tBilingual('Sub-Lessons', 'ንዑስ ትምህርቶች')} value={stats.subLessons} />
        <Stat label={tBilingual('Files', 'ፋይሎች')} value={stats.files} tone="text-indigo-600" />
        <Stat label={tBilingual('Questions', 'ጥያቄዎች')} value={stats.questions} tone="text-emerald-600" />
        <Stat label={tBilingual('Weights', 'ክብደት')} value={`${stats.weight}%`} tone={stats.weight === 100 ? 'text-emerald-600' : 'text-amber-600'} />
        <Stat label={tBilingual('Est. Time', 'የሚፈጀው ጊዜ')} value={duration} />
      </div>

      {/* Details */}
      <section className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
              {tBilingual('Course Overview & Attributes', 'የኮርስ አጠቃላይ እይታ እና መረጃ')}
            </h2>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800">
              <Pencil className="h-3.5 w-3.5" />
              {tBilingual('Edit Details', 'መረጃዎችን አርትዕ')}
            </Button>
          )}
        </div>

        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="w-full shrink-0 md:w-52">
            {course.cover ? (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 shadow-2xs md:aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.cover} alt="Course cover" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center md:aspect-[4/3]">
                <BookOpen className="mb-1 h-8 w-8 text-slate-300" />
                <p className="text-xs font-medium text-slate-400">{tBilingual('No cover image', 'የሽፋን ምስል የለም')}</p>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <h3 className="text-xl font-bold leading-snug text-slate-900">
              <RichContent inline html={course.title} placeholder={tBilingual('Untitled Course', 'ያልተሰየመ ኮርስ')} />
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-slate-300 bg-slate-50 font-medium text-slate-700">
                {course.category}
              </Badge>
              <Badge variant={courseLevelVariant(course.level)} className="font-bold tracking-wider">
                {courseLevelLabel(course.level, isAmharic)}
              </Badge>
              <Chip>
                <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                {tBilingual('Owner:', 'ባለቤት:')} {userName(course.ownerId)}
              </Chip>
              {trainers.length > 0 ? (
                <Chip>
                  <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                  {tBilingual('Trainers:', 'አሰልጣኞች:')} {trainers.map(userName).join(', ')}
                </Chip>
              ) : (
                // Only courses with online sessions need a trainer (see useCourseActions.requiresTrainer).
                (course.sessionPlans?.length ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                    {tBilingual('No trainer assigned', 'አሰልጣኝ አልተመደበም')}
                  </span>
                )
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3">
              <Field label={tBilingual('Department:', 'ክፍል / መምሪያ:')} html={course.department} empty={tBilingual('Not specified', 'አልተገለጸም')} />
              <Field
                label={tBilingual('Target Audience:', 'የታለመው ተደራሽ:')}
                html={course.targetAudience}
                empty={tBilingual('All Staff', 'ሁሉም ሰራተኞች')}
              />
              <Field label={tBilingual('Prerequisites:', 'ቅድመ-ሁኔታዎች:')} html={course.prerequisites} empty={tBilingual('None', 'ምንም የለም')} />
            </div>
          </div>
        </div>

        <RichBlock
          label={tBilingual('Course Description', 'የኮርስ ማብራሪያ')}
          html={course.description}
          missing={tBilingual('⚠ No course description provided.', '⚠ የኮርስ ማብራሪያ አልተሰጠም።')}
        />
        <RichBlock
          label={tBilingual('Learning Objectives & Outcomes', 'የመማሪያ ዓላማዎች እና ውጤቶች')}
          html={course.objectives}
          missing={tBilingual('⚠ No learning objectives specified.', '⚠ የመማሪያ ዓላማዎች አልተገለጹም።')}
          tone="blue"
        />
      </section>

      {/* Course-level files (module/lesson files are listed with their curriculum item) */}
      {courseFiles.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Paperclip className="h-4 w-4 text-indigo-600" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">
              {tBilingual(`Course Reference Materials (${courseFiles.length})`, `የኮርስ ማመሳከሪያ ሰነዶች (${courseFiles.length})`)}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {courseFiles.map((file, idx) => (
              <AttachmentCard key={file.id || file.url || idx} file={file} isAmharic={isAmharic} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-900' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function Field({ label, html, empty }: { label: string; html?: string; empty: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
      <span className="mb-0.5 block font-semibold text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">
        <RichContent inline html={html} placeholder={empty} />
      </span>
    </div>
  );
}

function RichBlock({ label, html, missing, tone }: { label: string; html?: string; missing: string; tone?: 'blue' }) {
  const hasContent = Boolean(html && stripHtmlTags(html));
  return (
    <div className="space-y-1.5 border-t border-slate-100 pt-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {hasContent ? (
        <div
          className={
            tone === 'blue'
              ? 'prose prose-sm max-w-none rounded-xl border border-blue-100/90 bg-blue-50/60 p-4 text-sm leading-relaxed text-blue-950'
              : 'prose prose-sm max-w-none rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700'
          }
          dangerouslySetInnerHTML={{ __html: html! }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs italic text-amber-800">{missing}</div>
      )}
    </div>
  );
}
