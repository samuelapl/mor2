import type { ReactNode } from "react";

interface PageSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function PageSection({ title, description, action, children }: PageSectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}