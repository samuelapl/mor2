'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Globe2, Library, PanelLeft, PenLine, Search, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { Course } from '@/types';
import type { CourseFilterMode } from '../types';
import type { QuestionBankRole } from '../hooks/useBankCourses';
import { segmentClass } from '../styles';
import type { StudioStage } from './types';

interface StudioHeaderProps {
  role: QuestionBankRole;
  stage: StudioStage;
  onExit: () => void;
  onToggleSidebar: () => void;
  questionCount: number;
  // Course switcher
  currentCourse?: Course;
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
  courseSearch: string;
  onCourseSearchChange: (value: string) => void;
  courseFilterMode: CourseFilterMode;
  onCourseFilterModeChange: (mode: CourseFilterMode) => void;
  totalCourseCount: number;
  myCourseCount: number;
}

export function StudioHeader(props: StudioHeaderProps) {
  const { stage, questionCount } = props;
  const { lang, setLang } = useTranslation();

  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-3 shadow-2xs sm:px-4 lg:px-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Left: exit, sidebar toggle, course switcher */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={props.onExit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Exit Question Bank Studio"
          aria-label="Exit Question Bank Studio"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={props.onToggleSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 lg:hidden dark:border-slate-700 dark:hover:bg-slate-800"
          title="Show curriculum"
          aria-label="Show curriculum"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <CourseSwitcher {...props} />
      </div>

      {/* Center: where you are */}
      <div className="hidden items-center gap-1 rounded-2xl border border-slate-200/60 bg-slate-100/80 p-1 md:flex dark:border-slate-700/60 dark:bg-slate-800/80">
        <span
          className={cn(
            'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold',
            stage === 'BROWSE'
              ? 'border border-slate-200/60 bg-white font-bold text-indigo-700 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400',
          )}
        >
          <Library className="h-3.5 w-3.5" />
          Question Store
          <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{questionCount}</span>
        </span>
        {stage === 'COMPOSE' && (
          <span className="flex items-center gap-2 rounded-xl border border-indigo-200/70 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
            <PenLine className="h-3.5 w-3.5" />
            Composing
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
          className="hidden items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Switch Language"
        >
          <Globe2 className="h-3.5 w-3.5 text-slate-500" />
          <span>{lang === 'en' ? 'አማ' : 'EN'}</span>
        </button>
      </div>
    </header>
  );
}

/** Course title in the header that opens a searchable course picker. */
function CourseSwitcher({
  role,
  currentCourse,
  courses,
  selectedCourseId,
  onSelectCourse,
  courseSearch,
  onCourseSearchChange,
  courseFilterMode,
  onCourseFilterModeChange,
  totalCourseCount,
  myCourseCount,
}: StudioHeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="group flex min-w-0 max-w-[140px] items-center gap-2 rounded-xl px-2 py-1 text-left transition hover:bg-slate-50 min-[420px]:max-w-[200px] sm:max-w-xs xl:max-w-sm dark:hover:bg-slate-800"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 rounded border border-violet-200/60 bg-violet-50 px-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:border-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
              Question Bank
            </span>
            {currentCourse?.code && (
              <span className="shrink-0 rounded border border-indigo-200/60 bg-indigo-50 px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                {currentCourse.code}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs font-bold text-slate-900 lg:text-sm dark:text-white">
            {currentCourse ? currentCourse.title || currentCourse.titleEn : 'Select a course'}
          </p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-600', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-2.5 border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={courseSearch}
                onChange={(e) => onCourseSearchChange(e.target.value)}
                placeholder="Search by course code or title…"
                className="h-9 w-full rounded-xl border border-slate-200/90 bg-slate-50 pl-9 pr-8 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              {courseSearch && (
                <button
                  type="button"
                  onClick={() => onCourseSearchChange('')}
                  aria-label="Clear course search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex h-8 items-center gap-0.5 rounded-xl border border-slate-200/90 bg-slate-100/80 p-0.5 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => onCourseFilterModeChange('ALL')}
                className={cn(segmentClass(courseFilterMode === 'ALL'), 'flex-1')}
                title="Browse Question Banks across all institutional courses"
              >
                All courses ({totalCourseCount})
              </button>
              <button
                type="button"
                onClick={() => onCourseFilterModeChange('MY')}
                className={cn(segmentClass(courseFilterMode === 'MY'), 'flex-1')}
                title={`Show only courses where you are assigned as ${role === 'course_owner' ? 'Owner' : 'Trainer'}`}
              >
                {role === 'course_owner' ? 'My created' : 'My assigned'} ({myCourseCount})
              </button>
            </div>
          </div>

          <ul role="listbox" className="max-h-80 overflow-y-auto p-1.5">
            {courses.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-slate-400">No matching courses found</li>
            ) : (
              courses.map((c) => {
                const active = c.id === selectedCourseId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onSelectCourse(c.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                        active
                          ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                      )}
                    >
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {c.code || '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{c.title || c.titleEn}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
