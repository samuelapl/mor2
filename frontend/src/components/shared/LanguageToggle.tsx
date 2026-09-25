"use client";

import { Globe } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { cn } from "@/lib/utils";

export interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export function LanguageToggle({
  className,
  showIcon = true,
  compact = false,
}: LanguageToggleProps) {
  const { lang, updateLocale } = useLms();

  const options = [
    { key: "en" as const, label: "EN", full: "English" },
    { key: "am" as const, label: "አማ", full: "አማርኛ" },
  ];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {showIcon && (
        <Globe className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
      )}
      <div
        role="group"
        aria-label="Language selection"
        className="flex items-center rounded-xl border border-slate-200/90 bg-white/90 p-0.5 shadow-2xs backdrop-blur-sm"
      >
        {options.map((option) => {
          const isActive = lang === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => void updateLocale(option.key)}
              title={option.full}
              aria-pressed={isActive}
              aria-label={`Switch language to ${option.full}`}
              className={cn(
                "rounded-lg font-semibold transition-all duration-200 active:scale-95",
                compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs shadow-indigo-500/25 ring-1 ring-white/20"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageToggle;