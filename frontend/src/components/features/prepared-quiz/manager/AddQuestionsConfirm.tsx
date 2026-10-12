'use client';

import { ListPlus, Scale } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RichContent } from '@/components/ui/RichContent';
import type { ApiQuestionBankQuestion } from '@/lib/api/quiz';
import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';
import { QUESTION_TYPE_LABEL } from '../quiz-points';

interface AddQuestionsConfirmProps {
  quiz: PreparedQuizGroup | null;
  questions: ApiQuestionBankQuestion[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Review step before questions are added to a quiz group: what is added and how points are set. */
export function AddQuestionsConfirm({ quiz, questions, busy, onCancel, onConfirm }: AddQuestionsConfirmProps) {
  if (!quiz) return null;
  const count = questions.length;
  const pointsNote = 'Each question starts with its points from the question bank. You can change them afterwards.';

  return (
    <Modal
      open
      onClose={() => !busy && onCancel()}
      title={`Add ${count} ${count === 1 ? 'question' : 'questions'} to "${quiz.title}"?`}
      subtitle={`${quiz.questions.length} already in the quiz`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy || count === 0} isLoading={busy}>
            <ListPlus className="h-4 w-4" />
            Add {count} {count === 1 ? 'question' : 'questions'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary-soft/60 p-3 text-sm text-primary">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {pointsNote}
        </p>
        <ol className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {questions.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-[11px] font-bold text-secondary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
                  {QUESTION_TYPE_LABEL[q.type] ?? q.type}
                </span>
                <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                  <RichContent html={q.question} inline inheritText />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Modal>
  );
}
