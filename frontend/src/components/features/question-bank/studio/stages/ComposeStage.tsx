'use client';

import { CircleDot, Eye, Globe, HelpCircle, Layers, Loader2, PenLine, Plus, Save, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RichContent } from '@/components/ui/RichContent';
import { RichTextArea } from '@/components/ui/RichTextArea';
import { cn } from '@/lib/utils';
import type { ApiModule } from '@/lib/api/types';
import type { Course } from '@/types';
import type { QuestionEditorState } from '../../hooks/useQuestionEditor';
import type { BankQuestionType, TargetLevel } from '../../types';
import { cardClass, inputClass, labelClass, sectionTitleClass } from '../../styles';
import { DuplicateWarning } from '../../components/DuplicateWarning';
import { StagedQuestionList } from '../../components/StagedQuestionList';
import { StageHeader } from '../StageHeader';

interface ComposeStageProps {
  editor: QuestionEditorState;
  courseModules: ApiModule[];
  currentCourse?: Course;
  /** Leave the composer (the studio asks before discarding queued questions). */
  onCancel: () => void;
}

const TYPE_TILES: { type: BankQuestionType; label: string; hint: string; icon: typeof CircleDot }[] = [
  { type: 'MULTIPLE_CHOICE', label: 'Multiple choice', hint: 'One correct option', icon: CircleDot },
  { type: 'TRUE_FALSE', label: 'True / False', hint: 'Quick fact check', icon: ToggleLeft },
  { type: 'SHORT_ANSWER', label: 'Short answer', hint: 'Typed response', icon: PenLine },
];

export function ComposeStage({ editor, courseModules, currentCourse, onCancel }: ComposeStageProps) {
  const {
    editingQuestion,
    stagedQuestions,
    qType,
    setQType,
    qText,
    setQText,
    qOptions,
    setQOptions,
    qCorrectIndex,
    setQCorrectIndex,
    qAnswerText,
    setQAnswerText,
    qIsReusable,
    setQIsReusable,
    savingQuestion,
    saveError,
    targetLevel,
    targetModuleId,
    targetLessonId,
    targetSubLessonId,
    setTargetSubLessonId,
    changeTargetLevel,
    changeTargetModule,
    changeTargetLesson,
    activeModuleLessons,
    activeLessonSubLessons,
  } = editor;

  const saveCount = stagedQuestions.length + (qText.trim() ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <StageHeader
        onBack={onCancel}
        backLabel="Back to question bank"
        eyebrow={editingQuestion ? 'Edit question' : 'Compose'}
        title={editingQuestion ? 'Edit Question' : 'Add Questions to the Bank'}
        description={
          qIsReusable
            ? 'Global Question Bank (Reusable across all courses)'
            : `Assign to ${currentCourse?.title || 'Course'} Question Bank`
        }
      />

      {/* noValidate: the handlers validate the prompt and choices themselves. Browser validation
          would block "Save to Bank" whenever only queued questions are being saved (empty form). */}
      <form onSubmit={editor.handleSaveQuestion} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Placement */}
          <section className={cn(cardClass, 'space-y-4 p-6')}>
            <div>
              <h3 className={sectionTitleClass}>
                <Layers className="h-4 w-4 text-primary" />
                Placement
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Choose where this question lives in the bank.</p>
            </div>

            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition',
                qIsReusable
                  ? 'border-primary/30 bg-primary-soft/60'
                  : 'border-border/90 bg-muted/70 hover:border-primary/30',
              )}
            >
              <input
                type="checkbox"
                checked={qIsReusable}
                onChange={(e) => setQIsReusable(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Reusable across courses (Save as Global Question)
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {qIsReusable
                    ? 'This question will be available to all courses and can be imported or used in any quiz.'
                    : `This question is linked specifically to: ${currentCourse?.title || 'Active Course'}.`}
                </span>
              </span>
            </label>

            {!qIsReusable && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Curriculum level</label>
                  <select value={targetLevel} onChange={(e) => changeTargetLevel(e.target.value as TargetLevel)} className={inputClass}>
                    <option value="COURSE_GENERAL">Course Level (General)</option>
                    <option value="MODULE">Specific Module</option>
                    <option value="LESSON">Specific Lesson</option>
                    <option value="SUB_LESSON">Specific Sub-lesson</option>
                  </select>
                </div>

                {targetLevel !== 'COURSE_GENERAL' && (
                  <div>
                    <label className={labelClass}>Module</label>
                    <select value={targetModuleId} onChange={(e) => changeTargetModule(e.target.value)} className={inputClass}>
                      <option value="">Select a Module…</option>
                      {courseModules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(targetLevel === 'LESSON' || targetLevel === 'SUB_LESSON') && (
                  <div>
                    <label className={labelClass}>Lesson</label>
                    <select value={targetLessonId} onChange={(e) => changeTargetLesson(e.target.value)} className={inputClass}>
                      <option value="">Select a Lesson…</option>
                      {activeModuleLessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetLevel === 'SUB_LESSON' && (
                  <div>
                    <label className={labelClass}>Sub-lesson</label>
                    <select value={targetSubLessonId} onChange={(e) => setTargetSubLessonId(e.target.value)} className={inputClass}>
                      <option value="">Select a Sub-lesson…</option>
                      {activeLessonSubLessons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.titleEn}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Question */}
          <section className={cn(cardClass, 'space-y-5 p-6')}>
            <h3 className={sectionTitleClass}>
              <HelpCircle className="h-4 w-4 text-primary" />
              Question
            </h3>

            <div>
              <span className={labelClass}>Question Type</span>
              <div role="radiogroup" aria-label="Question type" className="grid gap-2 sm:grid-cols-3">
                {TYPE_TILES.map((tile) => {
                  const active = qType === tile.type;
                  const Icon = tile.icon;
                  return (
                    <button
                      key={tile.type}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setQType(tile.type)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                        active
                          ? 'border-ring bg-primary-soft/70 ring-2 ring-ring/15'
                          : 'border-border/90 bg-card hover:border-input',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          active ? 'bg-indigo-600 text-white' : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className={cn('block text-xs font-bold', active ? 'text-primary' : 'text-foreground')}>
                          {tile.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{tile.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <RichTextArea
              label="Question Prompt"
              required
              placeholder="Type your interactive question statement, code snippet, or scenario…"
              value={qText}
              onChange={(val) => setQText(val)}
              compact
              rows={3}
            />

            {qType === 'MULTIPLE_CHOICE' && (
              <div>
                <span className={labelClass}>Answer choices</span>
                <p className="-mt-0.5 mb-2.5 text-[11px] text-muted-foreground">Select the circle next to the correct option.</p>
                <div className="space-y-2">
                  {qOptions.map((opt, idx) => {
                    const isCorrect = qCorrectIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-1.5 pl-3 transition',
                          isCorrect
                            ? 'border-success/30 bg-success-soft/60'
                            : 'border-border/90 bg-card',
                        )}
                      >
                        <input
                          type="radio"
                          name="correctAnswerOption"
                          checked={isCorrect}
                          onChange={() => setQCorrectIndex(idx)}
                          aria-label={`Mark option ${String.fromCharCode(65 + idx)} as correct`}
                          className="h-4 w-4 cursor-pointer text-success focus:ring-success"
                        />
                        <span className="w-4 text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + idx)}</span>
                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + idx)} text…`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...qOptions];
                            next[idx] = e.target.value;
                            setQOptions(next);
                          }}
                          className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2 text-sm text-secondary-foreground outline-none placeholder:text-subtle-foreground focus:ring-2 focus:ring-ring/20"
                        />
                        {isCorrect && (
                          <span className="mr-2 hidden shrink-0 text-[11px] font-semibold text-success sm:inline">Correct</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {qType === 'TRUE_FALSE' && (
              <div>
                <span className={labelClass}>Correct Answer</span>
                <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
                  {['True', 'False'].map((label, idx) => {
                    const isCorrect = qCorrectIndex === idx;
                    return (
                      <label
                        key={label}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition',
                          isCorrect
                            ? 'border-success/30 bg-success-soft/60 text-success'
                            : 'border-border/90 bg-card text-secondary-foreground hover:border-input',
                        )}
                      >
                        <input
                          type="radio"
                          name="tfAnswer"
                          checked={isCorrect}
                          onChange={() => setQCorrectIndex(idx)}
                          className="h-4 w-4 text-success focus:ring-success"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {qType === 'SHORT_ANSWER' && (
              <div>
                <label className={labelClass}>Accepted Answer Text (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty for open-ended / manually-graded questions"
                  value={qAnswerText}
                  onChange={(e) => setQAnswerText(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  If provided, student answers will be automatically checked against this value. If left blank, questions are
                  treated as open-ended.
                </p>
              </div>
            )}

            <DuplicateWarning
              matches={editor.similarMatches}
              checking={editor.checkingDuplicates}
              acknowledged={editor.acknowledgeSimilar}
              onAcknowledgedChange={editor.setAcknowledgeSimilar}
            />
          </section>
        </div>

        {/* Right rail: preview, queue, actions */}
        <div className="space-y-4 lg:sticky lg:top-0">
          <LearnerPreview editor={editor} />

          <StagedQuestionList
            questions={stagedQuestions}
            issues={editor.stagedIssues}
            onKeepAnyway={editor.keepStagedQuestionAnyway}
            onEdit={editor.handleEditStagedQuestion}
            onRemove={editor.removeStagedQuestion}
            onClear={editor.clearStagedQuestions}
          />

          {saveError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger"
            >
              {saveError}
            </div>
          )}

          <div className={cn(cardClass, 'space-y-2 p-4')}>
            <Button type="submit" disabled={savingQuestion} className="w-full shadow-sm">
              {savingQuestion ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingQuestion ? (
                <>
                  <Save className="h-4 w-4" />
                  Update Question
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {saveCount > 1 ? `Save to Bank (${saveCount})` : 'Save to Bank'}
                </>
              )}
            </Button>
            {!editingQuestion && (
              <Button
                type="button"
                variant="outline"
                onClick={editor.handleAddQuestionToBatch}
                disabled={savingQuestion}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Question
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onCancel} disabled={savingQuestion} className="w-full">
              Cancel
            </Button>
            {!editingQuestion && (
              <p className="pt-1 text-center text-[11px] leading-relaxed text-subtle-foreground">
                &ldquo;Add Another Question&rdquo; queues this one and clears the form. Save to Bank saves the queue and the
                form together.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/** How the question currently in the form will look to a learner. */
function LearnerPreview({ editor }: { editor: QuestionEditorState }) {
  const { qType, qText, qOptions, qCorrectIndex } = editor;
  const options = qType === 'TRUE_FALSE' ? ['True', 'False'] : qOptions.filter((o) => o.trim() !== '');

  return (
    <section className={cn(cardClass, 'overflow-hidden')}>
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        Learner preview
      </div>
      <div className="space-y-3 p-4">
        <RichContent
          html={qText}
          placeholder="Your question prompt will appear here…"
          className="text-sm font-semibold leading-relaxed text-foreground"
        />
        {qType === 'SHORT_ANSWER' ? (
          <div className="h-9 rounded-lg border border-dashed border-input bg-muted px-3 text-xs leading-9 text-subtle-foreground">
            Learner types an answer…
          </div>
        ) : options.length === 0 ? (
          <p className="text-xs italic text-subtle-foreground">Answer choices will appear here…</p>
        ) : (
          <div className="space-y-1.5">
            {options.map((opt, idx) => {
              // Preview maps the correct index onto the non-empty options shown here.
              const isCorrect = qType === 'TRUE_FALSE' ? qCorrectIndex === idx : qOptions[qCorrectIndex] === opt;
              return (
                <div
                  key={`${opt}-${idx}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs',
                    isCorrect
                      ? 'border-success/30 bg-success-soft/70 text-success'
                      : 'border-border/80 text-secondary-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 rounded-full border-2',
                      isCorrect ? 'border-success bg-emerald-500' : 'border-input',
                    )}
                  />
                  <span className="truncate">{opt}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
