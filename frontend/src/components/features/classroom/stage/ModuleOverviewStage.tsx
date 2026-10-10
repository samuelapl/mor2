'use client';

import { BookOpen, Target, ArrowRight, Layers, Clock, CheckCircle2, FileText } from 'lucide-react';
import type { Module } from '@/types';
import { calculateModuleDuration, formatDuration } from '@/lib/duration';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { ApiProgressModule } from '@/lib/api/types';
import { RichContent, stripHtmlTags } from '@/components/ui/RichContent';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ModuleOverviewStageProps {
  module: Module;
  moduleIndex: number;
  moduleProgress?: ApiProgressModule;
  onStartLessons: () => void;
}

function cleanModuleTitle(rawTitle: string): string {
  return rawTitle.replace(/^Module\s+\d+[\s:.-]*/i, '').trim();
}

export function ModuleOverviewStage({ module, moduleIndex, moduleProgress, onStartLessons }: ModuleOverviewStageProps) {
  const { isAmharic } = useTranslation();
  const hasDescription = Boolean(module.description && stripHtmlTags(module.description).trim());
  const hasObjectives = Boolean(module.objectives && stripHtmlTags(module.objectives).trim());

  const totalLessons = module.lessons.length;
  const totalSubLessons = module.lessons.reduce((acc, l) => acc + (l.subLessons?.length ?? 0), 0);
  const completedLessons = moduleProgress?.completedLessons ?? 0;
  const isModuleComplete = totalLessons > 0 && completedLessons === totalLessons;

  const totalDurationMin = calculateModuleDuration(module);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Hero Banner */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="indigo" className="text-xs font-semibold">
            Module {moduleIndex + 1} Overview
          </Badge>
          {isModuleComplete ? (
            <Badge variant="green" dot className="text-xs">
              Module Completed
            </Badge>
          ) : completedLessons > 0 ? (
            <Badge variant="blue" dot className="text-xs">
              In Progress ({completedLessons}/{totalLessons})
            </Badge>
          ) : (
            <Badge variant="slate" className="text-xs">
              Available
            </Badge>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Module {moduleIndex + 1}: {cleanModuleTitle(module.title)}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Carefully review the module overview, key learning objectives, and attached study references before starting.
          </p>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Lessons & Topics</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {totalLessons} Lessons {totalSubLessons > 0 ? `· ${totalSubLessons} Topics` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Module Duration</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDuration(totalDurationMin, isAmharic)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Progress</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {completedLessons} of {totalLessons} done
              </p>
            </div>
          </div>
        </div>
      </div>

      {hasDescription ? (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Module Overview & Description</h2>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-none">
            <RichContent html={module.description!} />
          </div>
        </div>
      ) : null}

      {/* Module Learning Objectives */}
      {hasObjectives ? (
        <div className="rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
            <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">Module Learning Objectives</h2>
          </div>
          <p className="text-xs text-indigo-800/90 dark:text-indigo-300">By the end of this module, you should understand and be able to apply:</p>
          <div className="text-sm text-indigo-950 dark:text-slate-200 leading-relaxed bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/50 p-4 shadow-2xs">
            <RichContent html={module.objectives!} />
          </div>
        </div>
      ) : null}

      {/* Bottom Start Action */}
      <div className="pt-2 flex justify-end">
        <Button type="button" variant="primary" onClick={onStartLessons} className="flex items-center gap-2 font-semibold shadow-xs">
          <span>Begin Module Lessons</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
