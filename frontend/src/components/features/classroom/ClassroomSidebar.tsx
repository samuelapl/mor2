'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileSpreadsheet,
  FileText,
  Headphones,
  Lock,
  PlayCircle,
  GraduationCap,
  Layers,
  Video,
} from 'lucide-react';
import type { Course, Lesson, Module } from '@/types';
import type { ApiCourseProgress } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import type { ClassroomActiveContent, ClassroomFlatItem } from './types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';
import { missingLiveSessions } from '@/lib/live-attendance';
import { formatSessionDateTime } from '@/lib/app-time';

interface ClassroomSidebarProps {
  course: Course;
  progress: ApiCourseProgress | null;
  flatItems: ClassroomFlatItem[];
  activeContent: ClassroomActiveContent | null;
  expandedModules: Record<string, boolean>;
  onToggleModule: (moduleId: string) => void;
  onSelectItem: (item: ClassroomFlatItem) => void;
  isOpen: boolean;
  /** Phones: closes the drawer (backdrop tap). */
  onClose?: () => void;
}

function renderContentIcon(type?: string, className = 'h-3.5 w-3.5') {
  const norm = (type || '').toUpperCase();
  if (norm === 'VIDEO') return <PlayCircle className={cn('text-rose-500', className)} />;
  if (norm === 'AUDIO') return <Headphones className={cn('text-amber-500', className)} />;
  if (norm === 'ASSIGNMENT')
    return <FileSpreadsheet className={cn('text-emerald-500', className)} />;
  return <FileText className={cn('text-indigo-500', className)} />;
}

function cleanModuleTitle(title: string): string {
  if (!title) return '';
  return title.replace(/^(Module\s*)?\d+\s*[:\-–]?\s*/i, '').trim() || title;
}

function cleanLessonTitle(title: string): string {
  if (!title) return '';
  return title.replace(/^(Lesson\s*)?(\d+\.)*\d*\s*[:\-–]?\s*/i, '').trim() || title;
}

function cleanSubTitle(title: string): string {
  if (!title) return '';
  return title.replace(/^(\d+\.)+\d*\s*[:\-–]?\s*/, '').trim() || title;
}

export function ClassroomSidebar({
  course,
  progress,
  flatItems,
  activeContent,
  expandedModules,
  onToggleModule,
  onSelectItem,
  isOpen,
  onClose,
}: ClassroomSidebarProps) {
  const { isAmharic, t } = useTranslation('classroom');

  // Map flat items by key for instant lookup
  const itemsByKey = useMemo(() => {
    const map = new Map<string, ClassroomFlatItem>();
    flatItems.forEach((i) => map.set(i.key, i));
    return map;
  }, [flatItems]);

  const moduleProgressMap = useMemo(() => {
    const map = new Map<string, any>();
    (progress?.modules || []).forEach((m) => map.set(m.moduleId, m));
    return map;
  }, [progress]);

  const activeKey = activeContent?.item.key;
  const courseOverviewItem = flatItems.find((i) => i.type === 'COURSE_OVERVIEW');
  const isCourseOverviewActive = activeKey === courseOverviewItem?.key;

  // Track dropdown collapse/expand state for lessons with sub-lessons
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});

  const toggleLesson = (lessonId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setExpandedLessons((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  // Automatically expand lesson dropdown if the lesson or any of its sub-lessons is active
  useEffect(() => {
    if (!activeKey) return;
    const toExpand: Record<string, boolean> = {};
    course.modules.forEach((m) => {
      m.lessons.forEach((l) => {
        if (`lesson-${l.id}` === activeKey || (l.subLessons ?? []).some((s) => `sub-${s.id}` === activeKey)) {
          toExpand[l.id] = true;
        }
      });
    });
    if (Object.keys(toExpand).length > 0) {
      setExpandedLessons((prev) => ({ ...prev, ...toExpand }));
    }
  }, [activeKey, course]);

  if (!isOpen) return null;

  return (
    <>
    {/* Phones: the curriculum overlays the lesson as a drawer. */}
    <div
      aria-hidden="true"
      onClick={onClose}
      className="absolute inset-0 z-30 bg-slate-900/40 animate-fade-in md:hidden"
    />
    <aside className="absolute inset-y-0 left-0 z-40 w-[85vw] max-w-sm shadow-2xl animate-slide-in-left md:static md:z-auto md:w-80 md:shadow-none md:animate-none shrink-0 border-r border-border bg-card flex flex-col h-full overflow-hidden select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border/60 bg-muted/60 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('classroomSidebar.courseCurriculum')}
          </p>
          <span className="text-[11px] font-semibold text-muted-foreground bg-card px-2 py-0.5 rounded-full border border-border">
            {t('classroomSidebar.modules', { count: course.modules.length })}
          </span>
        </div>
      </div>

      {/* Curriculum Tree (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {courseOverviewItem && (
          <button
            type="button"
            onClick={() => onSelectItem(courseOverviewItem)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl border text-left transition group',
              isCourseOverviewActive
                ? 'border-primary/30 bg-primary-soft/80 text-primary font-semibold ring-1 ring-ring/20 shadow-2xs'
                : 'border-border bg-card text-secondary-foreground hover:bg-muted shadow-2xs',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs',
                  isCourseOverviewActive
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-primary-soft border-primary/30 text-primary group-hover:bg-primary/15',
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {t('classroomSidebar.courseOverviewObjectives')}
                </p>
                <p className="text-[11px] text-subtle-foreground">
                  {t('classroomSidebar.orientationSyllabus')}
                </p>
              </div>
            </div>
            {isCourseOverviewActive ? (
              <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-subtle-foreground shrink-0" />
            )}
          </button>
        )}

        {course.modules.map((mod, mIdx) => {
          const modProg = moduleProgressMap.get(mod.id);
          const isExpanded = expandedModules[mod.id] ?? false;
          const isUnlocked = modProg?.unlocked ?? mIdx === 0;
          const completedLessons = modProg?.completedLessons ?? 0;
          const totalLessons = modProg?.totalLessons ?? mod.lessons.length;
          const isModuleComplete = totalLessons > 0 && completedLessons === totalLessons;

          // Find module quiz flat item if exists
          const moduleQuizItem = flatItems.find(
            (i) => i.moduleId === mod.id && i.quizKind === 'MODULE_ASSESSMENT',
          );

          return (
            <div
              key={mod.id}
              className={cn(
                'rounded-xl border transition-all overflow-hidden',
                isUnlocked
                  ? 'border-border bg-card shadow-2xs'
                  : 'border-border/60 bg-muted/50 opacity-70',
              )}
            >
              {/* Module Header Bar */}
              <button
                type="button"
                onClick={() => isUnlocked && onToggleModule(mod.id)}
                disabled={!isUnlocked}
                className={cn(
                  'w-full flex items-center justify-between p-3 text-left transition hover:bg-muted/80',
                  !isUnlocked && 'cursor-not-allowed',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-mono border',
                      isUnlocked
                        ? 'bg-primary-soft border-primary/30 text-primary'
                        : 'bg-secondary border-border text-subtle-foreground',
                    )}
                  >
                    {mIdx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {t('classroomSidebar.module')} {mIdx + 1}: {cleanModuleTitle(mod.title)}
                    </p>
                    <p className="text-[11px] text-subtle-foreground mt-0.5">
                      {t('classroomSidebar.lessonsCompleted', { completedLessons, totalLessons })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {!isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-subtle-foreground" />
                  ) : isModuleComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-subtle-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-subtle-foreground" />
                  )}
                </div>
              </button>

              {/* Module Expanded Content */}
              {isExpanded && isUnlocked ? (
                <div className="p-2 pt-0 space-y-1.5 border-t border-border/60 bg-muted/40">
                  {/* Module Overview Item (only if module has description, objectives, or attachments) */}
                  {(() => {
                    const moduleOverviewItem = flatItems.find(
                      (i) => i.moduleId === mod.id && i.type === 'MODULE_OVERVIEW',
                    );
                    if (!moduleOverviewItem) return null;
                    const isModOverviewActive = activeKey === moduleOverviewItem.key;
                    return (
                      <button
                        type="button"
                        onClick={() => onSelectItem(moduleOverviewItem)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition text-xs font-medium',
                          isModOverviewActive
                            ? 'bg-primary-soft text-primary font-semibold ring-1 ring-ring/20 shadow-2xs'
                            : 'text-secondary-foreground hover:bg-card hover:shadow-2xs',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Layers
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              isModOverviewActive ? 'text-primary' : 'text-indigo-500',
                            )}
                          />
                          <span className="truncate">
                            {t('classroomSidebar.moduleOverviewObjectives')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isModOverviewActive ? (
                            <CircleDot className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <div className="h-2 w-2 rounded-full border border-input" />
                          )}
                        </div>
                      </button>
                    );
                  })()}

                  {mod.lessons
                    .filter(
                      (lesson) =>
                        (lesson.contentType as string) !== 'ASSESSMENT' &&
                        (lesson.contentType as string) !== 'QUIZ' &&
                        !lesson.title.toLowerCase().includes('module assessment'),
                    )
                    .map((lesson, lIdx) => {
                    const lessonKey = `lesson-${lesson.id}`;
                    const lessonItem = itemsByKey.get(lessonKey);
                    const isLessonActive = activeKey === lessonKey;
                    const isLessonUnlocked = lessonItem?.unlocked ?? false;
                    const isLessonCompleted = lessonItem?.completed ?? false;

                    // Child sub-lessons
                    const subLessons = (lesson.subLessons ?? []).filter(
                      (s) =>
                        (s.contentType as string) !== 'ASSESSMENT' &&
                        (s.contentType as string) !== 'QUIZ' &&
                        !s.title.toLowerCase().includes('lesson assessment'),
                    );
                    const hasSubLessons = subLessons.length > 0;
                    const isLessonExpanded = Boolean(expandedLessons[lesson.id]);

                    // Lesson Checkpoint Quiz flat item
                    const lessonQuizItem = flatItems.find(
                      (i) => i.lessonId === lesson.id && i.quizKind === 'LESSON_ASSESSMENT',
                    );

                    return (
                      <div key={lesson.id} className="space-y-1">
                        {/* Lesson Row */}
                        <div
                          className={cn(
                            'w-full flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-left transition text-xs font-medium group',
                            isLessonActive
                              ? 'bg-primary-soft text-primary font-semibold ring-1 ring-ring/20 shadow-2xs'
                              : isLessonUnlocked
                                ? 'text-secondary-foreground hover:bg-card hover:shadow-2xs'
                                : 'text-subtle-foreground cursor-not-allowed',
                          )}
                        >
                          {/* Main Lesson Select Action */}
                          <button
                            type="button"
                            onClick={() => {
                              if (lessonItem && isLessonUnlocked) {
                                onSelectItem(lessonItem);
                                if (hasSubLessons && !isLessonExpanded) {
                                  toggleLesson(lesson.id);
                                }
                              }
                            }}
                            disabled={!isLessonUnlocked}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                          >
                            {renderContentIcon(lesson.contentType)}
                            <span className="truncate">
                              {t('classroomSidebar.lesson')} {mIdx + 1}.{lIdx + 1}:{' '}
                              {cleanLessonTitle(lesson.title)}
                            </span>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {lesson.durationMin ? (
                              <span className="text-[10px] text-subtle-foreground">
                                {lesson.durationMin}m
                              </span>
                            ) : null}

                            {!isLessonUnlocked ? (
                              <Lock className="h-3 w-3 text-subtle-foreground" />
                            ) : isLessonCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : isLessonActive ? (
                              <CircleDot className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <div className="h-2 w-2 rounded-full border border-input" />
                            )}

                            {/* Dropdown Chevron for Lessons with Sub-lessons */}
                            {hasSubLessons && (
                              <button
                                type="button"
                                onClick={(e) => toggleLesson(lesson.id, e)}
                                title={isLessonExpanded ? t('classroomSidebar.collapseSubLessons') : t('classroomSidebar.expandSubLessons')}
                                className="p-0.5 rounded text-subtle-foreground hover:text-secondary-foreground hover:bg-input/60 transition"
                              >
                                {isLessonExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Sub-lessons list (Indented Dropdown) */}
                        {hasSubLessons && isLessonExpanded && (
                          <div className="pl-5 space-y-1 border-l border-primary/30 ml-3.5 transition-all">
                            {subLessons.map((sub, sIdx) => {
                              const subKey = `sub-${sub.id}`;
                              const subItem = itemsByKey.get(subKey);
                              const isSubActive = activeKey === subKey;
                              const isSubUnlocked = subItem?.unlocked ?? false;
                              const isSubCompleted = subItem?.completed ?? false;

                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => subItem && isSubUnlocked && onSelectItem(subItem)}
                                  disabled={!isSubUnlocked}
                                  className={cn(
                                    'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition text-[11px]',
                                    isSubActive
                                      ? 'bg-primary-soft text-primary font-semibold ring-1 ring-ring/20'
                                      : isSubUnlocked
                                        ? 'text-secondary-foreground hover:bg-card'
                                        : 'text-subtle-foreground cursor-not-allowed',
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <div className="h-1.5 w-1.5 rounded-full bg-input shrink-0" />
                                    <span className="truncate">{cleanSubTitle(sub.title)}</span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {!isSubUnlocked ? (
                                      <Lock className="h-2.5 w-2.5 text-subtle-foreground" />
                                    ) : isSubCompleted ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    ) : isSubActive ? (
                                      <CircleDot className="h-3 w-3 text-primary" />
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Lesson Checkpoint Quiz Item (Directly below sub-lessons) */}
                        {lessonQuizItem && (
                          <div className="pl-4 ml-3 border-l border-primary/30 pt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                lessonQuizItem.unlocked && onSelectItem(lessonQuizItem)
                              }
                              disabled={!lessonQuizItem.unlocked}
                              className={cn(
                                'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition text-[11px] font-medium border',
                                activeKey === lessonQuizItem.key
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                                  : lessonQuizItem.unlocked
                                    ? lessonQuizItem.completed
                                      ? 'bg-success-soft/70 border-success/30 text-success hover:bg-success/15'
                                      : 'bg-card border-primary/30 text-primary hover:bg-primary-soft/60'
                                    : 'bg-muted border-border/80 text-subtle-foreground cursor-not-allowed',
                              )}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <BookOpenCheck className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {lessonQuizItem.assessment?.titleEn || lessonQuizItem.title || t('classroomSidebar.lessonAssessment')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {!lessonQuizItem.unlocked ? (
                                  <Lock className="h-3 w-3" />
                                ) : lessonQuizItem.completed ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <span className="text-[10px] font-bold">
                                    {t('classroomSidebar.quiz')}
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Module Assessment Item (At the end of all lessons in module) */}
                  {moduleQuizItem && (
                    <div className="pt-2 border-t border-border/70">
                      <button
                        type="button"
                        onClick={() => moduleQuizItem.unlocked && onSelectItem(moduleQuizItem)}
                        disabled={!moduleQuizItem.unlocked}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition text-xs font-semibold border',
                          activeKey === moduleQuizItem.key
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : moduleQuizItem.unlocked
                              ? moduleQuizItem.completed
                                ? 'bg-success-soft border-success/30 text-success hover:bg-success/15'
                                : 'bg-gradient-to-r from-primary-soft to-accent-soft border-primary/30 text-primary hover:from-primary/15'
                              : 'bg-muted border-border text-subtle-foreground cursor-not-allowed',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Award className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {moduleQuizItem.assessment?.titleEn || moduleQuizItem.title || t('classroomSidebar.moduleAssessment')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!moduleQuizItem.unlocked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : moduleQuizItem.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {t('classroomSidebar.takeExam')}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Live Sessions (dates only) */}
        {(() => {
          const sessionsItem = flatItems.find((i) => i.type === 'LIVE_SESSIONS');
          if (!sessionsItem) return null;
          const isActive = activeKey === sessionsItem.key;
          return (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectItem(sessionsItem)}
                className={cn(
                  'w-full flex items-center gap-2.5 p-3 rounded-xl text-left transition border shadow-2xs',
                  isActive
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card border-info/30 text-foreground hover:border-info/60',
                )}
              >
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', isActive ? 'bg-sky-400 text-foreground border-info/30' : 'bg-info-soft border-info/30 text-info')}>
                  <Video className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{t('classroomSidebar.liveSessions')}</p>
                  <p className="text-[10px] opacity-75 mt-0.5 truncate">
                    {sessionsItem.completed ? t('classroomSidebar.allSessionsHeld') : t('classroomSidebar.upcomingSessions')}
                  </p>
                </div>
                {sessionsItem.completed && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
              </button>
            </div>
          );
        })()}

        {/* Final Course Certification Assessment Item */}
        {flatItems.find((i) => i.quizKind === 'FINAL_ASSESSMENT')
          ? (() => {
              const finalItem = flatItems.find((i) => i.quizKind === 'FINAL_ASSESSMENT')!;
              const isActive = activeKey === finalItem.key;

              const handleFinalClick = () => {
                onSelectItem(finalItem);

                if (!finalItem.unlocked && !finalItem.isInPersonLocked) {
                  const contentCompleted = progress?.courseCompletion?.contentCompleted ?? false;
                  const completedLessons = progress?.stats?.completedLessons ?? 0;
                  const totalLessons = progress?.stats?.totalLessons ?? 0;
                  const missingSessions = missingLiveSessions(progress);
                  const allLiveSessionsAttended = missingSessions.length === 0;
                  const allAssessmentsPassed = progress?.courseCompletion?.allAssessmentsPassed ?? true;

                  if (!contentCompleted && totalLessons > 0 && completedLessons < totalLessons) {
                    toast.warning(
                      t('classroomSidebar.pleaseCompleteAllCourseLessonsCompleted', { completedLessons, totalLessons }),
                    );
                  } else if (contentCompleted && !allLiveSessionsAttended) {
                    const next = missingSessions[0]!;
                    toast.warning(
                      `${t('classroomSidebar.youMustAttendAllScheduledLive')} ${
                        next.nextSessionAt
                          ? t('classroomSidebar.attendNextSession', {
                              title: next.title,
                              date: formatSessionDateTime(next.nextSessionAt, isAmharic ? 'am-ET' : undefined),
                            })
                          : t('classroomSidebar.sessionNotScheduledYet', { title: next.title })
                      }`,
                    );
                  } else if (!allAssessmentsPassed) {
                    toast.warning(
                      t('classroomSidebar.pleasePassAllPrerequisiteModuleAssessmen'),
                    );
                  } else {
                    toast.warning(
                      t('classroomSidebar.youHaveUncompletedPrerequisitesCompleteA'),
                    );
                  }
                } else if (finalItem.isInPersonLocked) {
                  toast.info(
                    t('classroomSidebar.thisFinalAssessmentIsAdministeredIn'),
                  );
                }
              };

              return (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleFinalClick}
                    className={cn(
                      'w-full flex items-center justify-between gap-2.5 p-3 rounded-xl text-left transition border shadow-2xs cursor-pointer',
                      isActive
                        ? finalItem.isInPersonLocked
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : finalItem.isInPersonLocked
                          ? 'bg-warning-soft/90 border-warning/30 text-warning hover:bg-warning-soft/80'
                          : finalItem.unlocked
                            ? finalItem.completed
                              ? 'bg-success-soft border-success/30 text-success'
                              : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent'
                            : 'bg-muted border-border text-muted-foreground hover:border-input',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {finalItem.isInPersonLocked ? (
                        <Building2
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-white' : 'text-warning',
                          )}
                        />
                      ) : (
                        <GraduationCap className="h-4 w-4 shrink-0 text-amber-300" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">
                          {finalItem.assessment?.titleEn || finalItem.title || t('classroomSidebar.finalAssessment')}
                        </p>
                        <p
                          className={cn(
                            'text-[10px] mt-0.5',
                            isActive ? 'text-amber-100' : 'opacity-80',
                          )}
                        >
                          {finalItem.isInPersonLocked
                            ? t('classroomSidebar.inPersonClassroomEvaluation')
                            : t('classroomSidebar.requiredForCertification')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {finalItem.isInPersonLocked ? (
                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1',
                            isActive ? 'bg-white/20 text-white' : 'bg-warning-soft text-warning',
                          )}
                        >
                          In-Person
                        </span>
                      ) : !finalItem.unlocked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : finalItem.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded">
                          {t('classroomSidebar.final')}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })()
          : null}

        {/* Certificate of Completion Item (Directly below Final Assessment) */}
        {(() => {
          const certItem = flatItems.find((i) => i.type === 'CERTIFICATE');
          if (!certItem) return null;
          const isActive = activeKey === certItem.key;
          const isUnlocked = certItem.unlocked;

          return (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onSelectItem(certItem)}
                className={cn(
                  'w-full flex items-center justify-between gap-2.5 p-3 rounded-xl text-left transition border shadow-2xs group cursor-pointer',
                  isActive
                    ? 'bg-foreground text-background border-foreground shadow-sm'
                    : isUnlocked
                      ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-amber-300/80 text-amber-950 hover:border-amber-400 hover:shadow-xs'
                      : 'bg-muted/80 border-border text-muted-foreground hover:bg-secondary/70',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition',
                      isActive
                        ? 'bg-amber-400 text-foreground border-warning/30 font-bold'
                        : isUnlocked
                          ? 'bg-warning-soft border-warning/30 text-warning'
                          : 'bg-secondary border-border text-subtle-foreground',
                    )}
                  >
                    <Award className="h-4 w-4 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">
                      {t('classroomSidebar.certificateOfCompletion')}
                    </p>
                    <p className="text-[10px] opacity-75 mt-0.5 truncate">
                      {isUnlocked
                        ? t('classroomSidebar.verifiedReadyToView')
                        : certItem.isInPersonLocked
                          ? t('classroomSidebar.issuedUponClassroomCompletion')
                          : t('classroomSidebar.completeCourseToUnlock')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {certItem.isInPersonLocked ? (
                    <span className="text-[10px] font-bold text-warning bg-warning-soft px-1.5 py-0.5 rounded">
                      In-Person
                    </span>
                  ) : !isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-subtle-foreground" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              </button>
            </div>
          );
        })()}
      </div>
    </aside>
    </>
  );
}
