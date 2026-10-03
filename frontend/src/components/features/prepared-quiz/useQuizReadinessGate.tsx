'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fetchPreparedQuizzes } from '@/lib/api/prepared-quiz';
import { broadcastBlocker } from './quiz-points';

/**
 * Guards staff actions that start a session (Go live, Join room): a session with graded quizzes
 * can't start until each one has questions whose points total its course weight. `guard`
 * resolves true when the action may go ahead; otherwise it opens the returned `modal`.
 */
export function useQuizReadinessGate() {
  const [blocked, setBlocked] = useState<{ sessionId: string; problems: string[] } | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const guard = async (sessionId: string): Promise<boolean> => {
    setCheckingId(sessionId);
    try {
      const quizzes = await fetchPreparedQuizzes(sessionId);
      const problems = quizzes
        .filter((q) => q.assessment)
        .flatMap((q) => {
          const reason = broadcastBlocker(q);
          return reason ? [`${q.title}: ${reason}`] : [];
        });
      if (problems.length === 0) return true;
      setBlocked({ sessionId, problems });
      return false;
    } catch {
      // Can't check (e.g. no access to prepared quizzes): let the server decide.
      return true;
    } finally {
      setCheckingId(null);
    }
  };

  const modal = (
    <Modal
      open={Boolean(blocked)}
      onClose={() => setBlocked(null)}
      title="Unable to perform this action now"
      subtitle="The session's graded quiz isn't prepared yet"
      footer={
        <>
          <Button variant="ghost" onClick={() => setBlocked(null)}>
            Close
          </Button>
          {blocked && (
            <Link href={`/trainer/sessions/${blocked.sessionId}`} onClick={() => setBlocked(null)}>
              <Button>Prepare quiz</Button>
            </Link>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm text-slate-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          This session has a graded quiz that counts toward the course grade. Prepare it before starting or joining the session:
        </p>
        <ul className="space-y-1.5">
          {blocked?.problems.map((problem) => (
            <li key={problem} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              {problem}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );

  return { guard, modal, checkingId };
}
