'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

export interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
  /** Where the dropdown opens. 'up-start' suits a toggle in a bottom-left corner. */
  placement?: 'down-end' | 'up-start';
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
  placement = 'down-end',
}: LanguageToggleProps) {
  const { lang, changeLanguage, t } = useTranslation('common');
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
    void changeLanguage(key);
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
          'inline-flex items-center gap-2 rounded-xl border border-border/90 bg-card/95 font-medium text-secondary-foreground shadow-2xs backdrop-blur-sm transition-all hover:bg-muted hover:border-input focus:outline-hidden focus:ring-2 focus:ring-ring/20 active:scale-98',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs',
        )}
      >
        {showIcon && (
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
        )}
        <span className="font-semibold tracking-tight">
          {compact ? currentOption.code : `${currentOption.nativeName} (${currentOption.code})`}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-subtle-foreground transition-transform duration-200',
            isOpen && 'rotate-180 text-primary',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Languages"
          className={cn(
            'absolute z-[80] w-48 rounded-2xl border border-border/90 bg-popover/95 p-1.5 shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 focus:outline-hidden',
            placement === 'up-start'
              ? 'left-0 bottom-full mb-1.5 origin-bottom-left'
              : 'right-0 top-full mt-1.5 origin-top-right',
          )}
        >
          <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">
              {t('languageToggle.selectLanguage')}
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
                    ? 'bg-primary-soft text-primary font-bold'
                    : 'text-secondary-foreground hover:bg-secondary/70 font-medium',
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="leading-tight">{option.nativeName}</span>
                  <span className="text-[10px] text-subtle-foreground font-normal">
                    {option.englishName}
                  </span>
                </div>

                {isActive && (
                  <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
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
