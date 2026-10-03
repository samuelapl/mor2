'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, GraduationCap, ListChecks, Loader2 } from 'lucide-react';
import { usePreparedQuizStore } from '@/lib/stores/prepared-quiz-store';
import { toast } from '@/lib/toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useQuestionBankBrowser } from './hooks/useQuestionBankBrowser';
import { NoQuizGroups, QuizGroupBar } from './manager/QuizGroupBar';
import { QuizGroupSettings } from './manager/QuizGroupSettings';
import { BankBrowser } from './manager/BankBrowser';
import { QuizQuestionList } from './manager/QuizQuestionList';
import { AddQuestionsConfirm } from './manager/AddQuestionsConfirm';
import { pointsStatus } from './quiz-points';

interface PreparedQuizManagerProps {
  sessionId: string;
  courseId: string;
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/**
 * Prepares a session's quiz groups before the live session: create groups, pick questions
 * from the course question bank, set the timer and each question's points. The live room
 * (PreparedQuizPanel) broadcasts them.
 */
export function PreparedQuizManager({ sessionId, courseId }: PreparedQuizManagerProps) {
  const store = usePreparedQuizStore();
  const { quizzes, isLoading, isSaving } = store;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);

  useEffect(() => {
    void store.loadForSession(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const activeQuiz = useMemo(
    () => quizzes.find((q) => q.id === store.activeQuizId) ?? quizzes[0] ?? null,
    [quizzes, store.activeQuizId],
  );
  const inQuiz = useMemo(() => new Set(activeQuiz?.questions.map((q) => q.questionId) ?? []), [activeQuiz]);
  const bank = useQuestionBankBrowser(courseId, inQuiz);

  const run = async (action: () => Promise<unknown>, success: string | null, failure: string) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(errorText(err, failure));
    }
  };

  const createGroup = () =>
    run(() => store.createQuiz(sessionId, undefined, 3), 'Quiz group created', 'Could not create the quiz group');

  const addSelected = () => {
    if (!activeQuiz) return;
    const ids = Array.from(bank.selectedIds);
    void run(
      async () => {
        await store.bulkAddQuestions(sessionId, activeQuiz.id, ids);
        bank.clearSelection();
        setConfirmAdd(false);
      },
      `Added ${ids.length} ${ids.length === 1 ? 'question' : 'questions'} to ${activeQuiz.title}`,
      'Could not add the questions',
    );
  };

  const deleteGroup = (quizId: string) =>
    run(() => store.deleteQuiz(sessionId, quizId), 'Quiz group deleted', 'Could not delete the quiz group').then(() =>
      setConfirmDeleteId(null),
    );

  if (isLoading && quizzes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (quizzes.length === 0) return <NoQuizGroups busy={isSaving} onCreate={() => void createGroup()} />;

  const questionCount = quizzes.reduce((sum, q) => sum + q.questions.length, 0);
  const graded = quizzes.filter((q) => q.assessment);
  const gradedReady = graded.filter((q) => pointsStatus(q).kind === 'ready').length;
  const deleting = quizzes.find((q) => q.id === confirmDeleteId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <SummaryChip icon={<ListChecks className="h-3.5 w-3.5" />}>
          {quizzes.length} {quizzes.length === 1 ? 'quiz group' : 'quiz groups'} · {questionCount} questions
        </SummaryChip>
        {graded.length > 0 && (
          <SummaryChip
            tone={gradedReady === graded.length ? 'green' : 'amber'}
            icon={gradedReady === graded.length ? <CheckCircle2 className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
          >
            {gradedReady} of {graded.length} graded {graded.length === 1 ? 'quiz' : 'quizzes'} ready
          </SummaryChip>
        )}
      </div>

      <QuizGroupBar
        quizzes={quizzes}
        activeQuizId={activeQuiz?.id ?? null}
        busy={isSaving}
        onSelect={store.setActiveQuizId}
        onCreate={() => void createGroup()}
      />

      {activeQuiz && (
        <>
          <QuizGroupSettings
            quiz={activeQuiz}
            busy={isSaving}
            onRename={(title) => void run(() => store.updateQuiz(sessionId, activeQuiz.id, { title }), null, 'Could not rename the quiz')}
            onTimerChange={(timeLimitMinutes) =>
              void run(
                () => store.updateQuiz(sessionId, activeQuiz.id, { timeLimitMinutes }),
                `Timer set to ${timeLimitMinutes} min`,
                'Could not update the timer',
              )
            }
            onDelete={() => setConfirmDeleteId(activeQuiz.id)}
          />

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <BankBrowser bank={bank} inQuiz={inQuiz} quizTitle={activeQuiz.title} busy={isSaving} onAddSelected={() => setConfirmAdd(true)} />
            <QuizQuestionList
              quiz={activeQuiz}
              busy={isSaving}
              onSetPoints={(points) => store.setQuestionPoints(sessionId, activeQuiz.id, points)}
              onRemove={(questionId) =>
                void run(() => store.removeQuestion(sessionId, activeQuiz.id, questionId), null, 'Could not remove the question')
              }
            />
          </div>
        </>
      )}

      {confirmAdd && (
        <AddQuestionsConfirm
          quiz={activeQuiz}
          questions={bank.selectedQuestions}
          busy={isSaving}
          onCancel={() => setConfirmAdd(false)}
          onConfirm={addSelected}
        />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete quiz group?"
        subtitle={deleting?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={isSaving} onClick={() => deleting && void deleteGroup(deleting.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          The quiz group and its {deleting?.questions.length ?? 0} selected questions are removed from this session. The questions
          stay in the question bank.
        </p>
      </Modal>
    </div>
  );
}

function SummaryChip({
  icon,
  tone = 'slate',
  children,
}: {
  icon: React.ReactNode;
  tone?: 'slate' | 'green' | 'amber';
  children: React.ReactNode;
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
