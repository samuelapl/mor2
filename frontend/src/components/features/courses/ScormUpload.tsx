'use client';

import { useCallback, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileArchive,
  FolderTree,
  Loader2,
  Upload,
} from 'lucide-react';
import { useCourseStore } from '@/lib/stores/course-store';
import { uploadScormPreview } from '@/lib/api/files';
import { toast } from '@/lib/toast';
import { COURSE_CATEGORIES, deriveCategory } from '@/constants/course-categories';
import { cn } from '@/lib/utils';
import type { ScormPreview, ScormPreviewLesson } from '@/lib/api/types';

const MAX_SIZE_MB = 200;

/** Maps a parsed SCORM lesson to the WizardLessonInput shape the store's createCourse expects. */
function toWizardLesson(
  lesson: ScormPreviewLesson,
  scormUrl: string,
): {
  title: string;
  content: string;
  contentType: string;
  resourceUrl: string;
  durationMin?: number;
  subLessons: ReturnType<typeof toWizardLesson>[];
} {
  return {
    title: lesson.title,
    content: lesson.content || '',
    contentType: 'SCORM',
    resourceUrl: scormUrl,
    durationMin: lesson.durationMinutes,
    subLessons: lesson.subLessons.map((sub) => toWizardLesson(sub, scormUrl)),
  };
}

interface ScormUploadProps {
  /** Called after the course is created; receives the new course id. */
  onDone: (courseId: string) => void;
  onCancel: () => void;
}

export function ScormUpload({ onDone, onCancel }: ScormUploadProps) {
  const createCourse = useCourseStore((s) => s.createCourse);
  const courses = useCourseStore((s) => s.courses);

  /** Appends -2, -3… when the generated code is already taken by an existing course. */
  const uniqueCode = useCallback(
    (base: string) => {
      const code = base.toUpperCase();
      if (!courses.some((c) => c.code.toUpperCase() === code)) return code;
      for (let i = 2; i < 100; i++) {
        const candidate = `${code.slice(0, 30)}-${i}`;
        if (!courses.some((c) => c.code.toUpperCase() === candidate)) return candidate;
      }
      return `${code.slice(0, 24)}-${Date.now().toString(36).toUpperCase()}`;
    },
    [courses],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ScormPreview | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Editable course fields — pre-filled from the parsed SCORM manifest.
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(COURSE_CATEGORIES[0]!);
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');

  /* ---------------------------------------------------------------- */
  /*  Upload                                                           */
  /* ---------------------------------------------------------------- */

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a .zip SCORM package.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds the ${MAX_SIZE_MB} MB limit.`);
      return;
    }

    setError(null);
    setUploading(true);
    setPreview(null);
    try {
      const result = await uploadScormPreview(file);
      setPreview(result);
      setTitle(result.course.title);
      setCode(uniqueCode(result.course.code));
      setDescription(result.course.description);
      setObjectives(result.course.objectives);
      const derived = deriveCategory(result.course.title, result.course.description);
      if (derived) setCategory(derived);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse SCORM package.');
    } finally {
      setUploading(false);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Create                                                           */
  /* ---------------------------------------------------------------- */

  const handleCreate = async () => {
    if (!preview) return;
    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError('Course code is required.');
      return;
    }
    if (courses.some((c) => c.code.toUpperCase() === normalizedCode)) {
      setError('This course code is already used by another course.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const scormUrl = preview.scormFile.url;

      const modules = preview.curriculum.modules.map((mod) => ({
        title: mod.title,
        description: mod.description || '',
        lessons: mod.lessons.map((lesson) => toWizardLesson(lesson, scormUrl)),
      }));

      const result = await createCourse({
        code: normalizedCode,
        title: title.trim(),
        category,
        description: description.trim(),
        objectives: objectives.trim(),
        modules,
      });

      if (result.ok && result.courseId) {
        toast.success('Course created from SCORM package!');
        onDone(result.courseId);
      } else if (result.ok) {
        toast.success('Course created from SCORM package!');
        onDone('');
      } else {
        setError(result.message || 'Failed to create course.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course.');
    } finally {
      setCreating(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const handleReset = () => {
    setPreview(null);
    setError(null);
    setTitle('');
    setCode('');
    setDescription('');
    setObjectives('');
    setCategory(COURSE_CATEGORIES[0]!);
  };

  /* ---------------------------------------------------------------- */
  /*  Render — Step 1: Upload zone                                     */
  /* ---------------------------------------------------------------- */

  if (!preview) {
    return (
      <div className="w-full">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200',
            dragOver
              ? 'border-ring bg-primary-soft/60'
              : 'border-input bg-card hover:border-primary/30 hover:bg-primary-soft/30',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />

          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="mt-4 text-sm font-semibold text-secondary-foreground">
                Uploading &amp; parsing SCORM package…
              </p>
              <p className="mt-1 text-xs text-subtle-foreground">
                Extracting imsmanifest.xml and building course structure
              </p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                Click to browse or drag &amp; drop
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                SCORM package (.zip, up to {MAX_SIZE_MB}&nbsp;MB)
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft/80 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to options
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render — Step 2: Preview + create                                */
  /* ---------------------------------------------------------------- */

  const pkg = preview.package;
  const stats = preview.stats;

  return (
    <div className="w-full space-y-5">
      {/* ── Package summary ── */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-soft/80 to-accent-soft/60 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25">
            <FileArchive className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-sm font-bold text-foreground">
              {pkg.title || 'Untitled Package'}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pkg.schema || 'SCORM'} {pkg.schemaVersion && ` ${pkg.schemaVersion}`}
              {pkg.resourceCount > 0 && ` · ${pkg.resourceCount} resources`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-card px-2 py-0.5 text-primary shadow-sm ring-1 ring-ring/20">
                {stats.moduleCount} {stats.moduleCount === 1 ? 'module' : 'modules'}
              </span>
              <span className="rounded-full bg-card px-2 py-0.5 text-accent shadow-sm ring-1 ring-accent/20">
                {stats.lessonCount} {stats.lessonCount === 1 ? 'lesson' : 'lessons'}
              </span>
              {stats.subLessonCount > 0 && (
                <span className="rounded-full bg-card px-2 py-0.5 text-secondary-foreground shadow-sm ring-1 ring-border">
                  {stats.subLessonCount} sub-lessons
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Change file
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger-soft/80 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* ── Editable course details ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
        <h4 className="font-display text-xs font-bold uppercase tracking-wider text-subtle-foreground">
          Course Details
        </h4>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-secondary-foreground">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-secondary-foreground">Code *</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-secondary-foreground">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {COURSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-secondary-foreground">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-secondary-foreground">Objectives</span>
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </label>
      </div>

      {/* ── Curriculum tree ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-subtle-foreground" />
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-subtle-foreground">
            Curriculum from SCORM
          </h4>
        </div>

        <div className="mt-3 space-y-3">
          {preview.curriculum.modules.map((mod, modIdx) => (
            <div
              key={modIdx}
              className="rounded-xl border border-border/60 bg-muted/60 p-3"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <span className="text-sm font-semibold text-foreground">
                  {mod.title}
                </span>
                <span className="ml-auto rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary ring-1 ring-ring/20">
                  {mod.lessons.length} {mod.lessons.length === 1 ? 'lesson' : 'lessons'}
                </span>
              </div>

              <ul className="mt-2 space-y-1 pl-5">
                {mod.lessons.map((lesson, lIdx) => (
                  <ScormLessonRow key={lIdx} lesson={lesson} depth={0} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || uploading}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200',
            creating || uploading
              ? 'cursor-not-allowed bg-subtle-foreground'
              : 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-indigo-500/25 hover:shadow-indigo-500/40',
          )}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating course…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Create Course
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recursive lesson row                                               */
/* ------------------------------------------------------------------ */

function ScormLessonRow({
  lesson,
  depth,
}: {
  lesson: ScormPreviewLesson;
  depth: number;
}) {
  const hasChildren = lesson.subLessons.length > 0;
  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-card"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-input" />
        <span className="truncate text-xs text-secondary-foreground">{lesson.title}</span>
        <span className="ml-auto shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent ring-1 ring-accent/20">
          SCORM
        </span>
      </div>
      {hasChildren && (
        <ul className="space-y-0.5">
          {lesson.subLessons.map((sub, idx) => (
            <ScormLessonRow key={idx} lesson={sub} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
