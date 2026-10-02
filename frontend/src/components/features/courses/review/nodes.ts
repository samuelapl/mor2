import type { ApiAssessment } from '@/lib/api/types';
import type { Course } from '@/types';
import type { AssessmentsByScope, ReviewNode } from './types';

export const nodeKey = (n: ReviewNode) => [n.type, n.moduleId ?? '', n.lessonId ?? '', n.subLessonId ?? ''].join(':');

export const sameNode = (a: ReviewNode, b: ReviewNode) => nodeKey(a) === nodeKey(b);

/**
 * Every node in sidebar order. The sidebar renders from the same structure and the
 * Previous/Next buttons walk it, so the two can never disagree.
 */
export function buildNodeOrder(course: Course, assessments: AssessmentsByScope): ReviewNode[] {
  const order: ReviewNode[] = [{ type: 'OVERVIEW' }];
  for (const m of course.modules) {
    order.push({ type: 'MODULE', moduleId: m.id });
    for (const l of m.lessons) {
      order.push({ type: 'LESSON', moduleId: m.id, lessonId: l.id });
      for (const s of l.subLessons ?? []) {
        order.push({ type: 'SUB_LESSON', moduleId: m.id, lessonId: l.id, subLessonId: s.id });
      }
      if (assessments.byLesson[l.id]) order.push({ type: 'LESSON_ASSESSMENT', moduleId: m.id, lessonId: l.id });
    }
    if (assessments.byModule[m.id]) order.push({ type: 'MODULE_ASSESSMENT', moduleId: m.id });
  }
  if (assessments.final.length > 0) order.push({ type: 'FINAL_ASSESSMENT' });
  order.push({ type: 'APPROVAL_HISTORY' });
  return order;
}

/** Problems a reviewer should notice: an assessment that cannot be taken as written. */
export function assessmentIssues(a: ApiAssessment | undefined): string[] {
  if (!a) return [];
  const issues: string[] = [];
  if (!a.questions?.length) issues.push('Has no questions');
  a.questions?.forEach((q, i) => {
    if (!q.question?.trim()) issues.push(`Question ${i + 1} has no text`);
    else if ((q.type === 'MULTIPLE_CHOICE' || !q.type) && (q.options ?? []).some((o) => !String(o).trim()))
      issues.push(`Question ${i + 1} has blank options`);
  });
  return issues;
}

/** Same pre-flight rules as the creator's ReviewSubmitStage, keyed by node so the sidebar can flag them. */
export function buildIssueMap(course: Course, assessments: AssessmentsByScope): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const add = (node: ReviewNode, issues: string[]) => {
    if (issues.length) map[nodeKey(node)] = [...(map[nodeKey(node)] ?? []), ...issues];
  };

  const overview: string[] = [];
  if (!course.title?.trim()) overview.push('Title is missing');
  if (course.modules.length === 0) overview.push('Course has no modules');
  add({ type: 'OVERVIEW' }, overview);

  for (const m of course.modules) {
    const moduleIssues: string[] = [];
    if (!m.title?.trim()) moduleIssues.push('Module title is missing');
    if (m.lessons.length === 0) moduleIssues.push('Module has no lessons');
    add({ type: 'MODULE', moduleId: m.id }, moduleIssues);
    add({ type: 'MODULE_ASSESSMENT', moduleId: m.id }, assessmentIssues(assessments.byModule[m.id]));

    for (const l of m.lessons) {
      if (!l.title?.trim()) add({ type: 'LESSON', moduleId: m.id, lessonId: l.id }, ['Lesson title is missing']);
      add({ type: 'LESSON_ASSESSMENT', moduleId: m.id, lessonId: l.id }, assessmentIssues(assessments.byLesson[l.id]));
    }
  }

  add({ type: 'FINAL_ASSESSMENT' }, assessments.final.flatMap(assessmentIssues));
  return map;
}
