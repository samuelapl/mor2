'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface VerticalBarItem {
  label: string;
  value: number;
  color?: string;
  subLabel?: string;
}

interface VerticalBarChartProps {
  items: VerticalBarItem[];
  maxValue?: number;
  height?: number; // Chart area height in pixels, default 180
  className?: string;
  emptyText?: string;
  unitLabel?: string;
  totalValue?: number;
  totalLabel?: string;
  showGrid?: boolean;
}

export function VerticalBarChart({
  items,
  maxValue,
  height = 180,
  className,
  emptyText = 'No data recorded',
  unitLabel,
  totalValue,
  totalLabel = 'Total',
  showGrid = true,
}: VerticalBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const calculatedTotal = items.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const total = totalValue !== undefined ? totalValue : calculatedTotal;

  // Compute maximum value for scaling
  const peakVal = items.length > 0 ? Math.max(...items.map((i) => Math.max(0, i.value))) : 0;
  const max = maxValue ?? (peakVal > 0 ? Math.ceil(peakVal * 1.15) : 5);

  // Y-axis tick values
  const ticks = [
    max,
    Math.round((max * 2) / 3),
    Math.round(max / 3),
    0,
  ];

  if (items.length === 0) {
    return (
      <div className={cn('py-10 text-center text-xs text-slate-400 italic', className)}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col w-full select-none', className)}>
      {/* Chart Grid and Columns Area */}
      <div className="relative flex items-stretch gap-2" style={{ height }}>
        {/* Y-Axis scale labels */}
        {showGrid && (
          <div className="flex flex-col justify-between text-[10px] font-mono text-slate-400 shrink-0 select-none pr-1 text-right w-6 h-full pb-6 pt-2">
            {ticks.map((tick, idx) => (
              <span key={idx} className="leading-none">
                {tick}
              </span>
            ))}
          </div>
        )}

        {/* Chart Stage */}
        <div className="relative flex-1 flex flex-col justify-end h-full">
          {/* Background Grid Lines */}
          {showGrid && (
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pt-2">
              <div className="w-full border-b border-dashed border-slate-200/80 dark:border-slate-800" />
              <div className="w-full border-b border-dashed border-slate-200/80 dark:border-slate-800" />
              <div className="w-full border-b border-dashed border-slate-200/80 dark:border-slate-800" />
              <div className="w-full border-b border-slate-300 dark:border-slate-700" />
            </div>
          )}

          {/* Vertical Bars Columns */}
          <div className="relative z-10 flex items-end justify-around h-full gap-2 sm:gap-4 pb-6 pt-3 px-1">
            {items.map((item, idx) => {
              const safeVal = Math.max(0, item.value);
              const percent = max > 0 ? Math.min(100, Math.round((safeVal / max) * 100)) : 0;
              const shareOfTotal = total > 0 ? Math.round((safeVal / total) * 100) : 0;
              const color = item.color || '#6366f1';
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer max-w-[72px]"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Floating Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-12 z-30 pointer-events-none whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-800 text-white px-2.5 py-1 text-xs shadow-lg ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span>{item.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center justify-between gap-3 mt-0.5">
                        <span className="font-mono font-bold text-white">{safeVal} {unitLabel || ''}</span>
                        <span>{shareOfTotal}%</span>
                      </div>
                    </div>
                  )}

                  {/* Value Number Pill Above Bar */}
                  <span
                    className={cn(
                      'text-[11px] font-bold font-mono transition-all duration-200 mb-1',
                      safeVal > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600',
                      isHovered && 'scale-110 -translate-y-0.5 text-indigo-600 dark:text-indigo-400 font-extrabold',
                    )}
                  >
                    {safeVal}
                  </span>

                  {/* Vertical Column Track */}
                  <div className="w-full h-full max-w-[42px] bg-slate-100/70 dark:bg-slate-800/40 rounded-t-xl overflow-hidden flex items-end p-0.5 border border-slate-200/50 dark:border-slate-800/60 shadow-2xs">
                    {/* The Animated Colored Vertical Bar Pillar */}
                    <div
                      className={cn(
                        'w-full rounded-t-lg transition-all duration-700 ease-out shadow-xs',
                        isHovered ? 'brightness-110 shadow-md ring-2 ring-white/40' : '',
                      )}
                      style={{
                        height: safeVal > 0 ? `${Math.max(6, percent)}%` : '0%',
                        backgroundColor: color,
                        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.08) 100%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-Axis Labels Row */}
      <div
        className={cn(
          'flex items-start justify-around gap-2 sm:gap-4 px-1 border-t border-slate-200 dark:border-slate-800 pt-2.5',
          showGrid ? 'pl-8' : 'pl-1',
        )}
      >
        {items.map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          const color = item.color || '#6366f1';
          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center text-center max-w-[72px] cursor-pointer group"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              title={item.label}
            >
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0 transition-transform',
                    isHovered && 'scale-150',
                  )}
                  style={{ backgroundColor: color }}
                />
                <span
                  className={cn(
                    'text-[11px] font-semibold truncate transition-colors leading-tight',
                    isHovered
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300',
                  )}
                >
                  {item.label}
                </span>
              </div>
              {item.subLabel && (
                <span className="text-[10px] text-slate-400 truncate max-w-full mt-0.5">
                  {item.subLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
