import type { LessonDraft, ModuleDraft } from '../wizard-types';
import type { SessionPlanDraft } from './types';

/** A module's checkpoint quiz is stored as an ASSESSMENT row among its lessons. */
export const isModuleAssessmentLesson = (l: LessonDraft) =>
  l.contentType === 'ASSESSMENT' || l.contentType === 'QUIZ' || l.title.toLowerCase().includes('module assessment');

/** A lesson's checkpoint quiz is stored as an ASSESSMENT sub-lesson. */
export const isLessonAssessmentSub = (s: LessonDraft) =>
  s.contentType === 'ASSESSMENT' || s.contentType === 'QUIZ' || s.title.toLowerCase().includes('lesson assessment');

const hasQuestions = (l: LessonDraft) => (l.quizQuestions?.length ?? 0) > 0;

/**
 * Sum of the weights that will actually be saved. A lesson, module or final assessment
 * without questions is not created on save (see syncCurriculumAndAssessments), so its weight
 * does not count. Session quizzes always count: their questions are prepared after approval.
 * The backend applies the same rule when a course is submitted (common/utils/weights.util.ts).
 */
export function computeWeightTotal(
  modules: ModuleDraft[],
  final: { weight: number; questionCount: number },
  sessionPlans: SessionPlanDraft[] = [],
): number {
  let total = final.questionCount > 0 ? final.weight || 0 : 0;
  for (const plan of sessionPlans) for (const quiz of plan.quizzes) total += quiz.weight || 0;
  for (const m of modules) {
    for (const l of m.lessons) {
      if (isModuleAssessmentLesson(l)) {
        if (hasQuestions(l)) total += l.quizWeight ?? 0;
        continue;
      }
      for (const s of l.subLessons ?? []) {
        if (isLessonAssessmentSub(s) && hasQuestions(s)) total += s.quizWeight ?? 0;
      }
    }
  }
  return total;
}

/** True when the course will have at least one graded assessment. */
export function hasAnyAssessment(modules: ModuleDraft[], finalQuestionCount: number, sessionPlans: SessionPlanDraft[] = []): boolean {
  return (
    finalQuestionCount > 0 ||
    sessionPlans.some((p) => p.quizzes.length > 0) ||
    modules.some((m) =>
      m.lessons.some((l) =>
        isModuleAssessmentLesson(l) ? hasQuestions(l) : (l.subLessons ?? []).some((s) => isLessonAssessmentSub(s) && hasQuestions(s)),
      ),
    )
  );
}

/** Sum of an assessment's question points. */
export const totalQuestionPoints = (questions: { points: number }[] = []) =>
  questions.reduce((sum, q) => sum + (q.points || 0), 0);

/**
 * One point is one percent of the course grade, so a 20% assessment's questions must total
 * 20 points. A 0% (practice) assessment or one without questions has no required total.
 * Returns the mismatch, or null when the points are right. The backend checks the same rule
 * on submit (common/utils/weights.util.ts).
 */
export function pointsMismatch(
  questions: { points: number }[] = [],
  weight: number,
): { total: number; required: number } | null {
  if (!weight || questions.length === 0) return null;
  const total = totalQuestionPoints(questions);
  return total === weight ? null : { total, required: weight };
}
