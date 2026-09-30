'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { cn } from '@/lib/utils';

export interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

interface LanguageOption {
  key: 'en' | 'am';
  code: string;
  nativeName: string;
  englishName: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    key: 'en',
    code: 'EN',
    nativeName: 'English',
    englishName: 'English (US)',
  },
  {
    key: 'am',
    code: 'አማ',
    nativeName: 'አማርኛ',
    englishName: 'Amharic (ET)',
  },
];

export function LanguageToggle({
  className,
  showIcon = true,
  compact = false,
}: LanguageToggleProps) {
  const { lang, updateLocale } = useLms();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentOption = LANGUAGES.find((opt) => opt.key === lang) || LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (key: 'en' | 'am') => {
    void updateLocale(key);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select application language"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/90 font-medium text-slate-700 dark:text-slate-200 shadow-2xs backdrop-blur-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 active:scale-98',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs',
        )}
      >
        {showIcon && (
          <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
        )}
        <span className="font-semibold tracking-tight">
          {compact ? currentOption.code : `${currentOption.nativeName} (${currentOption.code})`}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180 text-indigo-600 dark:text-indigo-400',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Languages"
          className="absolute right-0 top-full mt-1.5 z-50 w-48 origin-top-right rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-850/95 p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-slate-950/40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 focus:outline-hidden"
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-700/50 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {lang === 'am' ? 'ቋንቋ ይምረጡ' : 'Select Language'}
            </p>
          </div>

          {LANGUAGES.map((option) => {
            const isActive = lang === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(option.key)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 font-medium',
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="leading-tight">{option.nativeName}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    {option.englishName}
                  </span>
                </div>

                {isActive && (
                  <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageToggle;
