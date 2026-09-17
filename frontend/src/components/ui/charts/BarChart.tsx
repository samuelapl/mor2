"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BarChartItem {
  label: string;
  value: number;
  subLabel?: string;
  color?: string;
}

interface BarChartProps {
  items: BarChartItem[];
  maxValue?: number;
  className?: string;
  emptyText?: string;
  barColor?: string;
}

export function BarChart({
  items,
  maxValue,
  className,
  emptyText = "No data available",
  barColor = "#6366f1",
}: BarChartProps) {
  const max =
    maxValue ??
    (items.length > 0 ? Math.max(...items.map((i) => i.value), 1) : 1);

  if (items.length === 0) {
    return (
      <div className={cn("py-8 text-center text-xs text-slate-400 italic", className)}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3.5", className)}>
      {items.map((item, idx) => {
        const percent = Math.min(100, Math.round((Math.max(0, item.value) / max) * 100));
        const color = item.color || barColor;

        return (
          <div key={idx} className="space-y-1.5 group">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-[320px] group-hover:text-slate-900 transition-colors">
                {item.label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {item.subLabel && (
                  <span className="text-[11px] text-slate-400">{item.subLabel}</span>
                )}
                <span className="font-display font-bold text-slate-900">{item.value}</span>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-900/5">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out group-hover:opacity-90"
                style={{
                  width: `${percent}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
