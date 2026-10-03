/**
 * LiveKit WebRTC Data Channel Event Contracts for Mobile Live Sessions.
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
  timeLimitSeconds: number;
  startedAt: number;
  trainerName?: string;
  quizTitle?: string;
}

export interface LiveQuizRevealPayload {
  questionId: string;
  correctOptionIds: string[];
  explanationEn?: string;
  explanationAm?: string;
  distribution: Record<string, number>;
  totalResponses: number;
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
      type: 'HAND_RAISE';
      payload: {
        userId: string;
        userName: string;
        raised: boolean;
        timestamp: number;
      };
    }
  | {
      type: 'CHAT_MESSAGE';
      payload: {
        id: string;
        userId: string;
        sender: string;
        text: string;
        time: string;
      };
    }
  | {
      type: 'ANNOUNCEMENT';
      payload: {
        id?: string;
        text?: string;
        message?: string;
        sender?: string;
      };
    };
