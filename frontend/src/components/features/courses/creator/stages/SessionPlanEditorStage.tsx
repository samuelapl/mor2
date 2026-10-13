'use client';

import { Building2, CalendarClock, FileQuestion, Plus, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { CourseDeliveryMode } from '@/types';
import { inputClass, labelClass, uid } from '../../wizard-types';
import { RichEditor } from '../../wizard-components';
import type { SessionPlanDraft, SessionQuizDraft } from '../types';

interface SessionPlanEditorStageProps {
  plan: SessionPlanDraft;
  index: number;
  deliveryMode?: CourseDeliveryMode;
  onUpdate: (patch: Partial<SessionPlanDraft>) => void;
  onDelete: () => void;
}

/**
 * Plans one online or classroom session: what it covers, and any quizzes it will run. Session quizzes are
 * formative: learners see their score, but it never counts towards the grade or certificate.
 */
export function SessionPlanEditorStage({
  plan,
  index,
  deliveryMode,
  onUpdate,
  onDelete,
}: SessionPlanEditorStageProps) {
  const { t } = useTranslation('courses');
  const hasQuizzes = plan.quizzes.length > 0;
  const isInPerson = deliveryMode === 'IN_PERSON_ONLY';

  const updateQuiz = (quizId: string, patch: Partial<SessionQuizDraft>) =>
    onUpdate({ quizzes: plan.quizzes.map((q) => (q.id === quizId ? { ...q, ...patch } : q)) });

  const addQuiz = () =>
    onUpdate({
      quizzes: [
        ...plan.quizzes,
        {
          id: uid('sq'),
          titleEn: `${plan.titleEn || t('sessionPlanEditorStage.session')} quiz ${plan.quizzes.length + 1}`,
          timeLimitMinutes: 10,
        },
      ],
    });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              isInPerson ? 'bg-warning-soft text-warning' : 'bg-info-soft text-info',
            )}
          >
            {isInPerson ? <Building2 className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
              {isInPerson ? `Classroom Session #${index + 1}` : t('sessionPlanEditorStage.onlineSession', { value: index + 1 })}
            </p>
            <h2 className="font-display text-xl font-bold text-foreground">{plan.titleEn || t('creatorSidebar.untitledSession')}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {isInPerson
                ? 'Placeholder — the date, branch venue, and trainer are set when this classroom session is scheduled in a Round.'
                : t('sessionPlanEditorStage.placeholderTheDateTrainerAndPlatform')}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-xs text-danger hover:bg-danger-soft">
          <Trash2 className="h-3.5 w-3.5" />
          {t('sessionPlanEditorStage.removeSession')}
        </Button>
      </div>

      {/* Details */}
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs md:p-6">
        <div>
          <label className={labelClass}>
            {t('sessionPlanEditorStage.sessionTitle')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={plan.titleEn}
            onChange={(e) => onUpdate({ titleEn: e.target.value })}
            placeholder={
              isInPerson
                ? 'e.g. Classroom Session 1: Practical VAT Filing & Branch Audit'
                : t('sessionPlanEditorStage.eGLiveQAApplying')
            }
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t('sessionPlanEditorStage.sessionDescription')}</label>
          <RichEditor
            value={plan.descriptionEn}
            onChange={(val) => onUpdate({ descriptionEn: val })}
            placeholder={t('sessionPlanEditorStage.whatHappensInThisSession')}
            minHeight={90}
          />
        </div>
        <div>
          <label className={labelClass}>{t('sessionPlanEditorStage.sessionObjectives')}</label>
          <RichEditor
            value={plan.objectivesEn}
            onChange={(val) => onUpdate({ objectivesEn: val })}
            placeholder={t('sessionPlanEditorStage.byTheEndOfThisSession')}
            minHeight={90}
          />
        </div>
      </div>

      {/* Quizzes */}
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={hasQuizzes}
              onChange={(e) => (e.target.checked ? addQuiz() : onUpdate({ quizzes: [] }))}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span className="text-sm font-bold text-foreground">{t('sessionPlanEditorStage.thisSessionHasQuizzes')}</span>
          </label>
          <span className="rounded-full bg-info-soft px-2.5 py-1 text-[11px] font-semibold text-info">
            {t('sessionPlanEditorStage.formativeBadge')}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{t('sessionPlanEditorStage.formativeNote')}</p>

        {hasQuizzes && (
          <div className="space-y-3">
            {plan.quizzes.map((quiz, i) => {
              return (
                <div key={quiz.id} className="space-y-3 rounded-xl border border-border bg-muted/50 p-4">
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4 shrink-0 text-primary" />
                    <input
                      type="text"
                      value={quiz.titleEn}
                      onChange={(e) => updateQuiz(quiz.id, { titleEn: e.target.value })}
                      placeholder={t('sessionPlanEditorStage.quizTitle', { value: i + 1 })}
                      className={cn(inputClass, 'flex-1')}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdate({ quizzes: plan.quizzes.filter((q) => q.id !== quiz.id) })}
                      className="rounded-lg p-2 text-subtle-foreground transition hover:bg-danger-soft hover:text-danger"
                      aria-label="Remove quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t('sessionPlanEditorStage.timeLimitMin')}</label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={quiz.timeLimitMinutes}
                        onChange={(e) => updateQuiz(quiz.id, { timeLimitMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addQuiz} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {t('sessionPlanEditorStage.addQuiz')}
            </Button>
          </div>
        )}
        <p className="text-[11px] text-subtle-foreground">
          {t('sessionPlanEditorStage.questionsAreAddedFromTheQuestion')}
        </p>
      </div>
    </div>
  );
}
