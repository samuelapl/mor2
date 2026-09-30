'use client';
import { useRef, useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light' as const, icon: Sun, en: 'Light', am: 'ብርሃን' },
  { value: 'dark' as const, icon: Moon, en: 'Dark', am: 'ጨለማ' },
  { value: 'system' as const, icon: Monitor, en: 'System', am: 'የስርዓቱ' },
];

export function ThemeToggle({ isAmharic }: { isAmharic?: boolean }) {
  const { theme, setTheme, isDark } = useTheme();
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
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 shadow-sm backdrop-blur transition-all hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md active:scale-95"
      >
        <Icon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-[70] w-40 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 animate-scale-in">
          {OPTIONS.map(({ value, icon: Ic, en, am }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setTheme(value); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60',
                theme === value ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-700 dark:text-slate-300',
              )}
            >
              <Ic className="h-4 w-4" />
              <span className="flex-1 text-left">{isAmharic ? am : en}</span>
              {theme === value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
