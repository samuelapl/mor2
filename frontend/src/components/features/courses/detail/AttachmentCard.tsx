'use client';

import { Download, ExternalLink } from 'lucide-react';
import type { UploadedResource } from '@/types';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileBadge } from '../wizard-components';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface AttachmentCardProps {
  file: UploadedResource;
}

export function AttachmentCard({ file }: AttachmentCardProps) {
  const { isAmharic, t } = useTranslation('courses');
  const badge = getFileBadge(file);
  const Icon = badge.icon;
  const fileName = file.name || file.url.split('/').pop() || 'Attachment';

  return (
    <div className="group flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/90 bg-card p-2.5 px-3 shadow-2xs hover:border-primary/30 hover:shadow-xs transition">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', badge.bgColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition"
            title={fileName}
          >
            {fileName}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-secondary-foreground">{badge.badgeLabel}</span>
            {file.size ? (
              <>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:border-primary/30 hover:bg-primary-soft hover:text-primary transition shadow-2xs"
          title={t('attachmentCard.openFileInNewTab')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>{t('mediaPreview.open')}</span>
        </a>
        <a
          href={file.url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary-soft/80 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-soft transition shadow-2xs"
          title={t('attachmentCard.downloadFile')}
        >
          <Download className="h-3.5 w-3.5" />
          <span>{t('attachmentCard.download')}</span>
        </a>
      </div>
    </div>
  );
}

