"use client";

import { useRef, useState, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileQuestion,
  FileText,
  Headphones,
  Heading2,
  Heading3,
  HelpCircle,
  Italic,
  Layers,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Presentation,
  Quote,
  Send,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Timer,
  Trash2,
  Underline as UnderlineIcon,
  Upload,
  Video,
} from "lucide-react";
import type { Attachment, Course, CourseLevel, Question, QuestionType, Quiz } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useLms } from "@/lib/lms-store";
import { fetchAssessmentWithAnswers, fetchCourseAssessments } from "@/lib/api/quiz";
import { uploadAttachment, uploadCover } from "@/lib/api/files";
import { COURSE_CATEGORIES } from "@/constants/course-categories";

interface CourseCreationWizardProps {
  onDone: () => void;
  onCancel: () => void;
  /** When provided the wizard runs in edit mode for an existing draft/rejected course. */
  editingCourse?: Course | null;
}

/* -------------------------------------------------------------------------- */
/*  Local model                                                               */
/* -------------------------------------------------------------------------- */

export type WizardContentType =
  | "DOCUMENT"
  | "VIDEO"
  | "AUDIO"
  | "PRESENTATION"
  | "INTERACTIVE"
  | "EXTERNAL_LINK";

export interface LessonDraft {
  id: string;
  title: string;
  content: string;
  durationMin: number;
  contentType: WizardContentType;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploading?: boolean;
  uploadError?: string | null;
  subLessons?: LessonDraft[];
}

export interface ModuleDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
}

const STEPS = [
  "Course Details",
  "Curriculum & Content",
  "Final Assessment & Rules",
  "Review & Submit",
];

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const blankQuestion = (): Question => ({
  id: `qn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: "multiple_choice",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  answerText: "",
  points: 10,
});

const optionsForType = (type: QuestionType): string[] =>
  type === "true_false" ? ["True", "False"] : ["", "", "", ""];

/* -------------------------------------------------------------------------- */
/*  Interactive rich text editor (TipTap)                                     */
/* -------------------------------------------------------------------------- */

const TOOLBAR_BUTTONS: Array<{
  title: string;
  icon: typeof Bold;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}> = [
  {
    title: "Bold",
    icon: Bold,
    isActive: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    title: "Italic",
    icon: Italic,
    isActive: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    title: "Underline",
    icon: UnderlineIcon,
    isActive: (editor) => editor.isActive("underline"),
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    title: "Strikethrough",
    icon: Strikethrough,
    isActive: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    title: "Heading 2",
    icon: Heading2,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: Heading3,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    icon: List,
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    icon: ListOrdered,
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Blockquote",
    icon: Quote,
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
];

function RichEditor({
  value,
  onChange,
  placeholder = "Write lesson content, notes, and guidelines here…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none px-4 py-3 min-h-[140px] text-slate-800 focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/70 p-1.5">
        {TOOLBAR_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const active = btn.isActive(editor);
          return (
            <button
              key={btn.title}
              type="button"
              onClick={() => btn.run(editor)}
              title={btn.title}
              className={cn(
                "rounded-md p-1.5 text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900",
                active && "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Wizard Component                                                          */
/* -------------------------------------------------------------------------- */

export function CourseCreationWizard({
  onDone,
  onCancel,
  editingCourse,
}: CourseCreationWizardProps) {
  const { createCourse, updateCourseFull, submitForApproval } = useLms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const isEdit = Boolean(editingCourse);

  // Step 1: Course Details
  const [title, setTitle] = useState(editingCourse?.title ?? "");
  const [code, setCode] = useState(editingCourse?.code ?? "");
  const [category, setCategory] = useState(
    editingCourse?.category ?? COURSE_CATEGORIES[0],
  );
  const [level, setLevel] = useState<CourseLevel>(editingCourse?.level ?? "basic");
  const [description, setDescription] = useState(editingCourse?.description ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    editingCourse?.cover ?? null,
  );

  // Step 2: Curriculum
  const [modules, setModules] = useState<ModuleDraft[]>(() =>
    editingCourse?.modules && editingCourse.modules.length > 0
      ? editingCourse.modules.map((mod) => ({
          id: mod.id,
          title: mod.title,
          lessons: mod.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            content: lesson.content ?? "",
            durationMin: lesson.durationMin || 15,
            contentType: (lesson.contentType as WizardContentType) || "DOCUMENT",
            resourceUrl: lesson.resourceUrl || "",
            subLessons: (lesson.subLessons ?? []).map((sub) => ({
              id: sub.id,
              title: sub.title,
              content: sub.content ?? "",
              durationMin: sub.durationMin || 15,
              contentType: (sub.contentType as WizardContentType) || "DOCUMENT",
              resourceUrl: sub.resourceUrl || "",
            })),
          })),
        }))
      : [
          {
            id: uid("mod"),
            title: "Module 1: Introduction",
            lessons: [
              {
                id: uid("les"),
                title: "Lesson 1: Overview and Objectives",
                content: "",
                durationMin: 15,
                contentType: "DOCUMENT",
                resourceUrl: "",
                subLessons: [],
              },
            ],
          },
        ],
  );
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  // Step 3: Final Assessment & Completion Rules
  const [quizTitle, setQuizTitle] = useState("Final Assessment");
  const [passMark, setPassMark] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(60);
  const [attemptsAllowed, setAttemptsAllowed] = useState(2);
  const [allowEarlySubmission, setAllowEarlySubmission] = useState(true);
  const [autoSubmitOnExpire, setAutoSubmitOnExpire] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Prefill assessment if editing
  useEffect(() => {
    if (!editingCourse?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCourseAssessments(editingCourse.id);
        if (cancelled || list.length === 0) return;
        const detail = await fetchAssessmentWithAnswers(list[0].id);
        if (cancelled || !detail) return;
        setQuizTitle(detail.titleEn || "Final Assessment");
        setPassMark(detail.passingScore);
        setAttemptsAllowed(detail.maxAttempts);
        setTimeLimitMinutes(detail.timeLimitMinutes ?? 60);
        setQuestions(
          (detail.questions as any[]).map((q) => {
            const type: QuestionType =
              q.type === "TRUE_FALSE"
                ? "true_false"
                : q.type === "SHORT_ANSWER"
                  ? "short_answer"
                  : "multiple_choice";
            return {
              id: q.id,
              type,
              text: q.question,
              options: q.options,
              correctIndex: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
              answerText: typeof q.correctAnswer === "string" ? q.correctAnswer : "",
              points: 10,
            };
          }),
        );
      } catch {
        // prefill best effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingCourse?.id]);

  const detailsValid = title.trim() !== "" && code.trim() !== "" && description.trim() !== "";

  /* ── Curriculum Helpers ─────────────────────────────────────────── */

  const addModule = () => {
    const id = uid("mod");
    setModules((prev) => [
      ...prev,
      {
        id,
        title: `Module ${prev.length + 1}`,
        lessons: [
          {
            id: uid("les"),
            title: "Lesson 1",
            content: "",
            durationMin: 15,
            contentType: "DOCUMENT",
            resourceUrl: "",
            subLessons: [],
          },
        ],
      },
    ]);
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
    const lessonId = uid("les");
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: [
                ...m.lessons,
                {
                  id: lessonId,
                  title: `Lesson ${m.lessons.length + 1}`,
                  content: "",
                  durationMin: 15,
                  contentType: "DOCUMENT",
                  resourceUrl: "",
                  subLessons: [],
                },
              ],
            }
          : m,
      ),
    );
    setExpandedLesson(lessonId);
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

  const moveLesson = (moduleId: string, lessonId: string, dir: -1 | 1) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        const index = m.lessons.findIndex((l) => l.id === lessonId);
        const target = index + dir;
        if (index === -1 || target < 0 || target >= m.lessons.length) return m;
        const nextLessons = [...m.lessons];
        [nextLessons[index], nextLessons[target]] = [nextLessons[target], nextLessons[index]];
        return { ...m, lessons: nextLessons };
      }),
    );
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m,
      ),
    );
  };

  // Sub-lesson helpers
  const addSubLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const subs = l.subLessons ?? [];
            return {
              ...l,
              subLessons: [
                ...subs,
                {
                  id: uid("sub"),
                  title: `Sub-lesson ${subs.length + 1}`,
                  content: "",
                  durationMin: 10,
                  contentType: "DOCUMENT",
                  resourceUrl: "",
                },
              ],
            };
          }),
        };
      }),
    );
  };

  const patchSubLesson = (
    moduleId: string,
    lessonId: string,
    subLessonId: string,
    patch: Partial<LessonDraft>,
  ) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            return {
              ...l,
              subLessons: (l.subLessons ?? []).map((s) =>
                s.id === subLessonId ? { ...s, ...patch } : s,
              ),
            };
          }),
        };
      }),
    );
  };

  const moveSubLesson = (
    moduleId: string,
    lessonId: string,
    subLessonId: string,
    dir: -1 | 1,
  ) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const subs = [...(l.subLessons ?? [])];
            const index = subs.findIndex((s) => s.id === subLessonId);
            const target = index + dir;
            if (index === -1 || target < 0 || target >= subs.length) return l;
            [subs[index], subs[target]] = [subs[target], subs[index]];
            return { ...l, subLessons: subs };
          }),
        };
      }),
    );
  };

  const removeSubLesson = (moduleId: string, lessonId: string, subLessonId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            return {
              ...l,
              subLessons: (l.subLessons ?? []).filter((s) => s.id !== subLessonId),
            };
          }),
        };
      }),
    );
  };

  // Real backend file upload for lesson content
  const handleLessonFileUpload = async (
    file: File,
    moduleId: string,
    lessonId: string,
    subLessonId?: string,
  ) => {
    const updateTarget = (patch: Partial<LessonDraft>) => {
      if (subLessonId) {
        patchSubLesson(moduleId, lessonId, subLessonId, patch);
      } else {
        patchLesson(moduleId, lessonId, patch);
      }
    };

    updateTarget({ uploading: true, uploadError: null });

    try {
      const res = await uploadAttachment(file, {
        moduleId,
        lessonId: subLessonId || lessonId,
        courseId: editingCourse?.id,
      });

      updateTarget({
        uploading: false,
        resourceUrl: res.fileUrl,
        fileName: res.fileName,
        fileSize: res.sizeBytes,
        uploadError: null,
      });
    } catch (err) {
      updateTarget({
        uploading: false,
        uploadError: err instanceof Error ? err.message : "Failed to upload file",
      });
    }
  };

  /* ── Question Helpers ───────────────────────────────────────────── */

  const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()]);

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const patchQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const setQuestionType = (index: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, type, options: optionsForType(type), correctIndex: 0, answerText: "" }
          : q,
      ),
    );
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

  /* ── Save & Submit Handlers ─────────────────────────────────────── */

  const buildCurriculumPayload = () =>
    modules
      .filter((m) => m.title.trim() !== "" || m.lessons.some((l) => l.title.trim() !== ""))
      .map((m) => ({
        title: m.title.trim() || "Module",
        lessons: m.lessons
          .filter((l) => l.title.trim() !== "")
          .map((l) => ({
            title: l.title.trim(),
            content: l.content,
            durationMin: l.durationMin || 15,
            contentType: l.contentType,
            resourceUrl: l.resourceUrl?.trim() || undefined,
            subLessons: (l.subLessons ?? [])
              .filter((sub) => sub.title.trim() !== "")
              .map((sub) => ({
                title: sub.title.trim(),
                content: sub.content,
                durationMin: sub.durationMin || 15,
                contentType: sub.contentType,
                resourceUrl: sub.resourceUrl?.trim() || undefined,
              })),
          })),
      }));

  const buildQuizPayload = (): Quiz | undefined =>
    questions.length > 0
      ? {
          id: `q-${Date.now()}`,
          title: quizTitle.trim() || "Final Assessment",
          passMark,
          attemptsAllowed,
          timeLimitMinutes: timeLimitMinutes || null,
          questions,
        }
      : undefined;

  const handleSave = async (andSubmit = false) => {
    setSaving(true);
    setFlash(null);

    const quiz = buildQuizPayload();
    const curriculum = buildCurriculumPayload();

    try {
      let savedCourseId = editingCourse?.id;

      if (editingCourse) {
        const result = await updateCourseFull(editingCourse.id, {
          title: title.trim(),
          category,
          level,
          description: description.trim(),
          cover: coverFile,
          modules: curriculum,
          quiz,
        });
        if (!result.ok) throw new Error(result.message);
      } else {
        const result = await createCourse({
          title: title.trim(),
          code: code.trim().toUpperCase(),
          category,
          level,
          description: description.trim(),
          cover: coverFile,
          modules: curriculum,
          quiz,
        });
        if (!result.ok) throw new Error(result.message);
        savedCourseId = result.courseId;
      }

      if (andSubmit && savedCourseId) {
        const submitRes = await submitForApproval(savedCourseId);
        if (!submitRes.ok) {
          throw new Error(submitRes.message || "Failed to submit course for approval.");
        }
      }

      onDone();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to save course.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Content Type Icon Helper ──────────────────────────────────── */

  const renderTypeIcon = (type: WizardContentType) => {
    switch (type) {
      case "VIDEO":
        return <Video className="h-4 w-4 text-rose-600" />;
      case "AUDIO":
        return <Headphones className="h-4 w-4 text-emerald-600" />;
      case "PRESENTATION":
        return <Presentation className="h-4 w-4 text-amber-600" />;
      case "INTERACTIVE":
        return <Sparkles className="h-4 w-4 text-violet-600" />;
      case "EXTERNAL_LINK":
        return <ExternalLink className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-indigo-600" />;
    }
  };

  /* ── Content Upload / Input Form Helper ────────────────────────── */

  const renderContentInput = (
    lesson: LessonDraft,
    moduleId: string,
    subLessonId?: string,
  ) => {
    const isSub = Boolean(subLessonId);

    return (
      <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {lesson.contentType} Content & Materials
          </span>
          {lesson.uploading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading to storage…
            </span>
          )}
        </div>

        {/* Dynamic upload interface based on real content type */}
        {lesson.contentType === "EXTERNAL_LINK" ? (
          <div>
            <label className={labelClass}>External Resource URL</label>
            <div className="relative">
              <input
                type="url"
                value={lesson.resourceUrl ?? ""}
                placeholder="https://example.com/training-content"
                onChange={(e) => {
                  if (isSub) {
                    patchSubLesson(moduleId, lesson.id, subLessonId!, {
                      resourceUrl: e.target.value,
                    });
                  } else {
                    patchLesson(moduleId, lesson.id, { resourceUrl: e.target.value });
                  }
                }}
                className={cn(inputClass, "pl-9")}
              />
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
        ) : lesson.contentType === "INTERACTIVE" ? (
          <div>
            <label className={labelClass}>Interactive Activity Instructions & Guide</label>
            <textarea
              rows={3}
              value={lesson.content}
              placeholder="Describe instructions, quiz references, or interactive prompts for learners…"
              onChange={(e) => {
                if (isSub) {
                  patchSubLesson(moduleId, lesson.id, subLessonId!, { content: e.target.value });
                } else {
                  patchLesson(moduleId, lesson.id, { content: e.target.value });
                }
              }}
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass}>
              {lesson.contentType === "VIDEO"
                ? "Video Media File (MP4, WebM, OGG)"
                : lesson.contentType === "AUDIO"
                  ? "Audio Recording File (MP3, WAV, AAC, M4A)"
                  : lesson.contentType === "PRESENTATION"
                    ? "Presentation Slides (PPT, PPTX, PDF)"
                    : "Course Document (PDF, Word DOC/DOCX)"}
            </label>

            {lesson.resourceUrl ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="font-semibold">{lesson.fileName || "File uploaded successfully"}</p>
                    {lesson.fileSize ? (
                      <p className="text-xs text-emerald-600">
                        Size: {(lesson.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={lesson.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSub) {
                        patchSubLesson(moduleId, lesson.id, subLessonId!, {
                          resourceUrl: "",
                          fileName: "",
                          fileSize: 0,
                        });
                      } else {
                        patchLesson(moduleId, lesson.id, {
                          resourceUrl: "",
                          fileName: "",
                          fileSize: 0,
                        });
                      }
                    }}
                    className="rounded-lg p-1 text-slate-400 hover:text-red-600 transition"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  id={`file-${lesson.id}-${subLessonId || "parent"}`}
                  className="sr-only"
                  accept={
                    lesson.contentType === "VIDEO"
                      ? "video/mp4,video/webm,video/ogg"
                      : lesson.contentType === "AUDIO"
                        ? "audio/*"
                        : lesson.contentType === "PRESENTATION"
                          ? ".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
                          : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  }
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLessonFileUpload(f, moduleId, lesson.id, subLessonId);
                  }}
                />
                <label
                  htmlFor={`file-${lesson.id}-${subLessonId || "parent"}`}
                  className="flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:bg-slate-50/80"
                >
                  <Upload className="h-4 w-4 text-indigo-500" />
                  <span>Choose file to upload to MinIO storage</span>
                </label>
              </div>
            )}

            {lesson.uploadError ? (
              <p className="mt-1 text-xs text-red-600">{lesson.uploadError}</p>
            ) : null}
          </div>
        )}

        {/* Lesson Notes / Content */}
        <div>
          <label className={labelClass}>Lesson Notes / Detailed Reading Content</label>
          <RichEditor
            value={lesson.content}
            placeholder="Detailed instruction text, reading guide, or reference materials…"
            onChange={(html) => {
              if (isSub) {
                patchSubLesson(moduleId, lesson.id, subLessonId!, { content: html });
              } else {
                patchLesson(moduleId, lesson.id, { content: html });
              }
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
            {isEdit ? "Edit Course" : "Create New Course"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        {/* Step Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((sName, idx) => (
            <button
              key={sName}
              type="button"
              onClick={() => idx <= step && setStep(idx)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition shadow-xs",
                step === idx
                  ? "bg-indigo-600 text-white shadow-indigo-500/20"
                  : idx < step
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
                    : "cursor-not-allowed bg-slate-50 text-slate-400",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  step === idx
                    ? "bg-white/20 text-white"
                    : idx < step
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-500",
                )}
              >
                {idx < step ? <Check className="h-2.5 w-2.5" /> : idx + 1}
              </span>
              {sName}
            </button>
          ))}
        </div>
      </div>

      {flash ? (
        <div className="rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {flash}
        </div>
      ) : null}

      {/* ── STEP 1: Course Details ─────────────────────────────────── */}
      {step === 0 ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Course Title (English) *</label>
              <input
                type="text"
                value={title}
                placeholder="e.g. Tax Compliance & Auditing Fundamentals"
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Course Code *</label>
              <input
                type="text"
                value={code}
                placeholder="e.g. TAX-201"
                disabled={isEdit}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={cn(inputClass, isEdit && "cursor-not-allowed bg-slate-100/80")}
              />
              {isEdit ? (
                <p className="mt-1 text-[11px] text-slate-400">Course code cannot be changed once created.</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {COURSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Difficulty Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CourseLevel)}
                className={inputClass}
              >
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Course Cover Image</label>
            <div className="flex flex-wrap items-center gap-4">
              {coverPreview ? (
                <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                    }}
                    className="absolute right-1 top-1 rounded-md bg-slate-950/70 p-1 text-white hover:bg-red-600 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setCoverFile(f);
                    setCoverPreview(URL.createObjectURL(f));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                <Upload className="h-4 w-4 text-indigo-500" />
                {coverPreview ? "Change Cover Image" : "Upload Cover Image"}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Course Description *</label>
            <textarea
              rows={4}
              value={description}
              placeholder="Provide a comprehensive summary of this course, target competencies, and expectations…"
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {/* ── STEP 2: Curriculum (Modules, Lessons, Sub-lessons & Media) ─ */}
      {step === 1 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Curriculum Structure
              </h3>
              <p className="text-xs text-slate-500">
                Structure modules, lessons, and nested sub-lessons. Attach media directly to each lesson.
              </p>
            </div>
            <Button size="sm" onClick={addModule} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          </div>

          <div className="space-y-4">
            {modules.map((mod, modIdx) => {
              const isModExpanded = expandedModule === mod.id || expandedModule === null;

              return (
                <div
                  key={mod.id}
                  className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedModule(expandedModule === mod.id ? "" : mod.id)
                        }
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isModExpanded ? "rotate-180" : "",
                          )}
                        />
                      </button>

                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                          {modIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={mod.title}
                          placeholder="Module Title"
                          onChange={(e) => patchModule(mod.id, { title: e.target.value })}
                          className="w-full max-w-md rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveModule(mod.id, -1)}
                        disabled={modIdx === 0}
                        className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move module up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModule(mod.id, 1)}
                        disabled={modIdx === modules.length - 1}
                        className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move module down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeModule(mod.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:text-red-600 transition"
                        title="Delete module"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Module Lessons Body */}
                  {isModExpanded ? (
                    <div className="p-5 space-y-4">
                      {mod.lessons.map((lesson, lesIdx) => {
                        const isLesExpanded = expandedLesson === lesson.id;

                        return (
                          <div
                            key={lesson.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
                          >
                            {/* Lesson Header Row */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedLesson(isLesExpanded ? null : lesson.id)
                                  }
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition"
                                >
                                  {renderTypeIcon(lesson.contentType)}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <input
                                    type="text"
                                    value={lesson.title}
                                    placeholder="Lesson Title"
                                    onChange={(e) =>
                                      patchLesson(mod.id, lesson.id, { title: e.target.value })
                                    }
                                    className="w-full font-semibold text-slate-800 text-sm border-b border-transparent focus:border-indigo-400 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Content Type Selector */}
                                <select
                                  value={lesson.contentType}
                                  onChange={(e) =>
                                    patchLesson(mod.id, lesson.id, {
                                      contentType: e.target.value as WizardContentType,
                                    })
                                  }
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none"
                                >
                                  <option value="DOCUMENT">PDF / Document</option>
                                  <option value="VIDEO">Video</option>
                                  <option value="AUDIO">Audio</option>
                                  <option value="PRESENTATION">Presentation</option>
                                  <option value="INTERACTIVE">Interactive Activity</option>
                                  <option value="EXTERNAL_LINK">External Link</option>
                                </select>

                                {/* Duration Input */}
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="h-3.5 w-3.5" />
                                  <input
                                    type="number"
                                    min={1}
                                    value={lesson.durationMin}
                                    onChange={(e) =>
                                      patchLesson(mod.id, lesson.id, {
                                        durationMin: parseInt(e.target.value) || 15,
                                      })
                                    }
                                    className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center text-xs"
                                  />
                                  <span>min</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => moveLesson(mod.id, lesson.id, -1)}
                                  disabled={lesIdx === 0}
                                  className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveLesson(mod.id, lesson.id, 1)}
                                  disabled={lesIdx === mod.lessons.length - 1}
                                  className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLesson(mod.id, lesson.id)}
                                  className="rounded p-1 text-slate-400 hover:text-red-600 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Direct Lesson Content Upload / Input Form */}
                            {renderContentInput(lesson, mod.id)}

                            {/* ── Sub-lessons Section ── */}
                            <div className="mt-4 border-t border-slate-100 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-600">
                                  Sub-lessons ({lesson.subLessons?.length ?? 0})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addSubLesson(mod.id, lesson.id)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add Sub-lesson
                                </button>
                              </div>

                              {lesson.subLessons && lesson.subLessons.length > 0 ? (
                                <div className="space-y-3 pl-4 border-l-2 border-indigo-200">
                                  {lesson.subLessons.map((sub, subIdx) => (
                                    <div
                                      key={sub.id}
                                      className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5 shadow-2xs"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                                            {lesIdx + 1}.{subIdx + 1}
                                          </span>
                                          <input
                                            type="text"
                                            value={sub.title}
                                            placeholder="Sub-lesson Title"
                                            onChange={(e) =>
                                              patchSubLesson(mod.id, lesson.id, sub.id, {
                                                title: e.target.value,
                                              })
                                            }
                                            className="w-full text-xs font-semibold text-slate-800 border-b border-transparent focus:border-indigo-400 focus:outline-none"
                                          />
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <select
                                            value={sub.contentType}
                                            onChange={(e) =>
                                              patchSubLesson(mod.id, lesson.id, sub.id, {
                                                contentType: e.target.value as WizardContentType,
                                              })
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                                          >
                                            <option value="DOCUMENT">PDF / Document</option>
                                            <option value="VIDEO">Video</option>
                                            <option value="AUDIO">Audio</option>
                                            <option value="PRESENTATION">Presentation</option>
                                            <option value="INTERACTIVE">Interactive Activity</option>
                                            <option value="EXTERNAL_LINK">External Link</option>
                                          </select>

                                          <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <Clock className="h-3 w-3" />
                                            <input
                                              type="number"
                                              min={1}
                                              value={sub.durationMin}
                                              onChange={(e) =>
                                                patchSubLesson(mod.id, lesson.id, sub.id, {
                                                  durationMin: parseInt(e.target.value) || 10,
                                                })
                                              }
                                              className="w-10 rounded border border-slate-200 px-1 py-0.5 text-center text-xs"
                                            />
                                            <span>m</span>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              moveSubLesson(mod.id, lesson.id, sub.id, -1)
                                            }
                                            disabled={subIdx === 0}
                                            className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                          >
                                            <ChevronUp className="h-3 w-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              moveSubLesson(mod.id, lesson.id, sub.id, 1)
                                            }
                                            disabled={subIdx === lesson.subLessons!.length - 1}
                                            className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                          >
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeSubLesson(mod.id, lesson.id, sub.id)
                                            }
                                            className="rounded p-1 text-slate-400 hover:text-red-600 transition"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Sub-lesson Upload & Content */}
                                      {renderContentInput(sub, mod.id, sub.id)}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => addLesson(mod.id)}
                        className="w-full gap-1.5 border-dashed"
                      >
                        <Plus className="h-4 w-4" /> Add Lesson to {mod.title}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── STEP 3: Final Assessment & Completion Rules ───────────── */}
      {step === 2 ? (
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Final Assessment & Completion Rules
            </h3>
            <p className="text-xs text-slate-500">
              Configure completion prerequisites, server-enforced timer limits, pass marks, and questions.
            </p>
          </div>

          {/* Rules Configuration Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completion & Access Rules
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Assessment Eligibility</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Enrolled learners only</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Prerequisite Requirements</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Complete all required course modules and lessons</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Passing Score (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passMark}
                  onChange={(e) => setPassMark(Math.max(1, Math.min(100, parseInt(e.target.value) || 70)))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Time Limit (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={timeLimitMinutes ?? 60}
                  onChange={(e) => setTimeLimitMinutes(Math.max(5, parseInt(e.target.value) || 60))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Maximum Attempts Allowed</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={attemptsAllowed}
                  onChange={(e) => setAttemptsAllowed(Math.max(1, parseInt(e.target.value) || 2))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowEarlySubmission}
                  onChange={(e) => setAllowEarlySubmission(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Allow Early Submission</p>
                  <p className="text-[11px] text-slate-500">
                    Learner can manually submit their attempt anytime before timer expiry.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSubmitOnExpire}
                  onChange={(e) => setAutoSubmitOnExpire(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Auto-submit When Time Expires</p>
                  <p className="text-[11px] text-slate-500">
                    Server automatically grades and records answers when the deadline passes.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Assessment Title */}
          <div>
            <label className={labelClass}>Assessment Title</label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="e.g. Final Certification Exam"
              className={inputClass}
            />
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Question Bank ({questions.length} questions)
              </h4>
              <Button size="sm" onClick={addQuestion} className="gap-1.5 shadow-xs">
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <FileQuestion className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No questions added yet</p>
                <p className="text-xs text-slate-500">Add multiple choice, true/false, or short answer questions.</p>
                <Button size="sm" onClick={addQuestion} className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" /> Add Question
                </Button>
              </div>
            ) : (
              questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-indigo-700">Question {qIdx + 1}</span>

                    <div className="flex items-center gap-2">
                      <select
                        value={q.type}
                        onChange={(e) => setQuestionType(qIdx, e.target.value as QuestionType)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeQuestion(qIdx)}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Question Prompt</label>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => patchQuestion(qIdx, { text: e.target.value })}
                      placeholder="Enter the question text…"
                      className={inputClass}
                    />
                  </div>

                  {q.type === "multiple_choice" ? (
                    <div className="space-y-2">
                      <label className={labelClass}>Answer Options (Select the correct answer)</label>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => patchQuestion(qIdx, { correctIndex: optIdx })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={opt}
                            placeholder={`Option ${optIdx + 1}`}
                            onChange={(e) => patchOption(qIdx, optIdx, e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      ))}
                    </div>
                  ) : q.type === "true_false" ? (
                    <div className="space-y-2">
                      <label className={labelClass}>Correct Answer</label>
                      <div className="flex items-center gap-4">
                        {["True", "False"].map((opt, optIdx) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                            <input
                              type="radio"
                              name={`tf-${q.id}`}
                              checked={q.correctIndex === optIdx}
                              onChange={() => patchQuestion(qIdx, { correctIndex: optIdx })}
                              className="h-4 w-4 text-indigo-600"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className={labelClass}>Sample Correct Answer / Rubric</label>
                      <input
                        type="text"
                        value={q.answerText ?? ""}
                        placeholder="Expected answer keywords or phrase"
                        onChange={(e) => patchQuestion(qIdx, { answerText: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {/* ── STEP 4: Review & Submit ───────────────────────────────── */}
      {step === 3 ? (
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Review & Submit</h3>
            <p className="text-xs text-slate-500">
              Verify your course configuration before saving or requesting approval.
            </p>
          </div>

          {/* Course Summary Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{code}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">{category}</Badge>
                  <Badge variant="slate">{level.toUpperCase()}</Badge>
                </div>
              </div>

              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover preview" className="h-20 w-32 rounded-xl object-cover border border-slate-200" />
              ) : null}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {description}
            </p>
          </div>

          {/* Curriculum Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Curriculum Breakdown
              </h4>
              <span className="text-xs text-slate-500">
                {modules.length} Modules ·{" "}
                {modules.reduce((sum, m) => sum + m.lessons.length, 0)} Lessons ·{" "}
                {modules.reduce(
                  (sum, m) =>
                    sum + m.lessons.reduce((s, l) => s + (l.subLessons?.length ?? 0), 0),
                  0,
                )}{" "}
                Sub-lessons
              </span>
            </div>

            <div className="space-y-3">
              {modules.map((m, mIdx) => (
                <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                  <p className="font-bold text-slate-800">
                    Module {mIdx + 1}: {m.title}
                  </p>
                  <ul className="mt-2 space-y-1.5 pl-3">
                    {m.lessons.map((l, lIdx) => (
                      <li key={l.id} className="text-slate-600">
                        <span className="font-medium text-slate-700">
                          {mIdx + 1}.{lIdx + 1} {l.title}
                        </span>{" "}
                        <span className="text-[11px] text-slate-400">
                          ({l.contentType}, {l.durationMin}m
                          {l.resourceUrl ? " · 1 file attached" : ""})
                        </span>
                        {l.subLessons && l.subLessons.length > 0 ? (
                          <ul className="pl-4 mt-1 space-y-1 text-slate-500">
                            {l.subLessons.map((sub, sIdx) => (
                              <li key={sub.id}>
                                ↳ {mIdx + 1}.{lIdx + 1}.{sIdx + 1} {sub.title} ({sub.contentType})
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment & Rules Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3">
              Final Assessment & Completion Rules
            </h4>

            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Passing Score</p>
                <p className="text-base font-bold text-slate-900 mt-1">{passMark}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Time Limit</p>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {timeLimitMinutes ? `${timeLimitMinutes} min` : "No limit"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Attempts Allowed</p>
                <p className="text-base font-bold text-slate-900 mt-1">{attemptsAllowed}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Questions</p>
                <p className="text-base font-bold text-slate-900 mt-1">{questions.length}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Wizard Footer Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 pt-5">
        <button
          type="button"
          onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {step === 0 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-3">
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !detailsValid}
              className="gap-1.5 shadow-xs"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="shadow-xs"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as Draft"}
              </Button>
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit for Approval
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}