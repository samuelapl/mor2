import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:brightness-110 focus-visible:ring-indigo-400",
  outline:
    "border border-slate-300 bg-white/70 text-slate-700 shadow-sm backdrop-blur hover:border-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-md focus-visible:ring-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 focus-visible:ring-slate-200",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-md shadow-red-600/20 hover:from-red-500 hover:to-red-500 hover:brightness-110 focus-visible:ring-red-300",
  success:
    "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:brightness-110 focus-visible:ring-emerald-300",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}