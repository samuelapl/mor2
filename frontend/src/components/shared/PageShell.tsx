import type { ReactNode } from "react";
import { ROLE_LABELS } from "@/constants/roles";
import type { Role } from "@/types";

interface PageShellProps {
  role: Role;
  title: string;
  description: string;
  children?: ReactNode;
}

export default function PageShell({
  role,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up px-6 py-8 lg:px-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/70 px-3 py-1 shadow-sm backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
            {ROLE_LABELS[role]}
          </p>
        </div>
        <h1 className="mt-4 font-display text-[28px] font-bold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}