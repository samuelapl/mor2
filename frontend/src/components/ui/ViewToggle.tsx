"use client";

import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "grid";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          view === "table"
            ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-900",
        )}
      >
        <TableIcon className="h-3.5 w-3.5" /> Table
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          view === "grid"
            ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-900",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Grid
      </button>
    </div>
  );
}
