'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CalendarRange,
  BookOpen,
  BadgeCheck,
  Presentation,
  GraduationCap,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RoleDistributionItem {
  key: string;
  label: string;
  count: number;
  color: string;
  icon?: LucideIcon;
}

const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  SYSTEM_ADMIN: ShieldCheck,
  TRAINING_ADMIN: CalendarRange,
  COURSE_OWNER: BookOpen,
  CONTENT_APPROVER: BadgeCheck,
  TRAINER: Presentation,
  LEARNER: GraduationCap,
};

interface RoleDistributionWidgetProps {
  items: RoleDistributionItem[];
  totalUsers: number;
  emptyText?: string;
  unitLabel?: string;
}

export function RoleDistributionWidget({
  items,
  totalUsers,
  emptyText = 'No users recorded in database',
  unitLabel = 'users',
}: RoleDistributionWidgetProps) {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const total = totalUsers > 0 ? totalUsers : items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-subtle-foreground italic">
        <Users className="mb-2 h-8 w-8 text-muted-foreground/40" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Proportional Segmented Progress Bar ── */}
      <div className="space-y-1.5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5 shadow-inner ring-1 ring-border/50">
          {items.map((item) => {
            if (item.count <= 0) return null;
            const pct = Math.max(1.5, (item.count / total) * 100);
            const isHovered = hoveredRole === item.key;
            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredRole(item.key)}
                onMouseLeave={() => setHoveredRole(null)}
                style={{
                  width: `${pct}%`,
                  backgroundColor: item.color,
                }}
                className={cn(
                  'h-full transition-all duration-200 first:rounded-l-full last:rounded-r-full cursor-pointer',
                  isHovered ? 'brightness-125 scale-y-125 shadow-md z-10' : 'opacity-90 hover:opacity-100',
                )}
                title={`${item.label}: ${item.count} (${Math.round((item.count / total) * 100)}%)`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
          <span>0%</span>
          <span className="font-mono text-xs font-semibold text-foreground">
            {total.toLocaleString()} {unitLabel}
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* ── 2. Responsive Role Cards Grid (3 cols on md+, 2 on sm) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon || ROLE_ICON_MAP[item.key] || Users;
          const share = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const isHovered = hoveredRole === item.key;

          return (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredRole(item.key)}
              onMouseLeave={() => setHoveredRole(null)}
              className={cn(
                'group relative flex flex-col justify-between rounded-xl border p-3 transition-all duration-200 cursor-pointer shadow-2xs',
                isHovered
                  ? 'border-primary/50 bg-card ring-2 ring-primary/20 shadow-sm translate-y-[-1px]'
                  : 'border-border/70 bg-card/80 hover:border-border hover:bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-2xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${item.color}18`,
                      color: item.color,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground truncate" title={item.label}>
                    {item.label}
                  </span>
                </div>
                <span
                  className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold"
                  style={{
                    backgroundColor: `${item.color}15`,
                    color: item.color,
                  }}
                >
                  {share}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-auto pt-1">
                <span className="font-mono text-base font-extrabold text-foreground tracking-tight">
                  {item.count.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {item.count === 1 ? 'account' : 'accounts'}
                </span>
              </div>

              {/* Mini proportion bar under each card */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary/80">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(item.count > 0 ? 4 : 0, share))}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

