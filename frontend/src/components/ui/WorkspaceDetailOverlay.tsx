"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/ui/RichContent";

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
  fullViewport?: boolean;
  theme?: "light" | "dark";
}

/**
 * Reusable full-workspace detail overlay.
 * Uses createPortal to mount directly to document.body, eliminating all ancestor
 * CSS transforms, stacking contexts, and padding offsets.
 * Can snap flush to the sidebar (left-0 md:left-64) or expand to true fullViewport (inset-0).
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
  fullViewport = false,
  theme = "light",
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

  const isDark = theme === "dark" || (fullViewport && theme !== "light");

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        fullViewport
          ? "fixed inset-0 z-50 flex flex-col overflow-hidden shadow-2xl animate-fade-in"
          : "fixed top-16 bottom-0 left-0 md:left-64 right-0 z-30 flex flex-col overflow-hidden shadow-2xl animate-fade-in",
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900",
        className,
      )}
    >
      {/* Top Workspace Header Bar */}
      <div
        className={cn(
          "sticky top-0 z-20 flex shrink-0 items-center justify-between px-4 sm:px-6 py-3 backdrop-blur-md shadow-xs transition-colors",
          isDark
            ? "border-b border-slate-800 bg-slate-900/95 text-white"
            : "border-b border-slate-200/90 bg-white/95 text-slate-900",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-xs transition",
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
            title="Go back / Close"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2
                className={cn(
                  "truncate font-display text-base font-bold tracking-tight",
                  isDark ? "text-white" : "text-slate-900",
                )}
              >
                {typeof title === "string" && title.includes("<") ? (
                  <RichContent inline html={title} />
                ) : (
                  title
                )}
              </h2>
              {badge ? <div className="shrink-0">{badge}</div> : null}
            </div>
            {subtitle ? (
              <p
                className={cn(
                  "truncate text-xs mt-0.5",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                {typeof subtitle === "string" && subtitle.includes("<") ? (
                  <RichContent inline html={subtitle} />
                ) : (
                  subtitle
                )}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {actions}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-lg p-1.5 transition",
              isDark
                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
            )}
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
        <div
          className={cn(
            "sticky bottom-0 z-20 flex shrink-0 items-center justify-between px-6 py-3.5 backdrop-blur-md",
            isDark
              ? "border-t border-slate-800 bg-slate-900/95 text-white"
              : "border-t border-slate-200/90 bg-white/95 text-slate-900",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
