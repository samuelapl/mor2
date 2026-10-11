'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { type ToastItem, type ToastType, dismissToast, subscribeToasts } from '@/lib/toast';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    iconBg: string;
    borderClass: string;
    stripeClass: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-success',
    iconBg: 'bg-success-soft text-success ring-1 ring-success/30',
    borderClass: 'border-border shadow-emerald-950/10',
    stripeClass: 'border-l-success',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-danger',
    iconBg: 'bg-danger-soft text-danger ring-1 ring-danger/30',
    borderClass: 'border-border shadow-rose-950/10',
    stripeClass: 'border-l-danger',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-warning',
    iconBg: 'bg-warning-soft text-warning ring-1 ring-warning/30',
    borderClass: 'border-border shadow-amber-950/10',
    stripeClass: 'border-l-warning',
  },
  info: {
    icon: Info,
    iconClass: 'text-primary',
    iconBg: 'bg-primary-soft text-primary ring-1 ring-primary/30',
    borderClass: 'border-border shadow-indigo-950/10',
    stripeClass: 'border-l-primary',
  },
  loading: {
    icon: Loader2,
    iconClass: 'text-primary animate-spin',
    iconBg: 'bg-primary-soft text-primary ring-1 ring-primary/30',
    borderClass: 'border-border shadow-indigo-950/10',
    stripeClass: 'border-l-primary',
  },
};

function SingleToast({ toast }: { toast: ToastItem }) {
  const [exiting, setExiting] = useState(false);
  const config = TYPE_CONFIG[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => dismissToast(toast.id), 200);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration]);

  const handleManualDismiss = () => {
    setExiting(true);
    setTimeout(() => dismissToast(toast.id), 200);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex items-start gap-3.5 rounded-xl border border-l-[5px] bg-popover p-4 shadow-2xl ring-1 ring-foreground/5 transition-all duration-200',
        config.borderClass,
        config.stripeClass,
        exiting
          ? 'opacity-0 translate-y-3 scale-95'
          : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-3 duration-200',
      )}
    >
      <div
        className={cn(
          'shrink-0 flex h-9 w-9 items-center justify-center rounded-lg',
          config.iconBg,
        )}
      >
        <Icon className={cn('h-5 w-5', config.iconClass)} />
      </div>

      <div className="flex-1 min-w-0 pr-1 pt-0.5">
        {toast.title && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            {toast.title}
          </p>
        )}
        <p className="text-sm font-semibold text-foreground leading-snug break-words">
          {toast.message}
        </p>

        {toast.action && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                handleManualDismiss();
              }}
              className="text-xs font-bold text-primary hover:text-primary/80 hover:underline"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleManualDismiss}
        aria-label="Close notification"
        className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-subtle-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[99999] flex flex-col-reverse gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {items.map((t) => (
        <SingleToast key={t.id} toast={t} />
      ))}
    </div>
  );
}
