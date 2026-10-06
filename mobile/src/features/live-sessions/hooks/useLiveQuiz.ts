import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { readJson, sessionStorage, writeJson } from '@/core/storage/kv-storage';

import { enqueueLiveQuizResponse } from '../sync/live-quiz-sync';
import type {
  LiveKitDataEvent,
  LiveQuizPayload,
  LiveQuizRevealPayload,
} from '../types/livekit-events';

/**
 * Learner side of the live quiz, ported from the web room (LiveSessionWorkspace +
 * LiveQuizLearnerOverlay) so both behave the same with a trainer on the web:
 * - QUIZ_START carries one question or a whole prepared pack (`allQuestions`) with one shared timer
 * - the learner answers freely, then submits the whole pack once (auto-submit when time runs out)
 * - QUIZ_REVEAL shows correct answers + vote distribution, QUIZ_CLOSE hides the quiz
 * - late joiners ask the trainer for the current state with QUIZ_SYNC_REQUEST
 * Room state and the learner's answers survive an app restart (persisted per session).
 */

interface RoomQuizState {
  activeQuiz: LiveQuizPayload | null;
  reveals: Record<string, LiveQuizRevealPayload>;
  dismissed: boolean;
}

interface LearnerAnswers {
  /** Storage key of the quiz these answers belong to. */
  key: string | null;
  answers: Record<string, string[]>;
  submitted: boolean;
}

const EMPTY_ROOM: RoomQuizState = { activeQuiz: null, reveals: {}, dismissed: false };

const roomKey = (sessionId: string) => `live-quiz:${sessionId}`;
const answersKey = (sessionId: string, quiz: LiveQuizPayload) =>
  `live-quiz-answers:${sessionId}:${quiz.quizTitle ? `${quiz.quizTitle}_${quiz.id}` : quiz.id}`;

/** Folds a reveal (and its per-question `allReveals`) into the reveals map. */
function withReveal(
  reveals: Record<string, LiveQuizRevealPayload>,
  reveal: LiveQuizRevealPayload,
): Record<string, LiveQuizRevealPayload> {
  const next = { ...reveals, [reveal.questionId]: reveal };
  Object.entries(reveal.allReveals ?? {}).forEach(([questionId, r]) => {
    next[questionId] = {
      questionId,
      correctOptionIds: r.correctOptionIds,
      explanationEn: r.explanationEn,
      explanationAm: r.explanationAm,
      distribution: r.distribution ?? {},
      totalResponses: r.totalResponses ?? 0,
    };
  });
  return next;
}

export function questionsOf(quiz: LiveQuizPayload | null): LiveQuizPayload[] {
  if (!quiz) return [];
  return quiz.allQuestions && quiz.allQuestions.length > 0 ? quiz.allQuestions : [quiz];
}

export function remainingSeconds(quiz: LiveQuizPayload | null, now = Date.now()): number {
  if (!quiz) return 0;
  const limit = quiz.timeLimitSeconds || 30;
  const elapsed = Math.floor((now - (quiz.startedAt || now)) / 1000);
  return Math.max(0, limit - elapsed);
}

export interface UseLiveQuizOptions {
  sessionId: string;
  userId: string;
  userName: string;
  broadcast: (event: LiveKitDataEvent) => void;
}

export function useLiveQuiz({ sessionId, userId, userName, broadcast }: UseLiveQuizOptions) {
  const [room, setRoom] = useState<RoomQuizState>(
    () => readJson<RoomQuizState>(sessionStorage, roomKey(sessionId)) ?? EMPTY_ROOM,
  );
  const quiz = room.activeQuiz;
  const quizKey = quiz ? answersKey(sessionId, quiz) : null;
  const load = (key: string | null): LearnerAnswers =>
    (key && readJson<LearnerAnswers>(sessionStorage, key)) || {
      key,
      answers: {},
      submitted: false,
    };
  const [stored, setLearner] = useState<LearnerAnswers>(() => load(quizKey));
  // A new quiz switches to its own saved answers; a previous quiz's answers never leak into it.
  if (stored.key !== quizKey) setLearner(load(quizKey));
  const learner = useMemo<LearnerAnswers>(
    () => (stored.key === quizKey ? stored : { key: quizKey, answers: {}, submitted: false }),
    [stored, quizKey],
  );
  const [now, setNow] = useState(() => Date.now());
  const onTick = useRef<() => void>(() => undefined);

  // Persist room quiz state and the answers of the quiz they belong to.
  useEffect(() => {
    writeJson(sessionStorage, roomKey(sessionId), room);
  }, [room, sessionId]);
  useEffect(() => {
    if (stored.key) writeJson(sessionStorage, stored.key, stored);
  }, [stored]);
  // Countdown, refreshed twice a second like the web overlay.
  useEffect(() => {
    if (!quiz) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      onTick.current();
    }, 500);
    return () => clearInterval(timer);
  }, [quiz]);

  /** Feed every data-channel event here. */
  const handleEvent = useCallback((event: LiveKitDataEvent) => {
    switch (event.type) {
      case 'QUIZ_START':
        setRoom({ activeQuiz: event.payload, reveals: {}, dismissed: false });
        break;
      case 'QUIZ_REVEAL':
        setRoom((prev) => ({
          ...prev,
          reveals: withReveal(prev.reveals, event.payload),
          dismissed: false,
        }));
        break;
      case 'QUIZ_CLOSE':
        setRoom({ activeQuiz: null, reveals: {}, dismissed: true });
        break;
      case 'QUIZ_SYNC_RESPONSE': {
        const { activeQuiz, revealData, revealsByQuestionId } = event.payload;
        setRoom((prev) => {
          let reveals = activeQuiz && activeQuiz.id !== prev.activeQuiz?.id ? {} : prev.reveals;
          Object.values(revealsByQuestionId ?? {}).forEach(
            (r) => (reveals = withReveal(reveals, r)),
          );
          if (revealData) reveals = withReveal(reveals, revealData);
          return activeQuiz ? { activeQuiz, reveals, dismissed: false } : { ...prev, reveals };
        });
        break;
      }
      default:
        break;
    }
  }, []);

  /** Ask the trainer for the quiz in progress (on connect / reconnect). */
  const requestSync = useCallback(() => {
    broadcast({ type: 'QUIZ_SYNC_REQUEST', payload: { requesterId: userId } });
  }, [broadcast, userId]);

  const questions = useMemo(() => questionsOf(quiz), [quiz]);
  const remaining = remainingSeconds(quiz, now);
  const anyRevealed = Object.keys(room.reveals).length > 0;

  /** Reveal for one question; when the trainer revealed the pack, every question shows revealed. */
  const revealFor = useCallback(
    (question: LiveQuizPayload): LiveQuizRevealPayload | null => {
      const direct = room.reveals[question.id];
      if (direct) return direct;
      if (!anyRevealed) return null;
      return {
        questionId: question.id,
        correctOptionIds: question.correctOptionIds?.map(String) ?? [],
        explanationEn: question.explanationEn,
        explanationAm: question.explanationAm,
        distribution: {},
        totalResponses: 0,
      };
    },
    [anyRevealed, room.reveals],
  );

  const locked = learner.submitted || anyRevealed || remaining <= 0;

  const setAnswer = useCallback(
    (question: LiveQuizPayload, value: string) => {
      if (locked) return;
      setLearner((raw) => {
        const prev = raw.key === quizKey ? raw : load(quizKey);
        const current = prev.answers[question.id] ?? [];
        let next: string[];
        if (question.type === 'SHORT_ANSWER') next = value.trim() ? [value] : [];
        else if (question.type === 'MULTIPLE_CHOICE')
          next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
        else next = [value];
        return { ...prev, answers: { ...prev.answers, [question.id]: next } };
      });
    },
    [locked, quizKey],
  );

  const submit = useCallback(() => {
    if (!quiz || learner.submitted) return;
    const elapsed = Math.max(1, (quiz.timeLimitSeconds || 30) - remainingSeconds(quiz));
    const answers = Object.fromEntries(
      Object.entries(learner.answers).map(([id, values]) => [id, values.map((v) => v.trim())]),
    );
    for (const q of questions) {
      const selected = (answers[q.id] ?? []).filter(Boolean);
      if (selected.length === 0) continue;
      broadcast({
        type: 'QUIZ_ANSWER',
        payload: {
          questionId: q.id,
          userId,
          userName,
          selectedOptionIds: selected,
          submittedAt: Date.now(),
          responseDurationSeconds: elapsed,
          allAnswers: answers,
        },
      });
      enqueueLiveQuizResponse({
        sessionId,
        questionId: q.id,
        selectedOptionIds: selected,
        responseDurationSeconds: elapsed,
        questionTitle: q.titleEn,
        options: q.options.map((o) => o.textEn),
        correctAnswer: q.correctOptionIds?.[0],
      });
    }
    setLearner({ ...learner, submitted: true });
  }, [broadcast, learner, questions, quiz, sessionId, userId, userName]);

  // Time's up: send whatever was answered (or just lock an empty quiz). Checked on each tick.
  useEffect(() => {
    onTick.current = () => {
      if (!quiz || learner.submitted || anyRevealed || remainingSeconds(quiz) > 0) return;
      const hasAnswer = Object.values(learner.answers).some((v) => v.length > 0);
      if (hasAnswer) submit();
      else setLearner({ ...learner, submitted: true });
    };
  });

  const dismiss = useCallback(() => setRoom((prev) => ({ ...prev, dismissed: true })), []);
  const reopen = useCallback(() => setRoom((prev) => ({ ...prev, dismissed: false })), []);

  return {
    quiz,
    questions,
    visible: Boolean(quiz) && !room.dismissed,
    answers: learner.answers,
    submitted: learner.submitted,
    locked,
    remaining,
    anyRevealed,
    revealFor,
    setAnswer,
    submit,
    dismiss,
    reopen,
    handleEvent,
    requestSync,
  };
}

export type LiveQuizController = ReturnType<typeof useLiveQuiz>;
