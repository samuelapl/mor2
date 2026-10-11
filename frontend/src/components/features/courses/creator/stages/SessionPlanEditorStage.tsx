'use client';

import { CalendarClock, FileQuestion, Plus, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { inputClass, labelClass, uid } from '../../wizard-types';
import { RichEditor } from '../../wizard-components';
import type { SessionPlanDraft, SessionQuizDraft } from '../types';

interface SessionPlanEditorStageProps {
  plan: SessionPlanDraft;
  index: number;
  onUpdate: (patch: Partial<SessionPlanDraft>) => void;
  onDelete: () => void;
  /** Course-wide weight total, including every session quiz. */
  totalAllocatedWeight: number;
  /** Starting pass mark for a new quiz (the global policy mark). */
  defaultPassMark: number;
  /** Global policy mark, for the "below the certificate grade" warning. */
  policyPassMark: number | null;
}

/** Plans one online session: what it covers, and any weighted quizzes it will run. */
export function SessionPlanEditorStage({
  plan,
  index,
  onUpdate,
  onDelete,
  totalAllocatedWeight,
  defaultPassMark,
  policyPassMark,
}: SessionPlanEditorStageProps) {
  const { t } = useTranslation('courses');
  const hasQuizzes = plan.quizzes.length > 0;
  const sessionWeight = plan.quizzes.reduce((sum, q) => sum + (q.weight || 0), 0);
  const remaining = Math.max(0, 100 - totalAllocatedWeight);

  const updateQuiz = (quizId: string, patch: Partial<SessionQuizDraft>) =>
    onUpdate({ quizzes: plan.quizzes.map((q) => (q.id === quizId ? { ...q, ...patch } : q)) });

  const addQuiz = () =>
    onUpdate({
      quizzes: [
        ...plan.quizzes,
        {
          id: uid('sq'),
          titleEn: `${plan.titleEn || t('sessionPlanEditorStage.session')} quiz ${plan.quizzes.length + 1}`,
          // New quizzes take 10%, or whatever is left, so the course total never passes 100%.
          weight: Math.min(10, remaining),
          passingScore: defaultPassMark,
          timeLimitMinutes: 10,
        },
      ],
    });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
              {t('sessionPlanEditorStage.onlineSession', { value: index + 1 })}
            </p>
            <h2 className="font-display text-xl font-bold text-foreground">{plan.titleEn || t('creatorSidebar.untitledSession')}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {t('sessionPlanEditorStage.placeholderTheDateTrainerAndPlatform')}
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
            placeholder={t('sessionPlanEditorStage.eGLiveQAApplying')}
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
              disabled={!hasQuizzes && remaining === 0}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span className="text-sm font-bold text-foreground">{t('sessionPlanEditorStage.thisSessionHasQuizzes')}</span>
          </label>
          <WeightBar sessionWeight={sessionWeight} total={totalAllocatedWeight} />
        </div>

        {!hasQuizzes ? (
          <p className="text-xs text-muted-foreground">
            {remaining === 0
              ? t('sessionPlanEditorStage.all100OfTheCourseWeight')
              : t('sessionPlanEditorStage.quizzesRunLiveDuringTheSession')}
          </p>
        ) : (
          <div className="space-y-3">
            {plan.quizzes.map((quiz, i) => {
              const maxWeight = 100 - (totalAllocatedWeight - (quiz.weight || 0));
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
                      <label className={labelClass}>{t('sessionPlanEditorStage.weight')}</label>
                      <input
                        type="number"
                        min={0}
                        max={maxWeight}
                        value={quiz.weight}
                        onChange={(e) => updateQuiz(quiz.id, { weight: Math.max(0, Math.min(maxWeight, parseInt(e.target.value, 10) || 0)) })}
                        className={inputClass}
                      />
                      <p className="mt-1 text-[10px] text-subtle-foreground">{t('sessionPlanEditorStage.upToAvailable', { maxWeight })}</p>
                    </div>
                    <div>
                      <label className={labelClass}>{t('sessionPlanEditorStage.passMark')}</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={quiz.passingScore}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isNaN(v)) updateQuiz(quiz.id, { passingScore: Math.max(1, Math.min(100, v)) });
                        }}
                        className={inputClass}
                      />
                    </div>
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
                  {quiz.weight === 0 && (
                    <p className="text-[11px] text-warning">
                      {t('sessionPlanEditorStage.a0QuizDoesNotAffect')}
                    </p>
                  )}
                  {policyPassMark !== null && quiz.passingScore < policyPassMark && (
                    <p className="text-[11px] text-warning">
                      {t('sessionPlanEditorStage.theCourseNeedsOverallForThe', { policyPassMark })}
                    </p>
                  )}
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addQuiz} disabled={remaining === 0} className="gap-1.5 text-xs">
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

function WeightBar({ sessionWeight, total }: { sessionWeight: number; total: number }) {
  const { t } = useTranslation('courses');
  const others = Math.max(0, total - sessionWeight);
  return (
    <div className="min-w-[220px] space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-subtle-foreground" style={{ width: `${Math.min(100, others)}%` }} />
        <div className="h-full bg-primary" style={{ width: `${Math.min(100 - Math.min(100, others), sessionWeight)}%` }} />
      </div>
      <p className={cn('text-[11px] font-semibold', total === 100 ? 'text-success' : 'text-muted-foreground')}>
        {t('weightBar.thisSessionCourseTotalLeft', { sessionWeight, total, value: Math.max(0, 100 - total) })}
      </p>
    </div>
  );
}
