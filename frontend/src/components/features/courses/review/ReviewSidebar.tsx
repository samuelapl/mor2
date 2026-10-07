'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  FileText,
  Headphones,
  History,
  Paperclip,
  Presentation,
  Video,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { ApiAssessment } from '@/lib/api/types';
import type { Course } from '@/types';
import { getItemAttachments } from '../wizard-components';
import { nodeKey, sameNode } from './nodes';
import type { AssessmentsByScope, ReviewNode } from './types';

interface ReviewSidebarProps {
  course: Course;
  assessments: AssessmentsByScope;
  selectedNode: ReviewNode;
  onSelectNode: (node: ReviewNode) => void;
  issues: Record<string, string[]>;
}

function lessonIcon(contentType?: string) {
  switch ((contentType ?? '').toUpperCase()) {
    case 'VIDEO':
      return Video;
    case 'AUDIO':
      return Headphones;
    case 'PRESENTATION':
      return Presentation;
    case 'ASSIGNMENT':
      return ClipboardList;
    default:
      return FileText;
  }
}

function cleanLessonTitle(title: string): string {
  if (!title) return '';
  return title.replace(/^(Lesson\s*)?(\d+\.)*\d*\s*[:\-–]?\s*/i, '').trim() || title;
}

export function ReviewSidebar({ course, assessments, selectedNode, onSelectNode, issues }: ReviewSidebarProps) {
  const { tBilingual } = useTranslation();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedLessons, setCollapsedLessons] = useState<Set<string>>(new Set());

  const toggle = (moduleId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });

  const toggleLesson = (lessonId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setCollapsedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  // Auto-expand lesson dropdown if selected node is inside this lesson
  React.useEffect(() => {
    if (selectedNode && 'lessonId' in selectedNode && selectedNode.lessonId) {
      const lessonId = selectedNode.lessonId;
      setCollapsedLessons((prev) => {
        if (!prev.has(lessonId)) return prev;
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  }, [selectedNode]);

  const issueCount = Object.values(issues).reduce((n, list) => n + list.length, 0);

  // Up/Down moves focus between nodes; Enter/Space selects. Same behaviour as the creator sidebar.
  const handleTreeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('role') !== 'button') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      target.click();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="button"][tabindex="0"]'));
    nodes[nodes.indexOf(target) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
  };

  const node = (n: ReviewNode, content: React.ReactNode, indent = 0) => {
    const active = sameNode(selectedNode, n);
    const nodeIssues = issues[nodeKey(n)];
    return (
      <div
        role="button"
        tabIndex={0}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelectNode(n)}
        title={nodeIssues?.join('\n')}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-400',
          active ? 'bg-indigo-600 font-semibold text-white shadow-xs' : 'text-slate-700 hover:bg-white',
        )}
        style={{ marginLeft: indent * 14 }}
      >
        {content}
        {nodeIssues?.length ? <AlertTriangle className={cn('ml-auto h-3.5 w-3.5 shrink-0', active ? 'text-amber-200' : 'text-amber-500')} /> : null}
      </div>
    );
  };

  const assessmentNode = (n: ReviewNode, a: ApiAssessment, label: string, indent: number) =>
    node(
      n,
      <>
        <FileQuestion className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <span className="min-w-0 flex-1 truncate">{a.titleEn || label}</span>
        <span className="shrink-0 rounded bg-black/5 px-1 text-[10px] font-bold">{a.weight ?? 0}%</span>
      </>,
      indent,
    );

  const fileBadge = (count: number) =>
    count > 0 ? (
      <span className="flex shrink-0 items-center gap-0.5 text-[10px] opacity-70">
        <Paperclip className="h-3 w-3" />
        {count}
      </span>
    ) : null;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50/70">
      <div className="shrink-0 border-b border-slate-200/80 bg-white/80 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{tBilingual('Course Structure', 'የኮርስ መዋቅር')}</span>
          {issueCount > 0 ? (
            <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {issueCount} {tBilingual(issueCount === 1 ? 'issue' : 'issues', 'ችግሮች')}
            </span>
          ) : (
            <span className="rounded-full border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {course.modules.length} {tBilingual('Modules', 'ሞጁሎች')}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3" onKeyDown={handleTreeKeyDown}>
        {node(
          { type: 'OVERVIEW' },
          <>
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{tBilingual('Course Overview', 'የኮርስ አጠቃላይ እይታ')}</span>
          </>,
        )}

        {course.modules.map((m, mIdx) => {
          const isCollapsed = collapsed.has(m.id);
          const moduleAssessment = assessments.byModule[m.id];
          return (
            <div key={m.id} className="space-y-0.5 pt-1">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  className="flex h-6 w-5 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700"
                  aria-label={isCollapsed ? 'Expand module' : 'Collapse module'}
                >
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  {node(
                    { type: 'MODULE', moduleId: m.id },
                    <>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-black/5 text-[10px] font-bold">{mIdx + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{m.title || tBilingual('Untitled module', 'ርዕስ የሌለው ሞጁል')}</span>
                      <span className="shrink-0 text-[10px] opacity-70">{m.lessons.length}</span>
                      {fileBadge(getItemAttachments(m).length)}
                    </>,
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {m.lessons.map((l, lIdx) => {
                    const Icon = lessonIcon(l.contentType);
                    const lessonAssessment = assessments.byLesson[l.id];
                    const subLessons = l.subLessons ?? [];
                    const hasSubLessons = subLessons.length > 0;
                    const isLessonCollapsed = collapsedLessons.has(l.id);

                    return (
                      <React.Fragment key={l.id}>
                        <div className="flex items-center">
                          {hasSubLessons && (
                            <button
                              type="button"
                              onClick={(e) => toggleLesson(l.id, e)}
                              className="flex h-5 w-4 shrink-0 items-center justify-center text-slate-400 hover:text-slate-700 ml-1.5"
                              aria-label={isLessonCollapsed ? 'Expand sub-lessons' : 'Collapse sub-lessons'}
                            >
                              {isLessonCollapsed ? (
                                <ChevronRight className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            {node(
                              { type: 'LESSON', moduleId: m.id, lessonId: l.id },
                              <>
                                <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                <span className="min-w-0 flex-1 truncate">
                                  {mIdx + 1}.{lIdx + 1} {cleanLessonTitle(l.title) || tBilingual('Untitled lesson', 'ርዕስ የሌለው ትምህርት')}
                                </span>
                                {hasSubLessons && isLessonCollapsed && (
                                  <span className="shrink-0 rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                                    {subLessons.length}
                                  </span>
                                )}
                                {l.durationMin ? <span className="shrink-0 text-[10px] opacity-70">{l.durationMin}m</span> : null}
                                {fileBadge(getItemAttachments(l).length)}
                              </>,
                              hasSubLessons ? 0.5 : 1.5,
                            )}
                          </div>
                        </div>

                        {hasSubLessons && !isLessonCollapsed && (
                          <div className="border-l border-slate-200 ml-5 pl-2 space-y-0.5 my-0.5">
                            {subLessons.map((s) => {
                              const SubIcon = lessonIcon(s.contentType);
                              return (
                                <React.Fragment key={s.id}>
                                  {node(
                                    { type: 'SUB_LESSON', moduleId: m.id, lessonId: l.id, subLessonId: s.id },
                                    <>
                                      <SubIcon className="h-3 w-3 shrink-0 opacity-70" />
                                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                                      {fileBadge(getItemAttachments(s).length)}
                                    </>,
                                    1,
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}

                        {lessonAssessment &&
                          assessmentNode(
                            { type: 'LESSON_ASSESSMENT', moduleId: m.id, lessonId: l.id },
                            lessonAssessment,
                            tBilingual('Lesson Assessment', 'የትምህርት ምዘና'),
                            3,
                          )}
                      </React.Fragment>
                    );
                  })}
                  {moduleAssessment &&
                    assessmentNode({ type: 'MODULE_ASSESSMENT', moduleId: m.id }, moduleAssessment, tBilingual('Module Assessment', 'የሞጁል ምዘና'), 1.5)}
                </div>
              )}
            </div>
          );
        })}

        {(course.sessionPlans?.length ?? 0) > 0 && (
          <div className="space-y-0.5 border-t border-slate-200/80 pt-2">
            <p className="flex items-center gap-1.5 px-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
              <Video className="h-3 w-3" />
              {tBilingual('Online Sessions', 'የኦንላይን ክፍለ-ጊዜዎች')}
            </p>
            {course.sessionPlans!.map((plan, i) => {
              const weight = plan.quizzes.reduce((sum, q) => sum + (q.weight || 0), 0);
              return (
                <React.Fragment key={plan.id}>
                  {node(
                    { type: 'SESSION_PLAN', sessionPlanId: plan.id },
                    <>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-black/5 text-[10px] font-bold">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{plan.titleEn || tBilingual('Untitled session', 'ርዕስ የሌለው ክፍለ-ጊዜ')}</span>
                      {plan.quizzes.length > 0 && (
                        <span className="shrink-0 rounded bg-black/5 px-1 text-[10px] font-bold">
                          {plan.quizzes.length}Q · {weight}%
                        </span>
                      )}
                    </>,
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <div className="space-y-1 border-t border-slate-200/80 pt-2">
          {assessments.final.length > 0 ? (
            node(
              { type: 'FINAL_ASSESSMENT' },
              <>
                <Award className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {assessments.final[0].titleEn || tBilingual('Final Assessment', 'የማጠቃለያ ምዘና')}
                </span>
                <span className="shrink-0 rounded bg-black/5 px-1 text-[10px] font-bold">
                  {assessments.final.reduce((n, a) => n + (a.weight ?? 0), 0)}%
                </span>
              </>,
            )
          ) : (
            <p className="flex items-center gap-2 px-2 py-1.5 text-xs italic text-slate-400">
              <Award className="h-3.5 w-3.5" />
              {tBilingual('No final assessment', 'የማጠቃለያ ምዘና የለም')}
            </p>
          )}
          {node(
            { type: 'APPROVAL_HISTORY' },
            <>
              <History className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{tBilingual('Approval History', 'የማጽደቅ ታሪክ')}</span>
            </>,
          )}
        </div>
      </div>
    </aside>
  );
}
