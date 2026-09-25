import { Building2, Laptop, Repeat } from "lucide-react";
import type { CourseDeliveryMode } from "@/types";
import { cn } from "@/lib/utils";

const STYLES: Record<CourseDeliveryMode, { label: string; icon: typeof Laptop; className: string }> = {
  ONLINE_ONLY: { label: "Online", icon: Laptop, className: "bg-sky-50 text-sky-700 border-sky-200" },
  IN_PERSON_ONLY: { label: "In-Person", icon: Building2, className: "bg-amber-50 text-amber-800 border-amber-200" },
  BOTH: { label: "Online & In-Person", icon: Repeat, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

/**
 * How a course is delivered. Pass the course's mode to show what it offers, or the learner's
 * own choice once enrolled; `detail` (e.g. the venue branch) replaces the in-person label.
 */
export function DeliveryModeBadge({ mode, detail }: { mode: CourseDeliveryMode; detail?: string | null }) {
  const { label, icon: Icon, className } = STYLES[mode] ?? STYLES.ONLINE_ONLY;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {mode === "IN_PERSON_ONLY" && detail ? detail : label}
    </span>
  );
}
