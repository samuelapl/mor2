'use client';

import { ListPlus, Scale } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RichContent } from '@/components/ui/RichContent';
import type { ApiQuestionBankQuestion } from '@/lib/api/quiz';
import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';
import { isEvenSplit, QUESTION_TYPE_LABEL, splitEvenly } from '../quiz-points';

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
  const weight = quiz.assessment?.weight ?? null;
  const count = questions.length;

  // Same rules as the server: an evenly split graded quiz stays even; otherwise new questions start at 0.
  let pointsNote: string;
  if (weight === null) {
    pointsNote = 'Each question starts with its points from the question bank. You can change them afterwards.';
  } else if (isEvenSplit(quiz.questions.map((q) => q.points), weight)) {
    const split = splitEvenly(weight, quiz.questions.length + count);
    const values = Array.from(new Set(split)).join(' or ');
    pointsNote = `The quiz's ${weight} allocated points will be split evenly over ${quiz.questions.length + count} questions (${values} points each).`;
  } else {
    pointsNote = `You've customised this quiz's points, so the new questions start at 0. Assign them so the quiz totals its ${weight} allocated points.`;
  }

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
        <p className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-900">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          {pointsNote}
        </p>
        <ol className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {questions.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {QUESTION_TYPE_LABEL[q.type] ?? q.type}
                </span>
                <div className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">
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
