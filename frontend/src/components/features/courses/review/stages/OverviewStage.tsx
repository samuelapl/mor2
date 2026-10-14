'use client';

import { formatDuration, getCourseDurationMinutes } from '@/lib/duration';
import { useMemo } from 'react';
import {
  BookOpen,
  Clock,
  FileQuestion,
  Layers,
  ListTree,
  Paperclip,
  Pencil,
  Scale,
  Trash2,
  UserPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Badge, courseLevelLabel, courseLevelVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichContent, stripHtmlTags } from '@/components/ui/RichContent';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useUserName } from '@/lib/stores/user-store';
import type { Course, UploadedResource, User } from '@/types';
import { AttachmentCard } from '../../detail/AttachmentCard';
import { getItemAttachments } from '../../wizard-components';
import { sessionPlanTrainerId } from '../nodes';
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
  const { isAmharic, t } = useTranslation('courses');
  const userName = useUserName();

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
  // Courses with online sessions show who hosts each session; other course trainers are listed after.
  const plans = course.sessionPlans ?? [];
  const sessionTrainers = plans.map((plan, i) => ({ plan, number: i + 1, trainerId: sessionPlanTrainerId(plan) }));
  const otherTrainers = trainers.filter((id) => !sessionTrainers.some((s) => s.trainerId === id));

  return (
    <div className="space-y-6">
      {/* Summary */}
      {/* auto-fit: cards wrap to a new row instead of squeezing values like "1 hr 20 mins" */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
        <Stat icon={Layers} label={t('creatorSidebar.modules')} value={course.modules.length} />
        <Stat icon={BookOpen} label={t('moduleEditorStage.lessons')} value={stats.lessons} />
        <Stat icon={ListTree} label={t('overviewStage.subLessons')} value={stats.subLessons} />
        <Stat icon={Paperclip} label={t('overviewStage.files')} value={stats.files} />
        <Stat icon={FileQuestion} label={t('assessmentEditorStage.questions')} value={stats.questions} />
        <Stat
          icon={Scale}
          label={t('overviewStage.weights')}
          value={`${stats.weight}%`}
          // Weights must total 100%: the only stat whose colour carries meaning.
          tone={stats.weight === 100 ? 'text-success' : 'text-warning'}
        />
        <Stat icon={Clock} label={t('overviewStage.estTime')} value={duration} />
      </div>

      {/* Details */}
      <section className="space-y-8 rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              {t('overviewStage.courseOverviewAttributes')}
            </h2>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5 text-xs text-primary hover:bg-primary-soft hover:text-primary/80">
              <Pencil className="h-3.5 w-3.5" />
              {t('overviewStage.editDetails')}
            </Button>
          )}
        </div>

        <div className="flex flex-col items-start gap-8 md:flex-row">
          <div className="w-full shrink-0 md:w-56">
            {course.cover ? (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border shadow-2xs md:aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.cover} alt="Course cover" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/80 p-6 text-center md:aspect-[4/3]">
                <BookOpen className="mb-1 h-8 w-8 text-subtle-foreground" />
                <p className="text-xs font-medium text-subtle-foreground">{t('overviewStage.noCoverImage')}</p>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <h3 className="text-xl font-bold leading-snug text-foreground">
              <RichContent inline html={course.title} placeholder={t('overviewStage.untitledCourse')} />
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-input bg-muted font-medium text-secondary-foreground">
                {course.category}
              </Badge>
              <Badge variant={courseLevelVariant(course.level)} className="font-bold tracking-wider">
                {courseLevelLabel(course.level, isAmharic)}
              </Badge>
              <Chip>
                <UserRound className="h-3.5 w-3.5 text-primary" />
                {t('overviewStage.owner')} {userName(course.ownerId)}
              </Chip>
              {sessionTrainers.map(({ plan, number, trainerId }) =>
                trainerId ? (
                  <Chip key={plan.id}>
                    <UserRound className="h-3.5 w-3.5 text-primary" />
                    <span title={plan.titleEn}>
                      {t('overviewStage.session', { number })} {userName(trainerId)}
                    </span>
                  </Chip>
                ) : (
                  <span
                    key={plan.id}
                    title={plan.titleEn}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning"
                  >
                    {t('overviewStage.sessionNoTrainerAssigned', { number })}
                  </span>
                ),
              )}
              {otherTrainers.length > 0 && (
                <Chip>
                  <UserRound className="h-3.5 w-3.5 text-primary" />
                  {plans.length > 0 ? t('overviewStage.courseTrainers') : t('overviewStage.trainers')}{' '}
                  {otherTrainers.map(userName).join(', ')}
                </Chip>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              <Field label={t('overviewStage.department')} html={course.department} empty={t('overviewStage.notSpecified')} />
              <Field
                label={t('overviewStage.targetAudience')}
                html={course.targetAudience}
                empty={t('overviewStage.allStaff')}
              />
              <Field label={t('overviewStage.prerequisites')} html={course.prerequisites} empty={t('overviewStage.none')} />
            </div>
          </div>
        </div>

        <RichBlock
          label={t('courseDetailsStage.courseDescription')}
          html={course.description}
          missing={t('overviewStage.noCourseDescriptionProvided')}
        />
        <RichBlock
          label={t('overviewStage.learningObjectivesOutcomes')}
          html={course.objectives}
          missing={t('overviewStage.noLearningObjectivesSpecified')}
          tone="blue"
        />
      </section>

      {/* Course-level files (module/lesson files are listed with their curriculum item) */}
      {courseFiles.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-border/90 bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Paperclip className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              {t('overviewStage.courseReferenceMaterials', { count: courseFiles.length })}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {courseFiles.map((file, idx) => (
              <AttachmentCard key={file.id || file.url || idx} file={file} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = 'text-foreground',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-2xs">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
        <span className="truncate">{label}</span>
      </p>
      <p className={`mt-2 whitespace-nowrap font-display text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/90 px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {children}
    </span>
  );
}

function Field({ label, html, empty }: { label: string; html?: string; empty: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium leading-relaxed text-foreground">
        <RichContent inline html={html} placeholder={empty} />
      </span>
    </div>
  );
}

function RichBlock({ label, html, missing, tone }: { label: string; html?: string; missing: string; tone?: 'blue' }) {
  const hasContent = Boolean(html && stripHtmlTags(html));
  return (
    <div className="space-y-3 border-t border-border/60 pt-6">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {hasContent ? (
        <RichContent
          className={
            tone === 'blue'
              ? // Info accent on the edge only; body text stays in text colour so it reads in both themes.
                'prose prose-sm max-w-none rounded-xl border border-border/60 border-l-4 border-l-info bg-info-soft/40 px-5 py-4 text-sm leading-relaxed text-foreground'
              : 'prose prose-sm max-w-none rounded-xl border border-border/60 bg-muted/40 px-5 py-4 text-sm leading-relaxed text-secondary-foreground'
          }
          html={html!}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-warning/30 bg-warning-soft/60 px-5 py-4 text-xs italic text-warning">{missing}</div>
      )}
    </div>
  );
}
