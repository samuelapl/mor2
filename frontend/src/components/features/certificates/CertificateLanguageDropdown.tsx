'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CertificateLanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  flag?: string;
  isAvailable?: boolean;
}

/**
 * Extensible configuration for certificate output languages.
 * Add new languages here to support them across preview and PDF generation.
 */
export const SUPPORTED_CERTIFICATE_LANGUAGES: CertificateLanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧', isAvailable: true },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ', flag: '🇪🇹', isAvailable: true },
  { code: 'om', label: 'Afaan Oromoo', nativeLabel: 'Afaan Oromoo', flag: '🇪🇹', isAvailable: false },
  { code: 'ti', label: 'Tigrinya', nativeLabel: 'ትግርኛ', flag: '🇪🇹', isAvailable: false },
  { code: 'so', label: 'Somali', nativeLabel: 'Soomaali', flag: '🇸🇴', isAvailable: false },
];

export interface CertificateLanguageDropdownProps {
  value: string;
  onChange: (languageCode: string) => void;
  className?: string;
}

export function CertificateLanguageDropdown({
  value,
  onChange,
  className,
}: CertificateLanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    SUPPORTED_CERTIFICATE_LANGUAGES.find((opt) => opt.code === value) ||
    SUPPORTED_CERTIFICATE_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-secondary-foreground shadow-2xs hover:bg-muted transition focus:outline-hidden focus:ring-2 focus:ring-ring/20"
        title="Select Certificate Language"
      >
        <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="flex items-center gap-1.5">
          {selectedOption.flag && <span>{selectedOption.flag}</span>}
          <span>{selectedOption.nativeLabel}</span>
          <span className="text-[10px] text-subtle-foreground">({selectedOption.code.toUpperCase()})</span>
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-subtle-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-2xl z-[80] animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-subtle-foreground border-b border-border/60 mb-1">
            Certificate Language
          </div>
          <div className="space-y-0.5">
            {SUPPORTED_CERTIFICATE_LANGUAGES.map((lang) => {
              const isSelected = lang.code === selectedOption.code;
              const isAvailable = lang.isAvailable !== false;

              return (
                <button
                  key={lang.code}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (isAvailable) {
                      onChange(lang.code);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition',
                    isSelected
                      ? 'bg-primary-soft text-primary font-bold'
                      : isAvailable
                        ? 'text-secondary-foreground hover:bg-muted'
                        : 'text-subtle-foreground cursor-not-allowed opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {lang.flag && <span>{lang.flag}</span>}
                    <div>
                      <div className="font-medium">{lang.nativeLabel}</div>
                      <div className="text-[10px] text-subtle-foreground">{lang.label}</div>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : !isAvailable ? (
                    <span className="text-[9px] font-semibold text-warning bg-warning-soft px-1.5 py-0.5 rounded-sm">
                      Coming soon
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default CertificateLanguageDropdown;
