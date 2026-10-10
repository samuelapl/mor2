'use client';

import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileQuestion,
  FileText,
  Headphones,
  Layers,
  Plus,
  Presentation,
  Trash2,
  Video,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { LessonDraft, ModuleDraft } from '../wizard-types';
import type { CreatorActiveNode, SessionPlanDraft } from './types';
import { cn } from '@/lib/utils';

interface CreatorSidebarProps {
  activeNode: CreatorActiveNode;
  onSelectNode: (node: CreatorActiveNode) => void;
  modules: ModuleDraft[];
  courseTitle: string;
  finalAssessmentWeight?: number;
  finalQuestionCount?: number;
  onAddModule: () => void;
  onAddLesson: (moduleId: string) => void;
  onAddSubLesson: (moduleId: string, lessonId: string) => void;
  onAddModuleAssessment: (moduleId: string) => void;
  onAddLessonAssessment: (moduleId: string, lessonId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onDeleteSubLesson: (moduleId: string, lessonId: string, subLessonId: string) => void;
  onDeleteModuleAssessment: (moduleId: string) => void;
  onDeleteLessonAssessment: (moduleId: string, lessonId: string) => void;
  /** Planned online sessions; the group is shown only when the course includes them. */
  showSessions?: boolean;
  sessionPlans?: SessionPlanDraft[];
  onAddSessionPlan?: () => void;
  onDeleteSessionPlan?: (sessionPlanId: string) => void;
}

export function CreatorSidebar({
  activeNode,
  onSelectNode,
  modules,
  courseTitle,
  finalAssessmentWeight = 60,
  finalQuestionCount = 0,
  onAddModule,
  onAddLesson,
  onAddSubLesson,
  onAddModuleAssessment,
  onAddLessonAssessment,
  onDeleteModule,
  onDeleteLesson,
  onDeleteSubLesson,
  onDeleteModuleAssessment,
  onDeleteLessonAssessment,
  showSessions = false,
  sessionPlans = [],
  onAddSessionPlan,
  onDeleteSessionPlan,
}: CreatorSidebarProps) {
  const { tBilingual } = useTranslation();
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [collapsedLessons, setCollapsedLessons] = useState<Set<string>>(new Set());

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const toggleLessonCollapse = (lessonId: string, e?: React.MouseEvent) => {
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

  // Auto-expand lesson dropdown if active node is inside this lesson
  React.useEffect(() => {
    if ((activeNode.type === 'SUB_LESSON' || activeNode.type === 'LESSON_ASSESSMENT') && activeNode.lessonId) {
      setCollapsedLessons((prev) => {
        if (!prev.has(activeNode.lessonId!)) return prev;
        const next = new Set(prev);
        next.delete(activeNode.lessonId!);
        return next;
      });
    }
  }, [activeNode]);

  const getLessonIcon = (contentType?: string) => {
    switch (contentType) {
      case 'VIDEO':
        return Video;
      case 'AUDIO':
        return Headphones;
      case 'PRESENTATION':
        return Presentation;
      case 'ASSIGNMENT':
        return ClipboardList;
      case 'ASSESSMENT':
      case 'QUIZ':
        return FileQuestion;
      default:
        return FileText;
    }
  };

  // Up/Down moves focus between tree nodes; Enter/Space selects the focused node.
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
    const next = nodes[nodes.indexOf(target) + (e.key === 'ArrowDown' ? 1 : -1)];
    next?.focus();
  };

  const isModuleActive = (moduleId: string) => activeNode.type === 'MODULE' && activeNode.moduleId === moduleId;

  const isLessonActive = (lessonId: string) => activeNode.type === 'LESSON' && activeNode.lessonId === lessonId;

  const isSubLessonActive = (subId: string) => activeNode.type === 'SUB_LESSON' && activeNode.subLessonId === subId;

  const isModAssessmentActive = (moduleId: string) => activeNode.type === 'MODULE_ASSESSMENT' && activeNode.moduleId === moduleId;

  const isLesAssessmentActive = (lessonId: string) => activeNode.type === 'LESSON_ASSESSMENT' && activeNode.lessonId === lessonId;

  return (
    <aside className="w-80 lg:w-96 shrink-0 border-r border-slate-200 bg-slate-50/70 flex flex-col h-full overflow-hidden">
      {/* Sidebar Header / Structure Summary */}
      <div className="p-4 border-b border-slate-200/80 bg-white/80 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{tBilingual('Course Structure', 'የኮርስ መዋቅር')}</span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
            {modules.length} {tBilingual('Modules', 'ሞጁሎች')}
          </span>
        </div>
      </div>

      {/* Scrollable Tree Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" onKeyDown={handleTreeKeyDown}>
        {/* 1. Course Details Node */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectNode({ type: 'COURSE_DETAILS' })}
          className={cn(
            'flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer group',
            activeNode.type === 'COURSE_DETAILS'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-indigo-200 hover:bg-white/90 shadow-2xs',
          )}
        >
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition',
              activeNode.type === 'COURSE_DETAILS' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100',
            )}
          >
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold truncate">{courseTitle.trim() || tBilingual('Course Overview & Details', 'የኮርስ አጠቃላይ እይታ እና ዝርዝሮች')}</h4>
            <p className={cn('text-[11px] truncate', activeNode.type === 'COURSE_DETAILS' ? 'text-indigo-100' : 'text-slate-500')}>
              {tBilingual('General settings, goals & syllabus', 'አጠቃላይ ቅንብሮች፣ ግቦች እና ይዘት')}
            </p>
          </div>
        </div>

        {/* 2. Modules Tree */}
        {modules.map((mod, modIdx) => {
          const isCollapsed = collapsedModules.has(mod.id);
          const hasModuleAssessment = mod.lessons.some(
            (l) => l.contentType === 'ASSESSMENT' || l.contentType === 'QUIZ' || l.title.toLowerCase().includes('module assessment'),
          );
          const instructionalLessons = mod.lessons.filter(
            (l) => l.contentType !== 'ASSESSMENT' && l.contentType !== 'QUIZ' && !l.title.toLowerCase().includes('module assessment'),
          );

          return (
            <div key={mod.id} className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs transition">
              {/* Module Header Bar */}
              <div
                className={cn(
                  'flex items-center justify-between p-2.5 transition',
                  isModuleActive(mod.id)
                    ? 'bg-indigo-50/70 border-b border-indigo-100 text-indigo-900 font-bold'
                    : 'hover:bg-slate-50 text-slate-800',
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleModuleCollapse(mod.id)}
                  className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer select-none"
                >
                  <button type="button" className="p-1 text-slate-400 hover:text-slate-600 rounded">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode({ type: 'MODULE', moduleId: mod.id });
                    }}
                    className="min-w-0 flex-1"
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {tBilingual(`Module ${modIdx + 1}`, `ሞጁል ${modIdx + 1}`)}
                    </span>
                    <h4 className="text-xs font-bold truncate">{mod.title.trim() || tBilingual('Untitled Module', 'ርዕስ አልባ ሞጁል')}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                    {instructionalLessons.length} {tBilingual('lessons', 'ትምህርቶች')}
                  </span>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteModule(mod.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title={tBilingual('Delete Module', 'ሞጁሉን ሰርዝ')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Module Content Tree (When Expanded) */}
              {!isCollapsed && (
                <div className="p-2 space-y-1 bg-slate-50/30 border-t border-slate-100">
                  {/* Instructional Lessons */}
                  {instructionalLessons.map((lesson, lIdx) => {
                    const Icon = getLessonIcon(lesson.contentType);
                    const subLessons = (lesson.subLessons ?? []).filter(
                      (s) => s.contentType !== 'ASSESSMENT' && s.contentType !== 'QUIZ' && !s.title.toLowerCase().includes('lesson assessment'),
                    );
                    const hasLessonAssessment = (lesson.subLessons ?? []).some(
                      (s) => s.contentType === 'ASSESSMENT' || s.contentType === 'QUIZ' || s.title.toLowerCase().includes('lesson assessment'),
                    );

                    const hasSubLessons = subLessons.length > 0;
                    const isLessonCollapsed = collapsedLessons.has(lesson.id);

                    return (
                      <div key={lesson.id} className="space-y-1">
                        {/* Parent Lesson Item */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            onSelectNode({
                              type: 'LESSON',
                              moduleId: mod.id,
                              lessonId: lesson.id,
                            });
                            if (hasSubLessons && isLessonCollapsed) {
                              setCollapsedLessons((prev) => {
                                const next = new Set(prev);
                                next.delete(lesson.id);
                                return next;
                              });
                            }
                          }}
                          className={cn(
                            'group flex items-center justify-between gap-2 p-2 rounded-xl text-xs transition cursor-pointer',
                            isLessonActive(lesson.id)
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60',
                          )}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {hasSubLessons && (
                              <button
                                type="button"
                                onClick={(e) => toggleLessonCollapse(lesson.id, e)}
                                title={
                                  isLessonCollapsed
                                    ? tBilingual('Expand sub-lessons', 'ንዑስ ክፍሎችን ዘርጋ')
                                    : tBilingual('Collapse sub-lessons', 'ንዑስ ክፍሎችን አጥፋ')
                                }
                                className={cn(
                                  'p-0.5 rounded transition shrink-0',
                                  isLessonActive(lesson.id)
                                    ? 'text-white/80 hover:text-white hover:bg-white/20'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60',
                                )}
                              >
                                {isLessonCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', isLessonActive(lesson.id) ? 'text-white' : 'text-indigo-600')} />
                            <span className="truncate">{lesson.title.trim() || tBilingual(`Lesson ${lIdx + 1}`, `ትምህርት ${lIdx + 1}`)}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasSubLessons && isLessonCollapsed && (
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                                  isLessonActive(lesson.id)
                                    ? 'bg-white/20 text-white border-white/30'
                                    : 'bg-slate-100 text-slate-600 border-slate-200',
                                )}
                                title={tBilingual(`${subLessons.length} sub-lessons`, `${subLessons.length} ንዑስ ክፍሎች`)}
                              >
                                {subLessons.length}
                              </span>
                            )}
                            {instructionalLessons.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLesson(mod.id, lesson.id);
                                }}
                                className={cn(
                                  'opacity-0 group-hover:opacity-100 p-0.5 rounded transition',
                                  isLessonActive(lesson.id) ? 'hover:text-rose-200' : 'text-slate-400 hover:text-rose-600',
                                )}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Nested Sub-lessons Dropdown Container */}
                        {hasSubLessons && !isLessonCollapsed && (
                          <div className="ml-3 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-1 py-1 transition-all">
                            {subLessons.map((sub, sIdx) => {
                              const SubIcon = getLessonIcon(sub.contentType);
                              return (
                                <div
                                  key={sub.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    onSelectNode({
                                      type: 'SUB_LESSON',
                                      moduleId: mod.id,
                                      lessonId: lesson.id,
                                      subLessonId: sub.id,
                                    })
                                  }
                                  className={cn(
                                    'group flex items-center justify-between gap-2 p-1.5 rounded-lg text-[11px] transition cursor-pointer',
                                    isSubLessonActive(sub.id)
                                      ? 'bg-indigo-100/90 text-indigo-950 font-bold border border-indigo-200'
                                      : 'bg-white/70 hover:bg-white text-slate-600 border border-slate-200/50 shadow-2xs',
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <SubIcon className="h-3 w-3 text-slate-500 shrink-0" />
                                    <span className="truncate">
                                      {sub.title.trim() || tBilingual(`Sub-lesson ${sIdx + 1}`, `ንዑስ ትምህርት ${sIdx + 1}`)}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteSubLesson(mod.id, lesson.id, sub.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 rounded transition"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => onAddSubLesson(mod.id, lesson.id)}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-dashed border-indigo-200 transition"
                            >
                              <Plus className="h-3 w-3" />
                              <span>{tBilingual('Add Sub-topic', 'ንዑስ ትምህርት ጨምር')}</span>
                            </button>
                          </div>
                        )}

                        {/* Lesson Assessment Checkpoint (if configured) */}
                        {hasLessonAssessment && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              onSelectNode({
                                type: 'LESSON_ASSESSMENT',
                                moduleId: mod.id,
                                lessonId: lesson.id,
                              })
                            }
                            className={cn(
                              'group flex items-center justify-between gap-2 ml-4 p-1.5 rounded-lg text-[11px] transition cursor-pointer',
                              isLesAssessmentActive(lesson.id)
                                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300 shadow-2xs'
                                : 'bg-amber-50/60 hover:bg-amber-50 text-amber-800 border border-amber-200/60',
                            )}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <FileQuestion className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span className="truncate font-semibold">{tBilingual('Lesson Assessment', 'የክፍለ-ትምህርት ምዘና')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLessonAssessment(mod.id, lesson.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-amber-600 hover:text-rose-600 rounded transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Module Assessment Checkpoint (if configured) */}
                  {hasModuleAssessment && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        onSelectNode({
                          type: 'MODULE_ASSESSMENT',
                          moduleId: mod.id,
                        })
                      }
                      className={cn(
                        'group flex items-center justify-between gap-2 p-2 rounded-xl text-xs transition cursor-pointer',
                        isModAssessmentActive(mod.id)
                          ? 'bg-emerald-700 text-white font-bold shadow-xs'
                          : 'bg-emerald-50 hover:bg-emerald-100/70 text-emerald-900 border border-emerald-200',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Award className={cn('h-4 w-4 shrink-0', isModAssessmentActive(mod.id) ? 'text-white' : 'text-emerald-600')} />
                        <span className="truncate font-bold">{tBilingual('Module Assessment', 'የሞጁል ምዘና')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteModuleAssessment(mod.id);
                        }}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 p-0.5 rounded transition',
                          isModAssessmentActive(mod.id) ? 'hover:text-rose-200' : 'text-emerald-600 hover:text-rose-600',
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Inline Action Bar for Module */}
                  <div className="pt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAddLesson(mod.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{tBilingual('Lesson', 'ትምህርት')}</span>
                    </button>

                    {!hasModuleAssessment && (
                      <button
                        type="button"
                        onClick={() => onAddModuleAssessment(mod.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-emerald-200 bg-emerald-50/50 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100/80 transition"
                      >
                        <Award className="h-3 w-3" />
                        <span>{tBilingual('Assessment', 'ምዘና')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 3. Big Add Module Button */}
        <button
          type="button"
          onClick={onAddModule}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-700 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-400 font-bold text-xs transition"
        >
          <Plus className="h-4 w-4" />
          <span>{tBilingual('Add New Module', 'አዲስ ሞጁል ጨምር')}</span>
        </button>

        {/* 3b. Planned Online Sessions */}
        {showSessions && (
          <div className="space-y-1.5 rounded-2xl border border-sky-200/80 bg-white p-2.5 shadow-2xs">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-700">
                <Video className="h-3.5 w-3.5" />
                {tBilingual('Online Sessions', 'የኦንላይን ክፍለ-ጊዜዎች')}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">{sessionPlans.length}</span>
            </div>
            {sessionPlans.map((plan, i) => {
              const active = activeNode.type === 'SESSION_PLAN' && activeNode.sessionPlanId === plan.id;
              const weight = plan.quizzes.reduce((sum, q) => sum + (q.weight || 0), 0);
              return (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectNode({ type: 'SESSION_PLAN', sessionPlanId: plan.id })}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-[11px] transition',
                    active ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-700 hover:bg-sky-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                      active ? 'bg-white/20' : 'bg-sky-50 text-sky-700',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{plan.titleEn || tBilingual('Untitled session', 'ርዕስ የሌለው ክፍለ-ጊዜ')}</span>
                  {plan.quizzes.length > 0 && (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 text-[10px] font-bold',
                        active ? 'bg-white/20' : 'border border-indigo-200/60 bg-indigo-50 text-indigo-700',
                      )}
                    >
                      {plan.quizzes.length}Q · {weight}%
                    </span>
                  )}
                  {onDeleteSessionPlan && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSessionPlan(plan.id);
                      }}
                      className={cn(
                        'shrink-0 rounded p-0.5 opacity-0 transition group-hover:opacity-100',
                        active ? 'hover:bg-white/20' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
                      )}
                      aria-label="Remove session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
            {onAddSessionPlan && (
              <button
                type="button"
                onClick={onAddSessionPlan}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-sky-300 py-1.5 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                <Plus className="h-3 w-3" />
                {tBilingual('Add session', 'ክፍለ-ጊዜ ጨምር')}
              </button>
            )}
          </div>
        )}

        {/* 4. Final Assessment Node */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectNode({ type: 'FINAL_ASSESSMENT' })}
          className={cn(
            'flex items-center justify-between gap-3 p-3 rounded-2xl border transition cursor-pointer group',
            activeNode.type === 'FINAL_ASSESSMENT'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-indigo-200 hover:bg-white/90 shadow-2xs',
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition',
                activeNode.type === 'FINAL_ASSESSMENT' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 group-hover:bg-amber-100',
              )}
            >
              <Award className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate">{tBilingual('es', 'የማጠቃለያ ፈተና እና ደንቦች')}</h4>
              <p className={cn('text-[11px] truncate', activeNode.type === 'FINAL_ASSESSMENT' ? 'text-indigo-100' : 'text-slate-500')}>
                {finalQuestionCount} {tBilingual('questions', 'ጥያቄዎች')}
              </p>
            </div>
          </div>

          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
              activeNode.type === 'FINAL_ASSESSMENT' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
            )}
          >
            {finalAssessmentWeight}%
          </span>
        </div>

        {/* 5. Review & Submit Node */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectNode({ type: 'REVIEW_SUBMIT' })}
          className={cn(
            'flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer group',
            activeNode.type === 'REVIEW_SUBMIT'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-indigo-200 hover:bg-white/90 shadow-2xs',
          )}
        >
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition',
              activeNode.type === 'REVIEW_SUBMIT' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100',
            )}
          >
            <FileCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold truncate">{tBilingual('Review & Submit', 'ይገምግሙ እና ያቅርቡ')}</h4>
            <p className={cn('text-[11px] truncate', activeNode.type === 'REVIEW_SUBMIT' ? 'text-indigo-100' : 'text-slate-500')}>
              {tBilingual('Final check & submission', 'የመጨረሻ ማረጋገጫ እና ማቅረቢያ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
