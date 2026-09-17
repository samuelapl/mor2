"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceDetailOverlayProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode | string;
  subtitle?: ReactNode | string;
  badge?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Reusable full-workspace detail overlay.
 * Uses createPortal to mount directly to document.body, eliminating all ancestor
 * CSS transforms, stacking contexts, and padding offsets.
 * Snaps flush to the sidebar (left-0 md:left-64) and header (top-16) to occupy
 * the 100% full LMS workspace area without gaps or space.
 */
export function WorkspaceDetailOverlay({
  open,
  onClose,
  title,
  subtitle,
  badge,
  actions,
  footer,
  children,
  className,
  contentClassName,
}: WorkspaceDetailOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed top-16 bottom-0 left-0 md:left-64 right-0 z-30 flex flex-col bg-slate-50 overflow-hidden shadow-2xl animate-fade-in",
        className,
      )}
    >
      {/* Top Workspace Header Bar */}
      <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-200/90 bg-white/95 px-6 py-3.5 backdrop-blur-md shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-800"
            title="Go back / Close"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate font-display text-base font-bold tracking-tight text-slate-900">
                {title}
              </h2>
              {badge ? <div className="shrink-0">{badge}</div> : null}
            </div>
            {subtitle ? (
              <p className="truncate text-xs text-slate-500 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className={cn("flex-1 overflow-y-auto px-6 py-6", contentClassName)}>
        {children}
      </div>

      {/* Optional Workspace Footer Bar */}
      {footer ? (
        <div className="sticky bottom-0 z-20 flex shrink-0 items-center justify-between border-t border-slate-200/90 bg-white/95 px-6 py-3.5 backdrop-blur-md">
          {footer}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
