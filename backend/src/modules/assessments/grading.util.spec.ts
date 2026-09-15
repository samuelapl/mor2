import { computeResult, gradeAnswers, GradableQuestion, RawAnswer } from './grading.util';

const questions: GradableQuestion[] = [
  { id: 'q1', correctAnswer: 1 },
  { id: 'q2', correctAnswer: 1 },
  { id: 'q3', correctAnswer: 'yes' },
];

describe('gradeAnswers', () => {
  it('marks correct and incorrect options', () => {
    const answers: RawAnswer[] = [
      { questionId: 'q1', selectedOption: 1 },
      { questionId: 'q2', selectedOption: 0 },
      { questionId: 'q3', selectedOption: 'yes' },
    ];
    const graded = gradeAnswers(questions, answers);
    expect(graded.map((g) => g.isCorrect)).toEqual([true, false, true]);
  });

  it('handles unknown questions as incorrect', () => {
    const graded = gradeAnswers(questions, [{ questionId: 'nope', selectedOption: 1 }]);
    expect(graded[0].isCorrect).toBe(false);
  });

  it('handles empty answers', () => {
    expect(gradeAnswers(questions, [])).toEqual([]);
  });
});

describe('computeResult', () => {
  it('computes a passing score', () => {
    const graded = [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: true },
      { questionId: 'q3', isCorrect: false },
    ];
    const result = computeResult(graded, 3, 60);
    expect(result).toMatchObject({ score: 67, passed: true, correctCount: 2, totalQuestions: 3 });
  });

  it('computes a failing score', () => {
    const graded = [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: false },
      { questionId: 'q3', isCorrect: false },
    ];
    expect(computeResult(graded, 3, 60).passed).toBe(false);
  });

  it('never passes with zero questions', () => {
    expect(computeResult([], 0, 60)).toMatchObject({ score: 0, passed: false });
  });
});
