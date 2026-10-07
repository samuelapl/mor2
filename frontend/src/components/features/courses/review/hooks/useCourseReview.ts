'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLms } from '@/lib/lms-store';
import { fetchAssessmentWithAnswers, fetchCourseAssessments } from '@/lib/api/quiz';
import type { ApiAssessment } from '@/lib/api/types';
import type { AssessmentsByScope, ReviewNode, ReviewNodeType } from '../types';

const EMPTY_SCOPE: AssessmentsByScope = { all: [], final: [], byModule: {}, byLesson: {} };

const NODE_TYPES: ReviewNodeType[] = [
  'OVERVIEW',
  'MODULE',
  'LESSON',
  'SUB_LESSON',
  'MODULE_ASSESSMENT',
  'LESSON_ASSESSMENT',
  'FINAL_ASSESSMENT',
  'SESSION_PLAN',
  'APPROVAL_HISTORY',
];

/** `#type=MODULE&moduleId=…` ⇄ ReviewNode, so a link can open a specific item. */
function nodeFromHash(hash: string): ReviewNode {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const type = params.get('type') as ReviewNodeType | null;
  if (!type || !NODE_TYPES.includes(type)) return { type: 'OVERVIEW' };
  return {
    type,
    moduleId: params.get('moduleId') ?? undefined,
    lessonId: params.get('lessonId') ?? undefined,
    subLessonId: params.get('subLessonId') ?? undefined,
    sessionPlanId: params.get('sessionPlanId') ?? undefined,
  };
}

function nodeToHash(node: ReviewNode): string {
  if (node.type === 'OVERVIEW') return '';
  const params = new URLSearchParams({ type: node.type });
  if (node.moduleId) params.set('moduleId', node.moduleId);
  if (node.lessonId) params.set('lessonId', node.lessonId);
  if (node.subLessonId) params.set('subLessonId', node.subLessonId);
  if (node.sessionPlanId) params.set('sessionPlanId', node.sessionPlanId);
  return `#${params.toString()}`;
}

function groupAssessments(list: ApiAssessment[]): AssessmentsByScope {
  const scope: AssessmentsByScope = { all: list, final: [], byModule: {}, byLesson: {} };
  for (const a of list) {
    const type = a.type ?? 'FINAL_ASSESSMENT';
    if (type === 'FINAL_ASSESSMENT') scope.final.push(a);
    else if (type === 'MODULE_ASSESSMENT' && a.moduleId) scope.byModule[a.moduleId] = a;
    else if (type !== 'SESSION_ASSESSMENT' && a.lessonId) scope.byLesson[a.lessonId] = a;
  }
  return scope;
}

/** Loads the course under review plus every assessment (with answers) and tracks the selected item. */
export function useCourseReview(courseId: string) {
  const { ready, courseById, refreshCourse } = useLms();
  const course = courseById(courseId);

  // The store is loaded once at sign-in; re-fetch this course so scheduling, trainer and
  // quiz changes made elsewhere since then show up here.
  const [detailLoaded, setDetailLoaded] = useState(false);
  useEffect(() => {
    if (!ready || !courseId) return;
    let cancelled = false;
    void refreshCourse(courseId).finally(() => {
      if (!cancelled) setDetailLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, courseId, refreshCourse]);

  const [assessments, setAssessments] = useState<AssessmentsByScope>(EMPTY_SCOPE);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setAssessmentsLoading(true);
    (async () => {
      try {
        const list = await fetchCourseAssessments(courseId);
        const details = await Promise.all(list.map((item) => fetchAssessmentWithAnswers(item.id).catch(() => null)));
        if (!cancelled) {
          // The listing carries type/moduleId/lessonId even when the detail call omits them.
          const merged = details.flatMap((d, i) => (d ? [{ ...list[i], ...d } as ApiAssessment] : []));
          setAssessments(groupAssessments(merged));
        }
      } catch {
        if (!cancelled) setAssessments(EMPTY_SCOPE);
      } finally {
        if (!cancelled) setAssessmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, reloadKey]);

  const [selectedNode, setSelectedNodeState] = useState<ReviewNode>({ type: 'OVERVIEW' });

  useEffect(() => {
    const sync = () => setSelectedNodeState(nodeFromHash(window.location.hash));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const setSelectedNode = useCallback((node: ReviewNode) => {
    setSelectedNodeState(node);
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}${nodeToHash(node)}`);
  }, []);

  const reloadAssessments = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    ready,
    detailLoaded,
    course,
    refreshCourse: () => refreshCourse(courseId),
    assessments,
    assessmentsLoading,
    reloadAssessments,
    selectedNode,
    setSelectedNode,
  };
}
