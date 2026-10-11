'use client';

import { Download, ExternalLink } from 'lucide-react';
import type { UploadedResource } from '@/types';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileBadge } from '../wizard-components';

interface LearnAttachmentCardProps {
  file: UploadedResource;
  label?: string;
}

export function LearnAttachmentCard({ file, label }: LearnAttachmentCardProps) {
  const badge = getFileBadge(file);
  const Icon = badge.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/90 bg-card p-3.5 shadow-2xs transition hover:border-primary/30">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', badge.bgColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-subtle-foreground mt-0.5">
            <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">{badge.badgeLabel}</span>
            {file.size ? <span>{formatFileSize(file.size)}</span> : null}
            {label ? <span>· {label}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-muted hover:text-primary transition shadow-2xs"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Open</span>
        </a>
        <a
          href={file.url}
          download={file.name}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs"
          title="Download file"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}
