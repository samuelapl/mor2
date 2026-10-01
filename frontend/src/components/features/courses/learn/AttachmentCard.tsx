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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition hover:border-indigo-300">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
            badge.bgColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
              {badge.badgeLabel}
            </span>
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-2xs"
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

