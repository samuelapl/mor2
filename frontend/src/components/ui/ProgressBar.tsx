import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillClass =
    clamped >= 100
      ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgb(16_185_129/0.45)]"
      : clamped >= 50
        ? "bg-gradient-to-r from-indigo-600 to-violet-500 shadow-[0_0_12px_rgb(99_102_241/0.4)]"
        : "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_12px_rgb(245_158_11/0.4)]";
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-100/90 ring-1 ring-inset ring-slate-900/5",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          fillClass,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}