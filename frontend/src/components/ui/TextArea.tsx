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
        <label htmlFor={id} className="block text-xs font-semibold text-slate-600">
          {label} {required && <span className="text-red-500">*</span>}
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
          'block w-full resize-y rounded-xl border bg-white px-3 py-2 text-sm text-slate-800 shadow-xs outline-none transition placeholder:text-slate-400',
          error
            ? 'border-red-300 ring-2 ring-red-500/10 focus:border-red-500'
            : 'border-slate-200/90 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10',
          disabled && 'bg-slate-50 opacity-75',
        )}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
