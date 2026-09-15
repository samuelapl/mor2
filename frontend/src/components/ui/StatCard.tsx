import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  iconClassName?: string;
}

export function StatCard({ icon: Icon, label, value, hint, iconClassName }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/10 via-violet-400/10 to-transparent opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm ring-1 ring-slate-900/5 transition-transform duration-200 group-hover:scale-110",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}