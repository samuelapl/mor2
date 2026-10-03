'use client';

import type { ReactNode } from 'react';
import { stripHtmlTags } from '@/components/ui/RichContent';

/** Shared layout pieces for the review stages, so every stage reads the same way. */

export function StageTitle({ icon, eyebrow, title, meta }: { icon: ReactNode; eyebrow: string; title: string; meta?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{eyebrow}</p>
        <h2 className="font-display text-xl font-bold leading-snug text-slate-900">{title}</h2>
        {meta && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">{meta}</div>}
      </div>
    </div>
  );
}

export function StageCard({ title, icon, children }: { title?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
      {title && (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-600">
          {icon}
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-slate-900">{title}</h3>
        </div>
      )}
      {children}
    </section>
  );
}

export function RichSection({ label, html, missing }: { label: string; html?: string | null; missing: string }) {
  const hasContent = Boolean(html && stripHtmlTags(html));
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {hasContent ? (
        <div
          className="prose prose-sm max-w-none rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{ __html: html! }}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs italic text-amber-800">{missing}</p>
      )}
    </div>
  );
}
