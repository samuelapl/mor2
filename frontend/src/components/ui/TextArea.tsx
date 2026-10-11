'use client';

import { cn } from '@/lib/utils';

export interface TextAreaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Plain-text counterpart of RichTextArea, with the same label, border and error styling. */
export function TextArea({ id, value, onChange, placeholder, rows = 3, label, error, required, disabled, className }: TextAreaProps) {
  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-secondary-foreground">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={cn(
          'block w-full resize-y rounded-xl border bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-subtle-foreground',
          error
            ? 'border-danger/40 ring-2 ring-danger/10 focus:border-danger'
            : 'border-border/90 focus:border-ring focus:ring-4 focus:ring-ring/10',
          disabled && 'bg-muted opacity-75',
        )}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
