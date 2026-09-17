"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  title?: string;
  subtitle?: string;
  color?: string;
  className?: string;
}

export function ProgressRing({
  percentage,
  size = 130,
  strokeWidth = 10,
  title,
  subtitle,
  color = "#4f46e5",
  className,
}: ProgressRingProps) {
  const safePercent = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <span className="font-display text-2xl font-bold tracking-tight text-slate-900 leading-none">
          {safePercent}%
        </span>
        {subtitle && (
          <span className="mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-tight">
            {subtitle}
          </span>
        )}
        {title && (
          <span className="mt-0.5 text-xs font-semibold text-slate-600 truncate max-w-[80px]">
            {title}
          </span>
        )}
      </div>
    </div>
  );
}
