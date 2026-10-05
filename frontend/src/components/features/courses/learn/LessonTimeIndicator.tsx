'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

interface LessonTimeIndicatorProps {
  spent: number;
  required: number;
  satisfied: boolean;
}

export function LessonTimeIndicator({ spent, required, satisfied }: LessonTimeIndicatorProps) {
  if (required <= 0) return null;
  const pct = Math.min(100, Math.round((spent / required) * 100));

  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
      <Clock className="h-3 w-3 shrink-0" />
      <span className={cn('font-medium', satisfied ? 'text-emerald-600' : 'text-indigo-600 font-semibold')}>
        {formatMMSS(spent)} / {formatMMSS(required)}
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
        <div className={cn('h-full rounded-full', satisfied ? 'bg-emerald-500' : 'bg-indigo-500')} style={{ width: `${pct}%` }} />
      </div>
      {satisfied ? <Badge variant="green">Time met</Badge> : null}
    </div>
  );
}
