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
  const { lang, changeLanguage } = useTranslation();

  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card px-3 shadow-2xs sm:px-4 lg:px-6">
      {/* Left: exit, sidebar toggle, course switcher */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={props.onExit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Exit Question Bank Studio"
          aria-label="Exit Question Bank Studio"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={props.onToggleSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
          title="Show curriculum"
          aria-label="Show curriculum"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <CourseSwitcher {...props} />
      </div>

      {/* Center: where you are */}
      <div className="hidden items-center gap-1 rounded-2xl border border-border/60 bg-secondary/80 p-1 md:flex">
        <span
          className={cn(
            'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold',
            stage === 'BROWSE'
              ? 'border border-border/60 bg-card font-bold text-primary shadow-2xs'
              : 'text-secondary-foreground',
          )}
        >
          <Library className="h-3.5 w-3.5" />
          Question Store
          <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{questionCount}</span>
        </span>
        {stage === 'COMPOSE' && (
          <span className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">
            <PenLine className="h-3.5 w-3.5" />
            Composing
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void changeLanguage(lang === 'en' ? 'am' : 'en')}
          className="hidden items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-bold text-secondary-foreground transition hover:bg-muted sm:flex"
          title="Switch Language"
        >
          <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
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
        className="group flex min-w-0 max-w-[140px] items-center gap-2 rounded-xl px-2 py-1 text-left transition hover:bg-muted min-[420px]:max-w-[200px] sm:max-w-xs xl:max-w-sm"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 rounded border border-accent/20 bg-accent-soft px-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Question Bank
            </span>
            {currentCourse?.code && (
              <span className="shrink-0 rounded border border-primary/20 bg-primary-soft px-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                {currentCourse.code}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs font-bold text-foreground lg:text-sm">
            {currentCourse ? currentCourse.title || currentCourse.titleEn : 'Select a course'}
          </p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-subtle-foreground transition group-hover:text-secondary-foreground', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl ring-1 ring-foreground/5">
          <div className="space-y-2.5 border-b border-border/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <input
                autoFocus
                type="text"
                value={courseSearch}
                onChange={(e) => onCourseSearchChange(e.target.value)}
                placeholder="Search by course code or title…"
                className="h-9 w-full rounded-xl border border-border/90 bg-muted pl-9 pr-8 text-sm text-secondary-foreground outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:bg-card focus:ring-4 focus:ring-ring/10"
              />
              {courseSearch && (
                <button
                  type="button"
                  onClick={() => onCourseSearchChange('')}
                  aria-label="Clear course search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle-foreground hover:text-secondary-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex h-8 items-center gap-0.5 rounded-xl border border-border/90 bg-secondary/80 p-0.5 text-[11px] font-semibold">
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
              <li className="px-3 py-6 text-center text-xs text-subtle-foreground">No matching courses found</li>
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
                          ? 'bg-primary-soft text-primary'
                          : 'text-secondary-foreground hover:bg-muted',
                      )}
                    >
                      <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-secondary-foreground">
                        {c.code || '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{c.title || c.titleEn}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
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
