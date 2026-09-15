import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
}

export function Card({ className, padded = true, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-slate-200/80 bg-white shadow-soft ring-super-soft",
        padded && "p-5",
        interactive &&
          "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-sm font-semibold tracking-tight text-slate-900", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-xs leading-relaxed text-slate-500", className)} {...props} />;
}