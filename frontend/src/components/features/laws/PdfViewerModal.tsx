'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  ExternalLink,
  X,
  Scale,
  Calendar,
  FileText,
} from 'lucide-react';
import type { LegalDocument } from '@/types/laws';
import { LAW_STATUS_CONFIG } from '@/types/laws';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface PdfViewerModalProps {
  document: LegalDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PdfViewerModal({ document, isOpen, onClose }: PdfViewerModalProps) {
  const { lang, tBilingual } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and listen for Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = window.getComputedStyle(window.document.body).overflow;
    window.document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !document || !mounted) return null;

  const statusCfg = LAW_STATUS_CONFIG[document.status] || LAW_STATUS_CONFIG.IN_FORCE;
  const statusLabel = lang === 'am' ? statusCfg.labelAm : statusCfg.labelEn;

  const docTitle =
    (lang === 'am'
      ? document.titleAm || document.titleEn
      : document.titleEn || document.titleAm) || 'Legal Document';

  const categoryName = document.category
    ? lang === 'am'
      ? document.category.nameAm || document.category.nameEn
      : document.category.nameEn || document.category.nameAm
    : null;

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderStatusBadge = () => {
    if (document.status === 'IN_FORCE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          {statusLabel}
        </span>
      );
    }
    if (document.status === 'REPEALED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          {statusLabel}
        </span>
      );
    }
    if (document.status === 'AMENDED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {statusLabel}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700/60 text-slate-300 border border-slate-600">
        {statusLabel}
      </span>
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={docTitle}
      className="fixed inset-0 z-[99999] flex flex-col bg-slate-950 animate-in fade-in duration-200"
    >
      {/* ── TOP ACCENT LINE: OFFICIAL FEDERAL REGAL GRADIENT ────────────── */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-indigo-500 to-purple-600 shrink-0" />

      {/* ── COMMAND HEADER BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-900/95 border-b border-slate-800 text-white shrink-0 backdrop-blur-xl shadow-2xl">
        {/* Left: Official Seal & Document Details */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Scales of Justice Negarit Emblem */}
          <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-indigo-500/20 border border-amber-500/40 flex flex-col items-center justify-center text-amber-400 shadow-inner">
            <Scale className="w-5 h-5" />
            <span className="text-[7px] font-serif uppercase tracking-widest text-amber-300/90 font-bold leading-none mt-0.5">
              ነጋሪት
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {/* Metadata Tags Row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <FileText className="w-3 h-3 text-indigo-400" />
                {tBilingual('No.', 'ቁ.')} {document.documentNumber}
              </span>

              {renderStatusBadge()}

              {categoryName && (
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80 truncate max-w-[220px]">
                  {categoryName}
                </span>
              )}

              {document.yearIssued && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {document.yearIssued}
                </span>
              )}

              {formatFileSize(document.fileSize) && (
                <span className="hidden lg:inline text-xs font-mono text-slate-500">
                  • {formatFileSize(document.fileSize)}
                </span>
              )}
            </div>

            {/* Document Title */}
            <h1
              className={cn(
                'text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate leading-tight',
                lang === 'am' && 'font-serif',
              )}
            >
              {docTitle}
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <a
            href={document.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition-all hover:border-slate-600 active:scale-95"
            title={tBilingual('Open in new browser tab', 'በአዲስ ታብ ክፈት')}
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">{tBilingual('New Tab', 'አዲስ ታብ')}</span>
          </a>

          <a
            href={document.pdfUrl}
            download={document.fileName}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            title={tBilingual('Download official decree PDF', 'ይፋዊውን የሕግ ሰነድ አውርድ')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{tBilingual('Download PDF', 'ፒዲኤፍ አውርድ')}</span>
          </a>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={onClose}
            aria-label={tBilingual('Close document viewer', 'ሰነድ መመልከቻውን ዝጋ')}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-white bg-slate-800/90 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all"
            title={tBilingual('Close (ESC)', 'ዝጋ (ESC)')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── VIEWER BODY: FULL-HEIGHT SMOOTH IFRAME ──────────────────────── */}
      <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden relative">
        <iframe
          src={`${document.pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          title={docTitle}
          className="w-full h-full border-0 bg-slate-900"
        />
      </div>
    </div>,
    window.document.body,
  );
}
