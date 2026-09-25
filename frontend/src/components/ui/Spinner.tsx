import type { HTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'white' | 'slate' | 'accent';

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  inline?: boolean;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-10 w-10',
};

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  primary: 'text-indigo-600',
  white: 'text-white',
  slate: 'text-slate-400',
  accent: 'text-violet-600',
};

export function Spinner({
  size = 'md',
  variant = 'primary',
  label,
  inline = false,
  className,
  ...props
}: SpinnerProps) {
  const content = (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2',
        inline ? 'inline-flex' : 'flex flex-col justify-center items-center',
        className,
      )}
      {...props}
    >
      <Loader2
        className={cn('animate-spin shrink-0', SIZE_CLASSES[size], VARIANT_CLASSES[variant])}
      />
      {label && (
        <span
          className={cn(
            'text-xs font-medium',
            variant === 'white' ? 'text-white/90' : 'text-slate-600',
          )}
        >
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  return content;
}
