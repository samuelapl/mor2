import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'Content will appear here once records are added.',
  children,
}: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/20 bg-card/60 px-6 py-16 text-center backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40 dark:opacity-20" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-soft to-accent-soft text-primary shadow-sm ring-1 ring-primary/20">
        <Construction className="h-7 w-7" />
      </div>
      <h2 className="relative mt-4 font-display text-sm font-semibold text-secondary-foreground">{title}</h2>
      <p className="relative mt-1 max-w-sm text-xs leading-relaxed text-subtle-foreground">{description}</p>
      {children ? <div className="relative mt-4">{children}</div> : null}
    </div>
  );
}
