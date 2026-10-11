'use client';

import { AlertCircle, Check, ClipboardList, ExternalLink, FileCheck, Loader2, Trash2, UploadCloud } from 'lucide-react';
import type { Lesson, UploadedResource } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichContent } from '@/components/ui/RichContent';
import { formatFileSize } from '../wizard-components';
import { AttachmentCard } from '../detail/AttachmentCard';

export interface AssignmentSubmission {
  fileUrl: string;
  fileName: string;
  sizeBytes: number;
  submittedAt: string;
}

interface AssignmentSectionProps {
  item: Lesson;
  submission?: AssignmentSubmission;
  isUploading: boolean;
  uploadErr?: string | null;
  isCompleted: boolean;
  error?: string;
  actionBusy: boolean;
  attachedTemplates: UploadedResource[];
  onUpload: (file: File) => void;
  onRemove: () => void;
  onSubmitAndNext: () => void;
}

export function AssignmentSection({
  item,
  submission,
  isUploading,
  uploadErr,
  isCompleted,
  error,
  actionBusy,
  attachedTemplates,
  onUpload,
  onRemove,
  onSubmitAndNext,
}: AssignmentSectionProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-warning/25 bg-warning-soft/30 p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-soft text-warning">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground">Assignment Brief & Instructions</h4>
          <p className="text-[11px] text-muted-foreground">
            Review assignment requirements, download template resources, and upload your completed solution.
          </p>
        </div>
      </div>

      {item.content ? (
        <div className="rounded-xl border border-border bg-card p-5 text-[15px] sm:text-base leading-relaxed text-foreground shadow-2xs">
          <RichContent html={item.content} className="text-[15px] sm:text-base leading-relaxed text-foreground" />
        </div>
      ) : null}

      {/* Attached Starter Templates */}
      {attachedTemplates.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Starter Templates & Brief Materials ({attachedTemplates.length}):
          </p>
          <div className="grid gap-2">
            {attachedTemplates.map((file, i) => (
              <AttachmentCard key={file.id || file.url || i} file={file} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Student Submission Card */}
      <div className="rounded-xl border border-border/90 bg-card p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold uppercase tracking-wider text-secondary-foreground flex items-center gap-1.5">
            <UploadCloud className="h-4 w-4 text-primary" />
            Your Solution Submission
          </h5>
          {submission ? (
            <Badge variant="green" dot>
              Uploaded
            </Badge>
          ) : (
            <span className="text-[11px] text-subtle-foreground">PDF, Word, Excel, CSV, or ZIP</span>
          )}
        </div>

        {submission ? (
          <div className="rounded-xl border border-success/30 bg-success-soft/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileCheck className="h-6 w-6 text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{submission.fileName}</p>
                <p className="text-[11px] text-success">
                  {formatFileSize(submission.sizeBytes)} · Submitted {new Date(submission.submittedAt).toLocaleDateString()} at{' '}
                  {new Date(submission.submittedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-muted transition shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                View File
              </a>
              {!isCompleted ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-danger hover:bg-danger-soft hover:text-danger/80 border-danger/30"
                  onClick={onRemove}
                  title="Remove and re-upload"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 p-5 text-center cursor-pointer hover:border-primary/30 hover:bg-primary-soft/20 transition-all">
              {isUploading ? (
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading your assignment work…
                </div>
              ) : (
                <>
                  <UploadCloud className="h-7 w-7 text-subtle-foreground mb-1" />
                  <p className="text-xs font-semibold text-secondary-foreground">Click to select your assignment file to upload</p>
                  <p className="text-[11px] text-subtle-foreground mt-0.5">Supports .pdf, .docx, .xlsx, .csv, .zip up to 50MB</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUpload(file);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
            </label>
          </div>
        )}

        {uploadErr ? (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft p-2.5 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            <span>{uploadErr}</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft p-2.5 text-xs text-warning">
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Submit & Complete Lesson Button */}
        {!isCompleted ? (
          <Button
            size="sm"
            variant="success"
            disabled={actionBusy || !submission}
            onClick={onSubmitAndNext}
            className="w-full mt-2 shadow-2xs font-semibold"
          >
            {actionBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            <span>Submit Solution & Mark Lesson Complete</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
