/**
 * LiveKit data-channel contract shared with the web room (frontend/src/types/livekit-events.ts).
 * Keep in sync: these JSON packets are how trainers (web) and learners (web + mobile) interoperate.
 */
export interface LiveQuizOption {
  id: string;
  textEn: string;
  textAm?: string;
}

export interface LiveQuizPayload {
  id: string;
  titleEn: string;
  titleAm?: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  options: LiveQuizOption[];
  timeLimitSeconds: number; // e.g. 15, 30, 45, 60
  startedAt: number; // epoch ms
  trainerName?: string;
  correctOptionIds?: string[];
  explanationEn?: string;
  explanationAm?: string;
  questionIndex?: number;
  totalQuestions?: number;
  allQuestions?: LiveQuizPayload[];
  quizTitle?: string;
}

export interface LiveQuizRevealPayload {
  questionId: string;
  correctOptionIds: string[];
  explanationEn?: string;
  explanationAm?: string;
  distribution: Record<string, number>; // optionId -> vote count
  totalResponses: number;
  allReveals?: Record<
    string,
    {
      correctOptionIds: string[];
      explanationEn?: string;
      explanationAm?: string;
      distribution?: Record<string, number>;
      totalResponses?: number;
    }
  >;
}

export type LiveKitDataEvent =
  | {
      type: 'QUIZ_START';
      payload: LiveQuizPayload;
    }
  | {
      type: 'QUIZ_ANSWER';
      payload: {
        questionId: string;
        userId: string;
        userName: string;
        selectedOptionIds: string[];
        submittedAt: number;
        responseDurationSeconds: number;
        allAnswers?: Record<string, string[]>;
      };
    }
  | {
      type: 'QUIZ_REVEAL';
      payload: LiveQuizRevealPayload;
    }
  | {
      type: 'QUIZ_CLOSE';
      payload: {
        questionId: string;
      };
    }
  | {
      type: 'QUIZ_SYNC_REQUEST';
      payload?: {
        userId?: string;
        requesterId?: string;
      };
    }
  | {
      type: 'QUIZ_SYNC_RESPONSE';
      payload: {
        activeQuiz: LiveQuizPayload | null;
        answers?: Record<
          string,
          {
            userId: string;
            userName: string;
            selectedOptionIds: string[];
            submittedAt?: number;
            responseDurationSeconds?: number;
          }
        >;
        revealData?: LiveQuizRevealPayload | null;
        revealsByQuestionId?: Record<string, LiveQuizRevealPayload>;
        quizHistory?: unknown[];
      };
    }
  | {
      type: 'HAND_RAISE';
      payload: {
        userId: string;
        userName: string;
        raised: boolean;
        timestamp: number;
      };
    };

export interface RaisedHandEntry {
  userId: string;
  userName: string;
  timestamp: number;
}
