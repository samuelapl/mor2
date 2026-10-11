'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface DonutSegment {
  label: string;
  value: number;
  color: string; // Tailwind color class or hex string, e.g. "#3b82f6" or "rgb(59 130 246)"
  subLabel?: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  className?: string;
  emptyText?: string;
  showLegend?: boolean;
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 180,
  className,
  emptyText = 'No data',
  showLegend = true,
}: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~238.76

  // Precompute stroke offsets
  let accumulatedOffset = 0;
  const renderedSegments = segments.map((seg, idx) => {
    const safeVal = Math.max(0, seg.value);
    const fraction = total > 0 ? safeVal / total : 0;
    const strokeDash = fraction * circumference;
    const offset = accumulatedOffset;
    accumulatedOffset += strokeDash;
    const percent = total > 0 ? Math.round(fraction * 100) : 0;
    return {
      ...seg,
      strokeDash,
      offset,
      percent,
      idx,
    };
  });

  const displayCenterValue = centerValue !== undefined ? centerValue : total > 0 ? total : 0;
  const displayCenterLabel =
    centerLabel !== undefined
      ? centerLabel
      : hoveredIdx !== null && segments[hoveredIdx]
        ? segments[hoveredIdx].label
        : 'Total';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around',
        className,
      )}
    >
      {/* SVG Container */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90 transform"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            className="stroke-secondary"
            strokeWidth={strokeWidth}
          />

          {total === 0 ? (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              className="stroke-border"
              strokeWidth={strokeWidth}
              strokeDasharray="4 4"
            />
          ) : (
            renderedSegments.map((seg) => {
              if (seg.strokeDash === 0) return null;
              const isHovered = hoveredIdx === seg.idx;
              return (
                <circle
                  key={seg.idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={`${seg.strokeDash} ${circumference - seg.strokeDash}`}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="butt"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(seg.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })
          )}
        </svg>

        {/* Center label & number */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span className="font-display text-xl font-bold tracking-tight text-foreground leading-none">
            {total === 0 ? '—' : displayCenterValue}
          </span>
          <span className="mt-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider max-w-[80px] truncate leading-tight">
            {total === 0 ? emptyText : displayCenterLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-1 flex-col gap-2 w-full max-w-xs">
          {segments.length === 0 || total === 0 ? (
            <p className="text-xs text-subtle-foreground italic py-2 text-center sm:text-left">
              {emptyText}
            </p>
          ) : (
            renderedSegments.map((seg) => {
              const isHovered = hoveredIdx === seg.idx;
              return (
                <div
                  key={seg.idx}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-xs',
                    isHovered
                      ? 'bg-secondary/90 font-semibold'
                      : 'hover:bg-muted text-secondary-foreground',
                  )}
                  onMouseEnter={() => setHoveredIdx(seg.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate text-foreground font-medium">{seg.label}</span>
                    {seg.subLabel && (
                      <span className="text-[10px] text-subtle-foreground">({seg.subLabel})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-display">
                    <span className="font-bold text-foreground">{seg.value}</span>
                    <span className="text-subtle-foreground text-[11px] w-8 text-right">
                      {seg.percent}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
