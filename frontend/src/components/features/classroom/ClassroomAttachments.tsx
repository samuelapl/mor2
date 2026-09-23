"use client";

import { Download, ExternalLink } from "lucide-react";
import type { UploadedResource } from "@/types";
import { formatFileSize, getFileBadge } from "@/components/features/courses/wizard-components";
import { cn } from "@/lib/utils";

interface ClassroomAttachmentsProps {
  files: UploadedResource[];
  label?: string;
  className?: string;
}

export function ClassroomAttachments({
  files,
  label = "Attached Resource",
  className,
}: ClassroomAttachmentsProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Lab Materials & Attachments ({files.length})
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {files.map((file, idx) => {
          const badge = getFileBadge(file);
          const Icon = badge.icon;

          return (
            <div
              key={file.id || file.url || idx}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-indigo-300 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    badge.bgColor,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="rounded bg-slate-100 px-1 py-0.2 font-medium text-slate-600">
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
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition"
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

