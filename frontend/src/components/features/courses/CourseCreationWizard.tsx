"use client";

import { useRef, useState, useEffect } from "react";
import {
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  FileText,
  Italic,
  List,
  MonitorPlay,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import type { Attachment, Course, Question, Quiz } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useLms } from "@/lib/lms-store";
import { fetchAssessment, fetchCourseAssessments } from "@/lib/api/quiz";
import { COURSE_CATEGORIES } from "@/constants/course-categories";

interface CourseCreationWizardProps {
  onDone: () => void;
  onCancel: () => void;
  /** When provided the wizard runs in edit mode for an existing draft/rejected course. */
  editingCourse?: Course | null;
}

/* -------------------------------------------------------------------------- */
/*  Local model                                                                 */
/* -------------------------------------------------------------------------- */

interface LessonDraft {
  id: string;
  title: string;
  content: string;
  durationMin: number;
}

interface ModuleDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

const STEPS = ["Course details", "Curriculum", "Materials", "Final assessment"];

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const blankQuestion = (): Question => ({
  id: `qn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  points: 10,
});

/* -------------------------------------------------------------------------- */
/*  Lightweight rich text editor (no external deps)                            */
/* -------------------------------------------------------------------------- */

function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const exec = (command: string) => {
    ref.current?.focus();
    document.execCommand(command);
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 rounded-t-xl border border-slate-200/90 bg-slate-50/80 px-2 py-1">
        {[
          { label: "Bold", command: "bold", icon: Bold, title: "Bold" },
          { label: "Italic", command: "italic", icon: Italic, title: "Italic" },
          { label: "List", command: "insertUnorderedList", icon: List, title: "Bullet list" },
        ].map(({ command, icon: Icon, title }) => (
          <button
            key={command}
            type="button"
            title={title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec(command)}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-800"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="min-h-[96px] w-full rounded-b-xl rounded-tr-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 empty:before:text-slate-400"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cover uploader                                                             */
/* -------------------------------------------------------------------------- */

function CoverUploader({
  file,
  preview,
  onChange,
}: {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className={labelClass}>Course cover image</label>
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Course cover preview" className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              onChange(null, null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute right-2 top-2 rounded-lg bg-slate-900/70 p-1.5 text-white transition-colors hover:bg-red-600/90"
            aria-label="Remove cover"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300/80 bg-slate-50/60 px-4 py-6 text-sm text-slate-500 transition-colors hover:border-indigo-400/70 hover:bg-indigo-50/40 hover:text-indigo-600"
        >
          <Upload className="h-5 w-5" />
          Upload a cover image (JPG / PNG / WebP)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) {
            onChange(chosen, URL.createObjectURL(chosen));
          }
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Wizard                                                                     */
/* -------------------------------------------------------------------------- */

export function CourseCreationWizard({
  onDone,
  onCancel,
  editingCourse,
}: CourseCreationWizardProps) {
  const { createCourse, updateCourseFull } = useLms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(editingCourse);

  const [title, setTitle] = useState(editingCourse?.title ?? "");
  const [code, setCode] = useState(editingCourse?.code ?? "");
  const [category, setCategory] = useState(
    editingCourse?.category ?? COURSE_CATEGORIES[0],
  );
  const [description, setDescription] = useState(editingCourse?.description ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    editingCourse?.cover ?? null,
  );

  const [modules, setModules] = useState<ModuleDraft[]>(
    () =>
      editingCourse?.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        lessons: mod.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          content: lesson.content ?? "",
          durationMin: lesson.durationMin,
        })),
      })) ?? [],
  );
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>(
    () => editingCourse?.attachments ?? [],
  );

  const [quizTitle, setQuizTitle] = useState("Final Assessment");
  const [passMark, setPassMark] = useState(60);
  const [attemptsAllowed, setAttemptsAllowed] = useState(2);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Prefill the final assessment when editing an existing course.
  useEffect(() => {
    if (!editingCourse?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCourseAssessments(editingCourse.id);
        if (cancelled || list.length === 0) return;
        const detail = await fetchAssessment(list[0].id);
        if (cancelled) return;
        setQuizTitle(detail.titleEn || "Final Assessment");
        setPassMark(detail.passingScore);
        setAttemptsAllowed(detail.maxAttempts);
        setQuestions(
          detail.questions.map((q) => ({
            id: q.id,
            text: q.question,
            options: q.options,
            correctIndex: q.correctAnswer ?? 0,
            points: q.points,
          })),
        );
      } catch {
        // assessment prefill is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingCourse?.id]);

  const detailsValid = title.trim() !== "" && code.trim() !== "" && description.trim() !== "";

  /* ── Curriculum helpers ─────────────────────────────────────────── */

  const addModule = () => {
    const id = uid("mod");
    setModules((prev) => [...prev, { id, title: "", lessons: [] }]);
    setExpandedModule(id);
  };

  const patchModule = (id: string, patch: Partial<ModuleDraft>) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const moveModule = (id: string, dir: -1 | 1) => {
    setModules((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      const target = index + dir;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
    setExpandedModule((prev) => (prev === id ? null : prev));
  };

  const addLesson = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: [...m.lessons, { id: uid("les"), title: "", content: "", durationMin: 15 }] }
          : m,
      ),
    );
  };

  const patchLesson = (moduleId: string, lessonId: string, patch: Partial<LessonDraft>) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
            }
          : m,
      ),
    );
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m,
      ),
    );
  };

  /* ── Materials helpers ─────────────────────────────────────────── */

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added: Attachment[] = Array.from(files).map((file, index) => ({
      id: `att-${Date.now()}-${index}`,
      name: file.name,
      type: file.type.startsWith("video") || /\.(mp4|mov|webm)$/i.test(file.name) ? "video" : "pdf",
      url: URL.createObjectURL(file),
      file,
    }));
    setAttachments((prev) => [...prev, ...added]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  /* ── Quiz helpers ───────────────────────────────────────────────── */

  const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()]);

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const patchQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const patchOption = (index: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const options = q.options.map((option, j) => (j === optionIndex ? value : option));
        return { ...q, options };
      }),
    );
  };

  /* ── Submit ─────────────────────────────────────────────────────── */

  const handleCreate = async () => {
    const quiz: Quiz | undefined =
      questions.length > 0
        ? {
            id: `q-${Date.now()}`,
            title: quizTitle.trim() || "Final Assessment",
            passMark,
            attemptsAllowed,
            questions,
          }
        : undefined;

    const curriculum = modules
      .filter((m) => m.title.trim() !== "" || m.lessons.some((l) => l.title.trim() !== ""))
      .map((m) => ({
        title: m.title.trim() || "Module",
        lessons: m.lessons
          .filter((l) => l.title.trim() !== "")
          .map((l) => ({
            title: l.title.trim(),
            content: l.content,
            durationMin: l.durationMin || 15,
          })),
      }));

    setSaving(true);
    try {
      const result = editingCourse
        ? await updateCourseFull(editingCourse.id, {
            title: title.trim(),
            category,
            description: description.trim(),
            cover: coverFile,
            modules: curriculum,
            attachments,
            quiz,
          })
        : await createCourse({
            title: title.trim(),
            code: code.trim().toUpperCase(),
            category,
            description: description.trim(),
            cover: coverFile,
            modules: curriculum,
            attachments,
            quiz,
          });
      if (!result.ok) {
        // keep the wizard open so the course owner can fix and retry
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const submitLabel = isEdit
    ? saving
      ? "Saving…"
      : "Save changes"
    : saving
      ? "Creating…"
      : "Create course";

  const moduleLessonCount = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                index === step
                  ? "bg-brand-gradient text-white shadow-sm shadow-indigo-500/30"
                  : index < step
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                index === step ? "text-slate-800" : "text-slate-400",
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <div className="mx-1 h-px flex-1 bg-slate-200" />
            ) : null}
          </div>
        ))}
      </div>

      {/* 1 · Course details */}
      {step === 0 ? (
        <div className="space-y-4">
          <CoverUploader
            file={coverFile}
            preview={coverPreview}
            onChange={(file, preview) => {
              setCoverFile(file);
              setCoverPreview(preview);
            }}
          />
          <div>
            <label className={labelClass}>Course title</label>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Advance Pricing Agreements"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Course code</label>
              <input
                required
                value={code}
                disabled={isEdit}
                onChange={(event) => setCode(event.target.value)}
                placeholder="e.g. APA-501"
                className={cn(inputClass, isEdit && "cursor-not-allowed bg-slate-50 text-slate-400")}
              />
              {isEdit ? (
                <p className="mt-1 text-[11px] text-slate-400">
                  The course code cannot be changed after creation.
                </p>
              ) : null}
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {COURSE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Briefly describe the course objectives…"
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {/* 2 · Curriculum */}
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Structure your course into modules and lessons. Lessons are English-first — the
            Amharic copy is auto-mirrored on the backend.
          </p>

          {modules.map((mod, moduleIndex) => {
            const open = expandedModule === mod.id;
            return (
              <div
                key={mod.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-400">M{moduleIndex + 1}</span>
                  <input
                    value={mod.title}
                    placeholder={`Module ${moduleIndex + 1} title`}
                    onChange={(event) => patchModule(mod.id, { title: event.target.value })}
                    className="w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                  />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveModule(mod.id, -1)}
                      disabled={moduleIndex === 0}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move module up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveModule(mod.id, 1)}
                      disabled={moduleIndex === modules.length - 1}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move module down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeModule(mod.id)}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove module"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedModule(open ? null : mod.id)}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                      aria-label="Toggle module"
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")}
                      />
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className="space-y-3 px-4 py-3">
                    {mod.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400">
                            L{lessonIndex + 1}
                          </span>
                          <input
                            value={lesson.title}
                            placeholder="Lesson title"
                            onChange={(event) =>
                              patchLesson(mod.id, lesson.id, { title: event.target.value })
                            }
                            className="w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                          />
                          {lessonIndex > 0 ? (
                            <button
                              type="button"
                              onClick={() => patchLesson(mod.id, lesson.id, {
                                durationMin: Math.max(1, (lesson.durationMin || 15) + 1),
                              })}
                              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                              aria-label="Increase duration"
                            >
                              <MonitorPlay className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeLesson(mod.id, lesson.id)}
                            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove lesson"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <RichTextEditor
                          value={lesson.content}
                          onChange={(html) => patchLesson(mod.id, lesson.id, { content: html })}
                          placeholder="Lesson body — supports bold, italic and bullet lists…"
                        />
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <span>Duration</span>
                          <input
                            type="number"
                            min={1}
                            value={lesson.durationMin}
                            onChange={(event) =>
                              patchLesson(mod.id, lesson.id, {
                                durationMin: Number(event.target.value),
                              })
                            }
                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
                          />
                          <span>min</span>
                        </div>
                      </div>
                    ))}

                    {mod.lessons.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-center text-xs text-slate-400">
                        No lessons yet — add the first one below.
                      </p>
                    ) : null}

                    <Button type="button" variant="outline" size="sm" onClick={() => addLesson(mod.id)}>
                      <Plus className="h-3.5 w-3.5" />
                      Add lesson
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={addModule}>
              <Plus className="h-4 w-4" />
              Add module
            </Button>
            <Badge variant="outline">
              {modules.length} modules · {moduleLessonCount} lessons
            </Badge>
          </div>
        </div>
      ) : null}

      {/* 3 · Materials */}
      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Attach course videos or PDF materials. Learners will see these alongside the course
            content.
          </p>
          <div
            className="relative rounded-2xl border-2 border-dashed border-indigo-200/60 bg-indigo-50/20 px-4 py-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
          >
            <Upload className="mx-auto h-6 w-6 text-indigo-400" />
            <p className="mt-2 text-xs font-medium text-slate-500">
              Drag & drop video or PDF files here, or
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,application/pdf"
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>

          {attachments.length > 0 ? (
            <ul className="space-y-2">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-700">
                    {attachment.type === "video" ? (
                      <Video className="h-4 w-4 text-indigo-500/70" />
                    ) : (
                      <FileText className="h-4 w-4 text-indigo-500/70" />
                    )}
                    {attachment.name}
                    <Badge variant="outline">{attachment.type}</Badge>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove attachment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* 4 · Final assessment */}
      {step === 3 ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Build the multiple-choice final assessment learners must pass to complete this course.
            This step is optional.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Assessment title</label>
              <input
                value={quizTitle}
                onChange={(event) => setQuizTitle(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Pass mark (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={passMark}
                onChange={(event) => setPassMark(Number(event.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Allowed attempts</label>
              <input
                type="number"
                min={1}
                value={attemptsAllowed}
                onChange={(event) => setAttemptsAllowed(Number(event.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-indigo-200/60 bg-indigo-50/20 px-4 py-8 text-center">
                <p className="text-xs font-medium text-slate-500">
                  No questions yet. Add questions below.
                </p>
              </div>
            ) : (
              questions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <label className="block flex-1">
                      <span className={labelClass}>Question {index + 1}</span>
                      <input
                        value={question.text}
                        onChange={(event) => patchQuestion(index, { text: event.target.value })}
                        placeholder="Enter the question…"
                        className={inputClass}
                      />
                    </label>
                    <label className="w-28">
                      <span className={labelClass}>Points</span>
                      <input
                        type="number"
                        min={1}
                        value={question.points}
                        onChange={(event) =>
                          patchQuestion(index, { points: Number(event.target.value) })
                        }
                        className={inputClass}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="mt-5 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors",
                          question.correctIndex === optionIndex
                            ? "border-indigo-300 bg-indigo-50/50"
                            : "border-slate-200/80 bg-white",
                        )}
                      >
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correctIndex === optionIndex}
                          onChange={() => patchQuestion(index, { correctIndex: optionIndex })}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <input
                          value={option}
                          onChange={(event) => patchOption(index, optionIndex, event.target.value)}
                          placeholder={`Option ${optionIndex + 1}${question.correctIndex === optionIndex ? " (correct)" : ""}`}
                          className="w-full border-transparent bg-transparent px-0.5 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <Button type="button" variant="outline" onClick={addQuestion}>
            <Plus className="h-4 w-4" />
            Add question
          </Button>
        </div>
      ) : null}

      <div className="flex justify-between gap-2 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            disabled={step === 0 && !detailsValid}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button type="button" onClick={handleCreate} disabled={saving}>
            <FileQuestion className="h-4 w-4" />
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}