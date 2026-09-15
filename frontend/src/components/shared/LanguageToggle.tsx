"use client";

import { Languages } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { cn } from "@/lib/utils";

export default function LanguageToggle() {
  const { lang, setLang } = useLms();

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-slate-400" />
      <div className="flex items-center rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-sm">
        {(["en", "am"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setLang(option)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200",
              lang === option
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/30"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {option === "en" ? "EN" : "አማ"}
          </button>
        ))}
      </div>
    </div>
  );
}