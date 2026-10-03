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
  const { tBilingual } = useTranslation();
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
          titleEn: `${plan.titleEn || tBilingual('Session', 'ክፍለ-ጊዜ')} quiz ${plan.quizzes.length + 1}`,
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {tBilingual(`Online session ${index + 1}`, `የኦንላይን ክፍለ-ጊዜ ${index + 1}`)}
            </p>
            <h2 className="font-display text-xl font-bold text-slate-900">{plan.titleEn || tBilingual('Untitled session', 'ርዕስ የሌለው ክፍለ-ጊዜ')}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" />
              {tBilingual(
                'Placeholder — the date, trainer and platform are set when the session is scheduled after approval.',
                'ቦታ ያዥ — ቀን፣ አሰልጣኝ እና መድረክ ከጸደቀ በኋላ ሲታቀድ ይወሰናሉ።',
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50">
          <Trash2 className="h-3.5 w-3.5" />
          {tBilingual('Remove session', 'ክፍለ-ጊዜውን አስወግድ')}
        </Button>
      </div>

      {/* Details */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs md:p-6">
        <div>
          <label className={labelClass}>
            {tBilingual('Session title', 'የክፍለ-ጊዜ ርዕስ')} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={plan.titleEn}
            onChange={(e) => onUpdate({ titleEn: e.target.value })}
            placeholder={tBilingual('e.g. Live Q&A: applying audit procedures', 'ለምሳሌ፡ የቀጥታ ጥያቄና መልስ')}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{tBilingual('Session description', 'የክፍለ-ጊዜ ማብራሪያ')}</label>
          <RichEditor
            value={plan.descriptionEn}
            onChange={(val) => onUpdate({ descriptionEn: val })}
            placeholder={tBilingual('What happens in this session…', 'በዚህ ክፍለ-ጊዜ ምን ይከናወናል…')}
            minHeight={90}
          />
        </div>
        <div>
          <label className={labelClass}>{tBilingual('Session objectives', 'የክፍለ-ጊዜ ዓላማዎች')}</label>
          <RichEditor
            value={plan.objectivesEn}
            onChange={(val) => onUpdate({ objectivesEn: val })}
            placeholder={tBilingual('By the end of this session learners will…', 'በዚህ ክፍለ-ጊዜ መጨረሻ ሰልጣኞች…')}
            minHeight={90}
          />
        </div>
      </div>

      {/* Quizzes */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={hasQuizzes}
              onChange={(e) => (e.target.checked ? addQuiz() : onUpdate({ quizzes: [] }))}
              disabled={!hasQuizzes && remaining === 0}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-bold text-slate-900">{tBilingual('This session has quizzes', 'ይህ ክፍለ-ጊዜ ፈተናዎች አሉት')}</span>
          </label>
          <WeightBar sessionWeight={sessionWeight} total={totalAllocatedWeight} />
        </div>

        {!hasQuizzes ? (
          <p className="text-xs text-slate-500">
            {remaining === 0
              ? tBilingual(
                  'All 100% of the course weight is already assigned. Lower another assessment to add a quiz here.',
                  'ሁሉም 100% ክብደት ተመድቧል። እዚህ ፈተና ለመጨመር ሌላ ምዘና ይቀንሱ።',
                )
              : tBilingual(
                  'Quizzes run live during the session and count towards the course grade. A learner who misses one scores 0 for it.',
                  'ፈተናዎቹ በክፍለ-ጊዜው በቀጥታ ይሰጣሉ እና በኮርስ ውጤት ይቆጠራሉ። ያመለጠው ሰልጣኝ 0 ያገኛል።',
                )}
          </p>
        ) : (
          <div className="space-y-3">
            {plan.quizzes.map((quiz, i) => {
              const maxWeight = 100 - (totalAllocatedWeight - (quiz.weight || 0));
              return (
                <div key={quiz.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4 shrink-0 text-indigo-600" />
                    <input
                      type="text"
                      value={quiz.titleEn}
                      onChange={(e) => updateQuiz(quiz.id, { titleEn: e.target.value })}
                      placeholder={tBilingual(`Quiz ${i + 1} title`, `የፈተና ${i + 1} ርዕስ`)}
                      className={cn(inputClass, 'flex-1')}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdate({ quizzes: plan.quizzes.filter((q) => q.id !== quiz.id) })}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>{tBilingual('Weight (%)', 'ክብደት (%)')}</label>
                      <input
                        type="number"
                        min={0}
                        max={maxWeight}
                        value={quiz.weight}
                        onChange={(e) => updateQuiz(quiz.id, { weight: Math.max(0, Math.min(maxWeight, parseInt(e.target.value, 10) || 0)) })}
                        className={inputClass}
                      />
                      <p className="mt-1 text-[10px] text-slate-400">{tBilingual(`Up to ${maxWeight}% available`, `እስከ ${maxWeight}% ይቀራል`)}</p>
                    </div>
                    <div>
                      <label className={labelClass}>{tBilingual('Pass mark (%)', 'ማለፊያ (%)')}</label>
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
                      <label className={labelClass}>{tBilingual('Time limit (min)', 'የጊዜ ገደብ (ደቂቃ)')}</label>
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
                    <p className="text-[11px] text-amber-700">
                      {tBilingual('A 0% quiz does not affect the course grade.', '0% ፈተና የኮርስ ውጤትን አይነካም።')}
                    </p>
                  )}
                  {policyPassMark !== null && quiz.passingScore < policyPassMark && (
                    <p className="text-[11px] text-amber-700">
                      {tBilingual(
                        `The course needs ${policyPassMark}% overall for the certificate; this quiz's pass mark is lower.`,
                        `ኮርሱ ለሰርተፊኬት ${policyPassMark}% ይፈልጋል፤ የዚህ ፈተና ማለፊያ ዝቅ ያለ ነው።`,
                      )}
                    </p>
                  )}
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addQuiz} disabled={remaining === 0} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {tBilingual('Add quiz', 'ፈተና ጨምር')}
            </Button>
          </div>
        )}
        <p className="text-[11px] text-slate-400">
          {tBilingual(
            'Questions are added from the question bank by the trainer once the session is scheduled.',
            'ጥያቄዎች ክፍለ-ጊዜው ሲታቀድ በአሰልጣኙ ከጥያቄ ባንክ ይጨመራሉ።',
          )}
        </p>
      </div>
    </div>
  );
}

function WeightBar({ sessionWeight, total }: { sessionWeight: number; total: number }) {
  const { tBilingual } = useTranslation();
  const others = Math.max(0, total - sessionWeight);
  return (
    <div className="min-w-[220px] space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-slate-400" style={{ width: `${Math.min(100, others)}%` }} />
        <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100 - Math.min(100, others), sessionWeight)}%` }} />
      </div>
      <p className={cn('text-[11px] font-semibold', total === 100 ? 'text-emerald-700' : 'text-slate-500')}>
        {tBilingual(
          `This session ${sessionWeight}% · course total ${total}% · ${Math.max(0, 100 - total)}% left`,
          `ይህ ክፍለ-ጊዜ ${sessionWeight}% · ድምር ${total}% · ${Math.max(0, 100 - total)}% ቀሪ`,
        )}
      </p>
    </div>
  );
}
