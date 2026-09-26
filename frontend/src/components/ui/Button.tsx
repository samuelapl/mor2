import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-gradient text-white shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:brightness-110 focus-visible:ring-indigo-400',
  outline:
    'border border-slate-300 bg-white/70 text-slate-700 shadow-2xs backdrop-blur-xs hover:border-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-md focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white',
  ghost:
    'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 focus-visible:ring-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200',
  danger:
    'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-md shadow-red-600/20 hover:from-red-500 hover:to-red-500 hover:brightness-110 focus-visible:ring-red-300',
  success:
    'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:brightness-110 focus-visible:ring-emerald-300',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  icon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.97]',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2
          className={cn('animate-spin shrink-0', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')}
        />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}

      {isLoading && loadingText ? <span>{loadingText}</span> : children}
    </button>
  );
}
