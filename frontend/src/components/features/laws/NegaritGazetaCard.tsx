'use client';

import React from 'react';
import { Eye, Download, Edit2, Trash2, Calendar, FileText, Scale } from 'lucide-react';
import type { LegalDocument } from '@/types/laws';
import { LAW_STATUS_CONFIG } from '@/types/laws';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface NegaritGazetaCardProps {
  document: LegalDocument;
  isAdmin?: boolean;
  onOpenPdf: (doc: LegalDocument) => void;
  onEdit?: (doc: LegalDocument) => void;
  onDelete?: (doc: LegalDocument) => void;
}

export function NegaritGazetaCard({
  document,
  isAdmin = false,
  onOpenPdf,
  onEdit,
  onDelete,
}: NegaritGazetaCardProps) {
  const { lang, t } = useTranslation('laws');
  const statusCfg = LAW_STATUS_CONFIG[document.status] || LAW_STATUS_CONFIG.IN_FORCE;
  const statusLabel = t(`status.${LAW_STATUS_CONFIG[document.status] ? document.status : 'IN_FORCE'}`);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="group relative flex flex-col md:flex-row items-stretch gap-4 p-4 sm:p-5 rounded-xl border border-border/90 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200">
      {/* LEFT: Gazeta Cover Preview */}
      <div className="relative shrink-0 w-full md:w-36 h-40 md:h-auto rounded-lg overflow-hidden border border-border bg-gradient-to-b from-warning-soft/70 via-muted to-warning-soft/40 flex flex-col items-center justify-center p-3 text-center shadow-inner">
        {document.coverImageUrl ? (
          <img
            src={document.coverImageUrl}
            alt={document.titleEn}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <div className="flex flex-col items-center justify-between h-full py-1">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-warning/30 flex items-center justify-center text-warning">
              <Scale className="w-4 h-4" />
            </div>
            <div className="my-auto">
              <span
                className={cn(
                  'block text-[11px] font-bold text-warning tracking-tight leading-tight',
                  lang === 'am' && 'font-serif',
                )}
              >
                {t('negaritGazetaCard.negaritGazeta')}
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold text-secondary-foreground border-t border-warning/20 pt-1 w-full">
              {document.documentNumber}
            </div>
          </div>
        )}
      </div>

      {/* MIDDLE: Legal Metadata & Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Top line: Document Number + Status Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary-soft text-primary border border-primary/30">
              <FileText className="w-3 h-3" />
              {t('negaritGazetaCard.no')} {document.documentNumber}
            </span>

            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                statusCfg.badgeClass,
              )}
            >
              {statusLabel}
            </span>

            {document.yearIssued && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {document.yearIssued}
              </span>
            )}

            {formatFileSize(document.fileSize) && (
              <span className="text-xs text-subtle-foreground">
                • {formatFileSize(document.fileSize)}
              </span>
            )}
          </div>

          {/* Document Title (Single Language based on active selection) */}
          <h3
            className={cn(
              'text-base sm:text-lg font-bold text-foreground leading-snug line-clamp-2 mb-1',
              lang === 'am' && 'font-serif',
            )}
          >
            {lang === 'am'
              ? document.titleAm || document.titleEn
              : document.titleEn || document.titleAm}
          </h3>

          {/* Description snippet */}
          {(document.descriptionAm || document.descriptionEn) && (
            <p className="mt-2 text-xs sm:text-sm text-secondary-foreground line-clamp-2">
              {lang === 'am'
                ? document.descriptionAm || document.descriptionEn
                : document.descriptionEn || document.descriptionAm}
            </p>
          )}
        </div>

        {/* Footer info (Category context) */}
        {document.category && (
          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">
              {lang === 'am'
                ? document.category.nameAm || document.category.nameEn
                : document.category.nameEn || document.category.nameAm}
            </span>
            <span className="text-[11px] font-mono text-subtle-foreground">
              {document.fileName}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: Actions */}
      <div className="shrink-0 flex md:flex-col justify-end md:justify-center items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-border/60 md:pl-4">
        {/* OPEN BUTTON */}
        <button
          onClick={() => onOpenPdf(document)}
          className="w-full md:w-28 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Eye className="w-4 h-4" />
          <span>{t('negaritGazetaCard.open')}</span>
        </button>

        {/* DIRECT DOWNLOAD */}
        <a
          href={document.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={document.fileName}
          className="w-full md:w-28 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-secondary-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('negaritGazetaCard.download')}</span>
        </a>

        {/* ADMIN ACTIONS */}
        {isAdmin && (
          <div className="flex items-center gap-1 w-full justify-center pt-1 border-t border-border/60">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(document)}
                title={t('negaritGazetaCard.editDocument')}
                className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary-soft transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(document)}
                title={t('negaritGazetaCard.deleteDocument')}
                className="p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger-soft transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

