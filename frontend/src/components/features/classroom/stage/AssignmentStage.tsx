'use client';

import { useState } from 'react';
import { CheckCircle2, FileSpreadsheet, FileUp, Loader2, Trash2, Upload } from 'lucide-react';
import type { Lesson, UploadedResource } from '@/types';
import { RichContent } from '@/components/ui/RichContent';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getItemAttachments } from '@/components/features/courses/wizard-components';
import { uploadAttachment } from '@/lib/api/files';
import { ClassroomAttachments } from '../ClassroomAttachments';

interface AssignmentStageProps {
  courseId: string;
  lesson: Lesson;
  badgeLabel?: string;
  durationMin?: number;
  onSubmitted?: () => void;
}

interface SubmittedFile {
  fileUrl: string;
  fileName: string;
  sizeBytes: number;
  submittedAt: string;
}

export function AssignmentStage({
  courseId,
  lesson,
  badgeLabel,
  durationMin,
  onSubmitted,
}: AssignmentStageProps) {
  const [submission, setSubmission] = useState<SubmittedFile | null>(() => {
    try {
      const saved = localStorage.getItem(`lms_assignment_${courseId}_${lesson.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachments: UploadedResource[] = getItemAttachments(lesson);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadAttachment(file, {
        courseId,
        lessonId: lesson.id,
        purpose: 'assignment_submission',
      });
      const data: SubmittedFile = {
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName || file.name,
        sizeBytes: uploaded.sizeBytes || file.size,
        submittedAt: new Date().toISOString(),
      };
      setSubmission(data);
      try {
        localStorage.setItem(`lms_assignment_${courseId}_${lesson.id}`, JSON.stringify(data));
      } catch {
        // ignore
      }
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload assignment file.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSubmission(null);
    try {
      localStorage.removeItem(`lms_assignment_${courseId}_${lesson.id}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4 space-y-2">
        <div className="flex items-center gap-2">
          {badgeLabel ? (
            <Badge variant="indigo" className="text-xs">
              {badgeLabel}
            </Badge>
          ) : null}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            <FileSpreadsheet className="h-3 w-3 text-emerald-500" />
            Practical Assignment
            {durationMin ? ` · ${durationMin} min` : ''}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{lesson.title}</h2>
      </div>

      {/* Assignment Instructions */}
      <div className="rounded-2xl border border-border/90 bg-card p-6 sm:p-8 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Assignment Instructions & Requirements
        </h3>
        {lesson.content ? (
          <div className="text-[15px] sm:text-base leading-relaxed text-foreground prose prose-base max-w-none">
            <RichContent
              html={lesson.content}
              className="text-[15px] sm:text-base leading-relaxed text-foreground"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Follow the instructions provided in the attached starter workbook and upload your
            completed solution below.
          </p>
        )}
      </div>

      {/* Templates / Starter Files */}
      {attachments.length > 0 && (
        <div className="pt-2">
          <ClassroomAttachments files={attachments} label="Starter Worksheet / Data" />
        </div>
      )}

      {/* Student Submission Card */}
      <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-6 space-y-4 shadow-2xs">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Your Assignment Submission
        </h4>

        {submission ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-success/30 bg-success-soft/70 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-success truncate">{submission.fileName}</p>
                <p className="text-[11px] text-success mt-0.5">
                  Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-xs text-danger hover:text-danger/80 hover:bg-danger-soft border-danger/30 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Replace File
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-card p-8 text-center cursor-pointer hover:border-ring hover:bg-primary-soft/50 transition">
              <FileUp className="h-8 w-8 text-indigo-500" />
              <p className="text-xs font-bold text-foreground">
                Click to browse or drag and drop your completed file
              </p>
              <p className="text-[11px] text-subtle-foreground">Excel (.xlsx), PDF, or ZIP (up to 50 MB)</p>
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileUpload(f);
                }}
              />
            </label>

            {uploading && (
              <p className="flex items-center justify-center gap-2 text-xs text-primary font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading assignment submission…
              </p>
            )}

            {error && <p className="text-xs text-danger font-medium text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
