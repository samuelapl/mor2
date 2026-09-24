"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "md" | "lg" | "xl" | "full" | "screen";
  children: ReactNode;
  footer?: ReactNode;
}

const SIZE_CLASSES = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl w-[95vw]",
};

export function Modal({ open, onClose, title, subtitle, size = "md", children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portaled to <body> so an ancestor's stacking context (e.g. an animated page wrapper)
  // can't trap it underneath full-screen overlays like WorkspaceDetailOverlay.
  // "screen" fills the dashboard content area only — below the header, to
  // the right of the sidebar — so those stay visible and usable, with no
  // dimmed backdrop behind it.
  if (size === "screen") {
    return createPortal(
      <div className="fixed top-16 bottom-0 left-0 md:left-64 right-0 z-30 flex animate-fade-in flex-col bg-white overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-transparent px-6 py-5">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-950/60"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full animate-scale-in flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_24px_80px_-16px_rgb(2_6_23/0.35)]",
          SIZE_CLASSES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-transparent px-6 py-5">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}