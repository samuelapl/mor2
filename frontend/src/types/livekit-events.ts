/**
 * LiveKit WebRTC Data Channel Event Contracts (Phase 2)
 * Sub-50ms real-time event broadcasting for live quizzes, polls, and hand-raising.
 */

export interface LiveQuizOption {
  id: string;
  textEn: string;
  textAm?: string;
}

export type LiveKitDataEvent =
  | {
      type: "QUIZ_START";
      payload: {
        id: string;
        titleEn: string;
        titleAm?: string;
        type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
        options: LiveQuizOption[];
        timeLimitSeconds: number; // e.g. 15, 30, 45, 60
        startedAt: number; // epoch ms
        trainerName?: string;
      };
    }
  | {
      type: "QUIZ_ANSWER";
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
      type: "QUIZ_REVEAL";
      payload: {
        questionId: string;
        correctOptionIds: string[];
        explanationEn?: string;
        explanationAm?: string;
        distribution: Record<string, number>; // optionId -> vote count
        totalResponses: number;
      };
    }
  | {
      type: "QUIZ_CLOSE";
      payload: {
        questionId: string;
      };
    }
  | {
      type: "HAND_RAISE";
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

