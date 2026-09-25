'use client';

import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ClassroomFlatItem } from './types';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface ClassroomFooterProps {
  previousItem: ClassroomFlatItem | null;
  nextItem: ClassroomFlatItem | null;
  onNavigate: (item: ClassroomFlatItem) => void;
  onCompleteAndNext?: () => void;
  currentItem?: ClassroomFlatItem | null;
  requiredSeconds?: number;
  spentSeconds?: number;
  timeSatisfied?: boolean;
  completing?: boolean;
}

function formatMMSS(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const remainder = s % 60;
  return `${m}:${remainder.toString().padStart(2, '0')}`;
}

export function ClassroomFooter({
  previousItem,
  nextItem,
  onNavigate,
  onCompleteAndNext,
  currentItem,
  requiredSeconds = 0,
  spentSeconds = 0,
  timeSatisfied = true,
  completing = false,
}: ClassroomFooterProps) {
  const { tBilingual } = useTranslation();
  const hasTimeReq = requiredSeconds > 0;
  const isTimeMet = !hasTimeReq || timeSatisfied || spentSeconds >= requiredSeconds;

  // Learner can advance when time requirement is met (unless on an unpassed quiz)
  const isCurrentQuizIncomplete = currentItem?.type === 'QUIZ' && !currentItem.completed;
  const canAdvance = isTimeMet && !isCurrentQuizIncomplete;

  return (
    <footer className="sticky bottom-0 z-30 flex h-16 shrink-0 items-center justify-between border-t border-slate-200/90 bg-white/95 px-4 sm:px-6 backdrop-blur shadow-sm">
      {/* Previous Button */}
      <div>
        {previousItem ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate(previousItem)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{tBilingual('Previous', 'ቀዳሚ')}</span>
          </Button>
        ) : (
          <span />
        )}
      </div>

      {/* Center: Time Requirement Tracker */}
      {hasTimeReq && (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
          <span>{tBilingual('Study Time:', 'የጥናት ጊዜ:')}</span>
          <span className="font-mono font-bold text-slate-900">
            {formatMMSS(spentSeconds)} / {formatMMSS(requiredSeconds)}
          </span>
          {isTimeMet ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> {tBilingual('Met', 'ተሟልቷል')}
            </span>
          ) : (
            <span className="text-[11px] text-amber-600 font-semibold">
              {tBilingual('In Progress', 'በመካሄድ ላይ')}
            </span>
          )}
        </div>
      )}

      {/* Next Button */}
      <div>
        {nextItem ? (
          <Button
            type="button"
            size="sm"
            disabled={!canAdvance || completing}
            onClick={() => {
              if (onCompleteAndNext) {
                onCompleteAndNext();
              } else {
                onNavigate(nextItem);
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            {completing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{tBilingual('Advancing…', 'በመቀጠል ላይ…')}</span>
              </>
            ) : nextItem.type === 'QUIZ' ? (
              <>
                <BookOpenCheck className="h-3.5 w-3.5" />
                <span>{tBilingual('Take Assessment', 'ፈተና ውሰድ')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>{tBilingual('Next', 'ቀጣይ')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="text-xs font-semibold text-emerald-600 border-emerald-200 bg-emerald-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {tBilingual('Curriculum Finished', 'ስርዓተ-ትምህርቱ ተጠናቋል')}
          </Button>
        )}
      </div>
    </footer>
  );
}
