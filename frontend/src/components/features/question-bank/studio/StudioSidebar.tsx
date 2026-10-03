'use client';

import { BookOpen, ChevronDown, ChevronRight, Globe, ListChecks, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiModule } from '@/lib/api/types';
import type { ActiveCurriculumNode, BankQuestion } from '../types';
import { getCleanLessonTitle, getCleanModuleTitle, getCleanSubLessonTitle } from '../utils';
import { codeChipClass, countPillClass, treeAddButtonClass, treeRowClass } from '../styles';

interface StudioSidebarProps {
  modules: ApiModule[];
  loading: boolean;
  courseQuestions: BankQuestion[];
  activeNode: ActiveCurriculumNode;
  onSelectNode: (node: ActiveCurriculumNode) => void;
  onAddQuestion: (node: ActiveCurriculumNode) => void;
  questionCounts: Record<string, number>;
  expandedModules: Set<string>;
  expandedLessons: Set<string>;
  onToggleModule: (moduleId: string) => void;
  onToggleLesson: (lessonId: string) => void;
  /** Shown in the mobile drawer to close it. */
  onClose?: () => void;
  className?: string;
}

const SCOPE_NODES = [
  {
    node: { type: 'ALL', id: null, title: 'All Course Questions' } as ActiveCurriculumNode,
    label: 'All Questions',
    hint: 'Everything in this course + reusable',
    icon: ListChecks,
    countKey: 'all',
  },
  {
    node: { type: 'COURSE_GENERAL', id: null, title: 'Course-Level (General)' } as ActiveCurriculumNode,
    label: 'Course Level',
    hint: 'General questions for the whole course',
    icon: BookOpen,
    countKey: 'courseGeneral',
  },
  {
    node: { type: 'GLOBAL', id: null, title: 'Reusable Global Questions' } as ActiveCurriculumNode,
    label: 'Reusable Global',
    hint: 'Shared across every course',
    icon: Globe,
    countKey: 'global',
  },
];

export function StudioSidebar({
  modules,
  loading,
  courseQuestions,
  activeNode,
  onSelectNode,
  onAddQuestion,
  questionCounts,
  expandedModules,
  expandedLessons,
  onToggleModule,
  onToggleLesson,
  onClose,
  className,
}: StudioSidebarProps) {
  const typeStats = [
    { label: 'Multiple choice', count: courseQuestions.filter((q) => q.type === 'MULTIPLE_CHOICE').length, color: 'bg-blue-500' },
    { label: 'True / False', count: courseQuestions.filter((q) => q.type === 'TRUE_FALSE').length, color: 'bg-emerald-500' },
    { label: 'Short answer', count: courseQuestions.filter((q) => q.type === 'SHORT_ANSWER').length, color: 'bg-amber-500' },
  ];
  const total = courseQuestions.length;

  return (
    <aside
      className={cn(
        'flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50/70 lg:w-96 dark:border-slate-800 dark:bg-slate-900/60',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bank Structure</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {modules.length} module{modules.length === 1 ? '' : 's'}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close curriculum"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Scope nodes */}
        <div className="space-y-2">
          {SCOPE_NODES.map(({ node, label, hint, icon: Icon, countKey }) => {
            const active = activeNode.type === node.type;
            return (
              <div
                key={node.type}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl border p-2.5 transition',
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'border-slate-200/80 bg-white text-slate-800 shadow-2xs hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                )}
              >
                <button type="button" onClick={() => onSelectNode(node)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition',
                      active ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">{label}</span>
                    <span className={cn('block truncate text-[11px]', active ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400')}>
                      {hint}
                    </span>
                  </span>
                </button>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {questionCounts[countKey] || 0}
                </span>
                {node.type !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => onAddQuestion(node)}
                    aria-label={`Add ${label} question`}
                    title={`Add ${label} question`}
                    className={cn(
                      'shrink-0 rounded-md p-1 transition',
                      active ? 'text-white/80 hover:bg-white/20 hover:text-white' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30',
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Curriculum</p>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800 dark:bg-slate-900" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/60">
            This course has no modules yet. Use Course Level or Reusable Global questions.
          </div>
        ) : (
          modules.map((mod, modIdx) => {
            const isModActive = activeNode.type === 'MODULE' && activeNode.id === mod.id;
            const isExpanded = expandedModules.has(mod.id);
            const cleanModuleTitle = getCleanModuleTitle(mod.titleEn);
            const moduleNode: ActiveCurriculumNode = {
              type: 'MODULE',
              id: mod.id,
              title: `Module ${modIdx + 1}: ${cleanModuleTitle}`,
              moduleId: mod.id,
            };
            const hasLessons = Boolean(mod.lessons && mod.lessons.length > 0);

            return (
              <div
                key={mod.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-900"
              >
                <div
                  className={cn(
                    'flex items-center gap-1 p-2 transition',
                    isModActive
                      ? 'border-b border-indigo-100 bg-indigo-50/70 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100'
                      : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => hasLessons && onToggleModule(mod.id)}
                    disabled={!hasLessons}
                    aria-label={isExpanded ? 'Collapse lessons' : 'Expand lessons'}
                    className="rounded p-1 text-slate-400 hover:text-slate-600 disabled:invisible"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectNode(moduleNode)}
                    title={moduleNode.title}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Module {modIdx + 1}</span>
                    <span className="block truncate text-xs font-bold">{cleanModuleTitle}</span>
                  </button>
                  <span className={countPillClass(isModActive)} title={`${questionCounts[`module_${mod.id}`] || 0} questions attached to this module`}>
                    {questionCounts[`module_${mod.id}`] || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddQuestion(moduleNode)}
                    aria-label="Add question for this module"
                    title="Add question for this module"
                    className={treeAddButtonClass}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isExpanded && hasLessons && (
                  <div className="space-y-0.5 border-t border-slate-100 bg-slate-50/40 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/40">
                    {mod.lessons!.map((les, lesIdx) => {
                      const isLesActive = activeNode.type === 'LESSON' && activeNode.id === les.id;
                      const isLesExpanded = expandedLessons.has(les.id);
                      const cleanLessonTitle = getCleanLessonTitle(les.titleEn);
                      const lessonNode: ActiveCurriculumNode = {
                        type: 'LESSON',
                        id: les.id,
                        title: `Lesson ${modIdx + 1}.${lesIdx + 1}: ${cleanLessonTitle}`,
                        moduleId: mod.id,
                        lessonId: les.id,
                      };
                      const hasSubLessons = Boolean(les.subLessons && les.subLessons.length > 0);

                      return (
                        <div key={les.id}>
                          <div className={treeRowClass(isLesActive)}>
                            <button
                              type="button"
                              onClick={() => hasSubLessons && onToggleLesson(les.id)}
                              disabled={!hasSubLessons}
                              aria-label={isLesExpanded ? 'Collapse sub-lessons' : 'Expand sub-lessons'}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:text-slate-700 disabled:invisible"
                            >
                              {isLesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectNode(lessonNode)}
                              title={lessonNode.title}
                              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                            >
                              <span className={codeChipClass(isLesActive)}>
                                {modIdx + 1}.{lesIdx + 1}
                              </span>
                              <span className="truncate">{cleanLessonTitle}</span>
                            </button>
                            <span className={countPillClass(isLesActive)}>{questionCounts[`lesson_${les.id}`] || 0}</span>
                            <button
                              type="button"
                              onClick={() => onAddQuestion(lessonNode)}
                              aria-label="Add question for this lesson"
                              title="Add question for this lesson"
                              className={treeAddButtonClass}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {isLesExpanded && hasSubLessons && (
                            <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700">
                              {les.subLessons!.map((sub, subIdx) => {
                                const isSubActive = activeNode.type === 'SUB_LESSON' && activeNode.id === sub.id;
                                const cleanSubTitle = getCleanSubLessonTitle(sub.titleEn);
                                const subNode: ActiveCurriculumNode = {
                                  type: 'SUB_LESSON',
                                  id: sub.id,
                                  title: `Sub-lesson ${modIdx + 1}.${lesIdx + 1}.${subIdx + 1}: ${cleanSubTitle}`,
                                  moduleId: mod.id,
                                  lessonId: les.id,
                                  subLessonId: sub.id,
                                };

                                return (
                                  <div key={sub.id} className={cn(treeRowClass(isSubActive), 'pl-2')}>
                                    <button
                                      type="button"
                                      onClick={() => onSelectNode(subNode)}
                                      title={subNode.title}
                                      className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                                    >
                                      <span className={codeChipClass(isSubActive)}>
                                        {modIdx + 1}.{lesIdx + 1}.{subIdx + 1}
                                      </span>
                                      <span className="truncate text-[11px]">{cleanSubTitle}</span>
                                    </button>
                                    <span className={countPillClass(isSubActive)}>{questionCounts[`sublesson_${sub.id}`] || 0}</span>
                                    <button
                                      type="button"
                                      onClick={() => onAddQuestion(subNode)}
                                      aria-label="Add question for this sub-lesson"
                                      title="Add question for this sub-lesson"
                                      className={treeAddButtonClass}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Question mix for this course */}
      <div className="shrink-0 border-t border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Question mix</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{total} total</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {total > 0 &&
            typeStats.map((s) => (
              <div key={s.label} className={s.color} style={{ width: `${(s.count / total) * 100}%` }} title={`${s.label}: ${s.count}`} />
            ))}
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          {typeStats.map((s) => (
            <span key={s.label} className="flex min-w-0 items-center gap-1.5">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', s.color)} />
              <span className="truncate">{s.label}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{s.count}</span>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
