'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Laptop, Moon, SunMedium } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'dropdown' | 'cycle' | 'segmented';
  size?: 'sm' | 'md';
}

const THEME_OPTIONS: Array<{
  key: Theme;
  icon: typeof SunMedium;
  en: string;
  am: string;
}> = [
  { key: 'light', icon: SunMedium, en: 'Light', am: 'ብርሃን' },
  { key: 'dark', icon: Moon, en: 'Dark', am: 'ጨለማ' },
  { key: 'system', icon: Laptop, en: 'System', am: 'የስርዓቱ' },
];

export function ThemeToggle({
  className,
  variant = 'dropdown',
  size = 'md',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, isDark } = useTheme();
  const { lang } = useTranslation();
  const isAmharic = lang === 'am';
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Current active icon to display on toggle button
  const ActiveIcon =
    theme === 'system' ? Laptop : resolvedTheme === 'dark' ? Moon : SunMedium;

  // Segmented control variant (e.g. for settings or modal)
  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80',
          className,
        )}
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTheme(opt.key)}
              title={isAmharic ? opt.am : opt.en}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150',
                active
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{isAmharic ? opt.am : opt.en}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Quick cycle button variant (Light -> Dark -> System)
  if (variant === 'cycle') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 p-2 text-slate-600 shadow-2xs transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
          size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
          className,
        )}
        title={
          theme === 'system'
            ? isAmharic
              ? 'የስርዓቱ ገጽታ (System)'
              : 'System Theme'
            : isDark
              ? isAmharic
                ? 'ጨለማ ገጽታ (Dark)'
                : 'Dark Theme'
              : isAmharic
                ? 'ብርሃን ገጽታ (Light)'
                : 'Light Theme'
        }
      >
        <ActiveIcon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    );
  }

  // Dropdown menu variant (default)
  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={
          isAmharic
            ? `ገጽታ ቀይር (አሁን: ${
                theme === 'light'
                  ? 'ብርሃን'
                  : theme === 'dark'
                    ? 'ጨለማ'
                    : 'የስርዓቱ'
              })`
            : `Theme: ${theme}`
        }
        className={cn(
          'inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-slate-600 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 active:scale-95 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white',
          size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        )}
      >
        <ActiveIcon
          className={cn(
            'transition-transform duration-200',
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
            theme === 'dark' ? 'text-indigo-400' : theme === 'light' ? 'text-amber-500' : 'text-slate-500 dark:text-slate-300',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] origin-top-right rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl backdrop-blur-md transition-all animate-scale-in dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {isAmharic ? 'ገጽታ' : 'Theme'}
          </div>

          <div className="space-y-0.5">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTheme(opt.key);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5',
                        opt.key === 'light'
                          ? 'text-amber-500'
                          : opt.key === 'dark'
                            ? 'text-indigo-400'
                            : 'text-slate-400 dark:text-slate-500',
                      )}
                    />
                    <span>{isAmharic ? opt.am : opt.en}</span>
                  </span>

                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
