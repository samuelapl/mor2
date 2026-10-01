'use client';

import { Download, ExternalLink } from 'lucide-react';
import type { UploadedResource } from '@/types';
import { cn } from '@/lib/utils';
import { formatFileSize, getFileBadge } from '../wizard-components';

interface AttachmentCardProps {
  file: UploadedResource;
  isAmharic?: boolean;
}

export function AttachmentCard({ file, isAmharic }: AttachmentCardProps) {
  const badge = getFileBadge(file);
  const Icon = badge.icon;
  const fileName = file.name || file.url.split('/').pop() || 'Attachment';

  return (
    <div className="group flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 px-3 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', badge.bgColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition"
            title={fileName}
          >
            {fileName}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">{badge.badgeLabel}</span>
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
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition shadow-2xs"
          title={isAmharic ? 'ፋይል በአዲስ ገጽ ክፈት' : 'Open file in new tab'}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>{isAmharic ? 'ክፈት' : 'Open'}</span>
        </a>
        <a
          href={file.url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
          title={isAmharic ? 'ፋይል አውርድ' : 'Download file'}
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isAmharic ? 'አውርድ' : 'Download'}</span>
        </a>
      </div>
    </div>
  );
}

