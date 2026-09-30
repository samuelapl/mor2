'use client';

import { GripVertical, Trash2, CheckCircle2, HelpCircle, ToggleLeft } from 'lucide-react';
import type { PreparedQuestion } from '@/lib/api/prepared-quiz';

const TYPE_ICON: Record<string, React.ReactNode> = {
  MULTIPLE_CHOICE: <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />,
  TRUE_FALSE: <ToggleLeft className="h-3.5 w-3.5 text-amber-500" />,
  SHORT_ANSWER: <HelpCircle className="h-3.5 w-3.5 text-emerald-500" />,
};

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'MCQ',
  TRUE_FALSE: 'T/F',
  SHORT_ANSWER: 'Short',
};

interface PreparedQuizBadgeProps {
  item: PreparedQuestion;
  index: number;
  onRemove: (questionId: string) => void;
  isSaving?: boolean;
  /** Pass true when used inside the live session broadcast panel */
  isLiveMode?: boolean;
  onBroadcast?: (item: PreparedQuestion) => void;
}

export function PreparedQuizBadge({
  item,
  index,
  onRemove,
  isSaving,
  isLiveMode,
  onBroadcast,
}: PreparedQuizBadgeProps) {
  const q = item.question;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-indigo-200 transition group">
      {/* Drag handle (pre-session only) */}
      {!isLiveMode && (
        <div className="mt-0.5 cursor-grab text-slate-300 hover:text-slate-500">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Order badge */}
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 border border-indigo-100">
        {index + 1}
      </span>

      {/* Question content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {TYPE_ICON[q.type] ?? <HelpCircle className="h-3.5 w-3.5 text-slate-400" />}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {TYPE_LABEL[q.type] ?? q.type}
          </span>
          <span className="text-[10px] text-slate-400">·</span>
          <span className="text-[10px] text-slate-400">{q.points} pts</span>
          {q.category && q.category !== 'General' && (
            <>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{q.category}</span>
            </>
          )}
        </div>
        <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">{q.question}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isLiveMode && onBroadcast ? (
          <button
            type="button"
            onClick={() => onBroadcast(item)}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
          >
            Broadcast
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRemove(item.questionId)}
            disabled={isSaving}
            className="p-1 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 disabled:opacity-30"
            title="Remove from prepared quiz"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
