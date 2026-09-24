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
  if (!Array.isArray(answers)) return [];
  return answers.map((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    const isCorrect = question?.correctAnswer === answer.selectedOption;
    return {
      questionId: answer.questionId ?? '',
      selectedOption: answer.selectedOption,
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
