'use client';
import { useRef, useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useThemeStore } from '@/lib/stores/theme-store';
import type { NamespaceKey } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

const OPTIONS: { value: 'light' | 'dark' | 'system'; icon: typeof Sun; labelKey: NamespaceKey<'common'> }[] = [
  { value: 'light', icon: Sun, labelKey: 'themeToggle.light' },
  { value: 'dark', icon: Moon, labelKey: 'themeToggle.dark' },
  { value: 'system', icon: Monitor, labelKey: 'themeToggle.system' },
];

export function ThemeToggle() {
  const { t } = useTranslation('common');
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const isDark = useThemeStore((s) => s.resolvedTheme === 'dark');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const Icon = isDark ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle theme"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card/70 text-muted-foreground shadow-sm backdrop-blur transition-all hover:border-primary/30 hover:text-primary hover:shadow-md active:scale-95"
      >
        <Icon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-[80] w-40 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/60 animate-scale-in">
          {OPTIONS.map(({ value, icon: Ic, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setTheme(value); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted',
                theme === value ? 'text-primary font-medium' : 'text-secondary-foreground',
              )}
            >
              <Ic className="h-4 w-4" />
              <span className="flex-1 text-left">{t(labelKey)}</span>
              {theme === value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
