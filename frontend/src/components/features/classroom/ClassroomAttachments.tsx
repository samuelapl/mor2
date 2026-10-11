'use client';

import { Download, ExternalLink } from 'lucide-react';
import type { UploadedResource } from '@/types';
import { formatFileSize, getFileBadge } from '@/components/features/courses/wizard-components';
import { cn } from '@/lib/utils';

interface ClassroomAttachmentsProps {
  files: UploadedResource[];
  label?: string;
  className?: string;
}

export function ClassroomAttachments({
  files,
  label = 'Attached Resource',
  className,
}: ClassroomAttachmentsProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Lab Materials & Attachments ({files.length})
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {files.map((file, idx) => {
          const badge = getFileBadge(file);
          const Icon = badge.icon;

          return (
            <div
              key={file.id || file.url || idx}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/90 bg-card p-3 shadow-2xs hover:border-primary/30 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    badge.bgColor,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-subtle-foreground">
                    <span className="rounded bg-secondary px-1 py-0.2 font-medium text-secondary-foreground">
                      {badge.badgeLabel}
                    </span>
                    {file.size ? <span>{formatFileSize(file.size)}</span> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-muted hover:text-primary transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="hidden sm:inline">Open</span>
                </a>
                <a
                  href={file.url}
                  download={file.name}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  title="Download file"
                >
                  <Download className="h-3 w-3" />
                  <span className="hidden sm:inline">Save</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
