export interface GradableQuestion {
  id: string;
  correctAnswer?: number | string;
}

export interface RawAnswer {
  questionId?: string;
  selectedOption?: number | string;
}

export interface GradedAnswer {
  questionId: string;
  selectedOption?: number | string;
  isCorrect: boolean;
}

export function gradeAnswers(questions: GradableQuestion[], answers: RawAnswer[]): GradedAnswer[] {
  const byQuestion = new Map<string, RawAnswer>();
  for (const a of Array.isArray(answers) ? answers : []) {
    if (a?.questionId) byQuestion.set(a.questionId, a); // one answer per question
  }
  return questions.map((q) => {
    const answer = byQuestion.get(q.id);
    const isCorrect =
      answer?.selectedOption !== undefined &&
      q.correctAnswer !== undefined &&
      q.correctAnswer === answer.selectedOption;
    return {
      questionId: q.id,
      selectedOption: answer?.selectedOption,
      isCorrect,
    };
  });
}

export function computeResult(
  graded: GradedAnswer[],
  totalQuestions: number,
  passingScore: number,
): { score: number; passed: boolean; correctCount: number; totalQuestions: number } {
  const correctCount = graded.filter((a) => a.isCorrect).length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  return {
    score,
    passed: totalQuestions > 0 && score >= passingScore,
    correctCount,
    totalQuestions,
  };
}
