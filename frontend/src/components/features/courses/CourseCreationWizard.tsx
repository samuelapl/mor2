"use client";

import { useRef, useState, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Bold,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Code,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Headphones,
  Heading2,
  Heading3,
  HelpCircle,
  Italic,
  Layers,
  Link as LinkIcon,
  List,
  ListOrdered,
  Lock,
  Loader2,
  Minus,
  Music,
  Plus,
  Presentation,
  Quote,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Strikethrough,
  Timer,
  Trash2,
  Underline as UnderlineIcon,
  Upload,
  Video,
  X,
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
  | "EXTERNAL_LINK"
  | "ASSIGNMENT"
  | "QUIZ"
  | "ASSESSMENT";

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
  required?: boolean;
  /** Assignment-specific fields */
  assignmentInstructions?: string;
  assignmentMaxMarks?: number;
  assignmentDueDate?: string;
  assignmentFileTypes?: string[];
  assignmentMaxFileSizeMb?: number;
  /** Quiz / Assessment specific fields */
  quizQuestions?: Question[];
  quizPassMark?: number;
  quizTimeLimitMinutes?: number | null;
  quizAttemptsAllowed?: number;
  quizShuffle?: boolean;
  assessmentAllowEarlySubmit?: boolean;
  assessmentAutoSubmitOnExpire?: boolean;
}

export interface ModuleDraft {
  id: string;
  title: string;
  description?: string;
  objectives?: string;
  durationMinutes?: number;
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

const TOOLBAR_BUTTONS = [
  {
    icon: Bold,
    title: "Bold",
    run: (e: Editor) => e.chain().focus().toggleBold().run(),
    isActive: (e: Editor) => e.isActive("bold"),
  },
  {
    icon: Italic,
    title: "Italic",
    run: (e: Editor) => e.chain().focus().toggleItalic().run(),
    isActive: (e: Editor) => e.isActive("italic"),
  },
  {
    icon: UnderlineIcon,
    title: "Underline",
    run: (e: Editor) => e.chain().focus().toggleUnderline().run(),
    isActive: (e: Editor) => e.isActive("underline"),
  },
  {
    icon: Strikethrough,
    title: "Strikethrough",
    run: (e: Editor) => e.chain().focus().toggleStrike().run(),
    isActive: (e: Editor) => e.isActive("strike"),
  },
  {
    icon: Heading2,
    title: "Heading 2",
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e: Editor) => e.isActive("heading", { level: 2 }),
  },
  {
    icon: Heading3,
    title: "Heading 3",
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e: Editor) => e.isActive("heading", { level: 3 }),
  },
  {
    icon: List,
    title: "Bullet List",
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
    isActive: (e: Editor) => e.isActive("bulletList"),
  },
  {
    icon: ListOrdered,
    title: "Ordered List",
    run: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
    isActive: (e: Editor) => e.isActive("orderedList"),
  },
  {
    icon: Quote,
    title: "Blockquote",
    run: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e: Editor) => e.isActive("blockquote"),
  },
];

function RichEditor({
  value,
  onChange,
  placeholder = "Enter content here…",
  minHeight = 140,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-slate-400 before:float-left before:pointer-events-none",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none px-4 py-3 text-slate-800 focus:outline-none`,
        style: `min-height: ${minHeight}px`,
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

function CompactRichEditor({
  value,
  onChange,
  placeholder = "Enter question statement, prompt, or scenario…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-slate-400 before:float-left before:pointer-events-none",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-3 py-2 text-slate-800 focus:outline-none min-h-[48px]",
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/70 px-2 py-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "rounded p-1 text-slate-600 hover:bg-slate-200/70",
            editor.isActive("bold") && "bg-indigo-100 text-indigo-700 font-bold",
          )}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "rounded p-1 text-slate-600 hover:bg-slate-200/70",
            editor.isActive("italic") && "bg-indigo-100 text-indigo-700",
          )}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "rounded p-1 text-slate-600 hover:bg-slate-200/70",
            editor.isActive("underline") && "bg-indigo-100 text-indigo-700",
          )}
          title="Underline"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <span className="h-3 w-px bg-slate-200 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "rounded p-1 text-slate-600 hover:bg-slate-200/70",
            editor.isActive("bulletList") && "bg-indigo-100 text-indigo-700",
          )}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "rounded p-1 text-slate-600 hover:bg-slate-200/70",
            editor.isActive("orderedList") && "bg-indigo-100 text-indigo-700",
          )}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            "rounded p-1 text-slate-600 hover:bg-slate-200/70",
            editor.isActive("code") && "bg-indigo-100 text-indigo-700",
          )}
          title="Code"
        >
          <Code className="h-3.5 w-3.5" />
        </button>
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
  const { courses, createCourse, updateCourseFull, submitForApproval } = useLms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const savedCourseIdRef = useRef<string | undefined>(editingCourse?.id);

  const isEdit = Boolean(editingCourse);

  // Step 1: Course Details & Objectives
  const [title, setTitle] = useState(editingCourse?.title ?? "");
  const [code, setCode] = useState(editingCourse?.code ?? "");
  const [category, setCategory] = useState(
    editingCourse?.category ?? COURSE_CATEGORIES[0],
  );
  const [level, setLevel] = useState<CourseLevel>(editingCourse?.level ?? "basic");
  const [description, setDescription] = useState(editingCourse?.description ?? "");
  const [objectives, setObjectives] = useState(editingCourse?.objectives ?? "");
  const [department, setDepartment] = useState(editingCourse?.department ?? "");
  const [targetAudience, setTargetAudience] = useState(editingCourse?.targetAudience ?? "");
  const [deliveryMethod] = useState(editingCourse?.deliveryMethod ?? "self_paced");
  const [language] = useState(editingCourse?.language ?? "English");
  const [prerequisites, setPrerequisites] = useState(editingCourse?.prerequisites ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    editingCourse?.cover ?? null,
  );

  // Step 2: Curriculum
  const [modules, setModules] = useState<ModuleDraft[]>(() => {
    if (editingCourse?.modules && editingCourse.modules.length > 0) {
      return editingCourse.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        description: mod.description ?? "",
        objectives: mod.objectives ?? "",
        durationMinutes: mod.durationMinutes || 60,
        lessons: mod.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          content: lesson.content ?? "",
          durationMin: lesson.durationMin || 15,
          contentType: (lesson.contentType as WizardContentType) || "DOCUMENT",
          resourceUrl: lesson.resourceUrl || "",
          required: true,
          assignmentInstructions:
            lesson.contentType === "ASSIGNMENT" ? lesson.content ?? "" : undefined,
          assignmentFileTypes: ["PDF", "DOCX", "PPTX"],
          assignmentMaxMarks: 100,
          subLessons: (lesson.subLessons ?? []).map((sub) => ({
            id: sub.id,
            title: sub.title,
            content: sub.content ?? "",
            durationMin: sub.durationMin || 15,
            contentType: (sub.contentType as WizardContentType) || "DOCUMENT",
            resourceUrl: sub.resourceUrl || "",
            required: true,
            assignmentInstructions:
              sub.contentType === "ASSIGNMENT" ? sub.content ?? "" : undefined,
            assignmentFileTypes: ["PDF", "DOCX", "PPTX"],
            assignmentMaxMarks: 100,
          })),
        })),
      }));
    }
    // New course — start empty, no dummy content
    return [];
  });

  // Expand/collapse: use Sets for multi-open support
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [expandedSubLessons, setExpandedSubLessons] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) =>
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleLesson = (id: string) =>
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSubLesson = (id: string) =>
    setExpandedSubLessons((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Step 3: Final Assessment & Completion Rules
  const [quizTitle, setQuizTitle] = useState("Final Assessment");
  const [passMark, setPassMark] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(60);
  const [attemptsAllowed, setAttemptsAllowed] = useState(2);
  const [allowEarlySubmission, setAllowEarlySubmission] = useState(true);
  const [autoSubmitOnExpire, setAutoSubmitOnExpire] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);

  // Load course / question bank questions
  useEffect(() => {
    const targetCourseId = editingCourse?.id || courses[0]?.id;
    if (!targetCourseId) return;

    fetchCourseAssessments(targetCourseId)
      .then(async (assessments) => {
        const loaded: Question[] = [];
        for (const ass of assessments) {
          try {
            const detail = await fetchAssessmentWithAnswers(ass.id);
            if (detail?.questions && Array.isArray(detail.questions)) {
              for (const q of detail.questions as any[]) {
                const type: QuestionType =
                  q.type === "TRUE_FALSE"
                    ? "true_false"
                    : q.type === "SHORT_ANSWER"
                      ? "short_answer"
                      : "multiple_choice";
                loaded.push({
                  id: q.id || uid("bank"),
                  type,
                  text: q.question || "",
                  options: Array.isArray(q.options) ? q.options : ["True", "False"],
                  correctIndex: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
                  answerText: typeof q.correctAnswer === "string" ? q.correctAnswer : "",
                  points: q.points || 10,
                });
              }
            }
          } catch {}
        }
        if (loaded.length > 0) setBankQuestions(loaded);
      })
      .catch(() => {});
  }, [courses, editingCourse?.id]);

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

  // Validation
  const descriptionText = description.replace(/<[^>]+>/g, "").trim();
  const objectivesText = objectives.replace(/<[^>]+>/g, "").trim();
  const detailsValid =
    title.trim() !== "" &&
    code.trim() !== "" &&
    descriptionText !== "" &&
    objectivesText.length >= 10;

  // Restore unfinished course draft on initial mount
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem("mor_draft_new_course");
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && (draft.title?.trim() || (Array.isArray(draft.modules) && draft.modules.length > 0) || draft.description?.trim())) {
        if (draft.title) setTitle(draft.title);
        if (draft.code) setCode(draft.code);
        if (draft.category) setCategory(draft.category);
        if (draft.level) setLevel(draft.level);
        if (draft.description) setDescription(draft.description);
        if (draft.objectives) setObjectives(draft.objectives);
        if (draft.department) setDepartment(draft.department);
        if (draft.targetAudience) setTargetAudience(draft.targetAudience);
        if (draft.prerequisites) setPrerequisites(draft.prerequisites);
        if (Array.isArray(draft.modules) && draft.modules.length > 0) setModules(draft.modules);
        if (draft.quizTitle) setQuizTitle(draft.quizTitle);
        if (typeof draft.passMark === "number") setPassMark(draft.passMark);
        if (typeof draft.timeLimitMinutes === "number") setTimeLimitMinutes(draft.timeLimitMinutes);
        if (typeof draft.attemptsAllowed === "number") setAttemptsAllowed(draft.attemptsAllowed);
        if (Array.isArray(draft.questions) && draft.questions.length > 0) setQuestions(draft.questions);
        if (draft.savedCourseId) savedCourseIdRef.current = draft.savedCourseId;
        if (typeof draft.step === "number" && draft.step >= 0 && draft.step < STEPS.length) {
          setStep(draft.step);
        }
        setDraftRestored(true);
      }
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Persist course draft to localStorage whenever fields change
  useEffect(() => {
    if (isEdit) return;
    if (!title.trim() && modules.length === 0 && !description.trim()) return;

    try {
      const draftData = {
        step,
        title,
        code,
        category,
        level,
        description,
        objectives,
        department,
        targetAudience,
        deliveryMethod,
        language,
        prerequisites,
        modules,
        quizTitle,
        passMark,
        timeLimitMinutes,
        attemptsAllowed,
        questions,
        savedCourseId: savedCourseIdRef.current,
        timestamp: Date.now(),
      };
      localStorage.setItem("mor_draft_new_course", JSON.stringify(draftData));
    } catch {
      // ignore storage errors
    }
  }, [
    step,
    title,
    code,
    category,
    level,
    description,
    objectives,
    department,
    targetAudience,
    deliveryMethod,
    language,
    prerequisites,
    modules,
    quizTitle,
    passMark,
    timeLimitMinutes,
    attemptsAllowed,
    questions,
    isEdit,
  ]);

  /* ── Curriculum Helpers ─────────────────────────────────────────── */

  const addModule = () => {
    const id = uid("mod");
    setModules((prev) => [
      ...prev,
      {
        id,
        title: "",
        description: "",
        objectives: "",
        durationMinutes: 60,
        lessons: [],
      },
    ]);
    setExpandedModules((prev) => new Set(Array.from(prev).concat(id)));
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
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const addLesson = (
    moduleId: string,
    type: WizardContentType = "DOCUMENT",
    presetTitle = "",
  ) => {
    const lessonId = uid("les");
    const defaultTitle =
      presetTitle ||
      (type === "ASSIGNMENT"
        ? "Module Assignment"
        : type === "QUIZ"
          ? "Module Quiz"
          : type === "ASSESSMENT"
            ? "Module Assessment"
            : "");
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: [
                ...m.lessons,
                {
                  id: lessonId,
                  title: defaultTitle,
                  content: "",
                  durationMin: type === "ASSIGNMENT" ? 30 : type === "ASSESSMENT" ? 45 : 15,
                  contentType: type,
                  resourceUrl: "",
                  required: true,
                  subLessons: [],
                  assignmentMaxMarks: type === "ASSIGNMENT" ? 100 : undefined,
                  assignmentInstructions: type === "ASSIGNMENT" ? "" : undefined,
                  assignmentFileTypes: type === "ASSIGNMENT" ? ["PDF", "DOCX", "PPTX"] : undefined,
                  assignmentMaxFileSizeMb: type === "ASSIGNMENT" ? 10 : undefined,
                  quizQuestions:
                    type === "QUIZ" || type === "ASSESSMENT" ? [blankQuestion()] : undefined,
                  quizPassMark: type === "QUIZ" || type === "ASSESSMENT" ? 70 : undefined,
                  quizTimeLimitMinutes: type === "QUIZ" ? 20 : type === "ASSESSMENT" ? 45 : undefined,
                  quizAttemptsAllowed: type === "QUIZ" ? 3 : type === "ASSESSMENT" ? 2 : undefined,
                  quizShuffle: false,
                  assessmentAllowEarlySubmit: true,
                  assessmentAutoSubmitOnExpire: true,
                },
              ],
            }
          : m,
      ),
    );
    setExpandedLessons((prev) => new Set(Array.from(prev).concat(lessonId)));
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

  const addSubLesson = (
    moduleId: string,
    lessonId: string,
    type: WizardContentType = "DOCUMENT",
    presetTitle = "",
  ) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const subs = l.subLessons ?? [];
            const subId = uid("sub");
            const defaultTitle =
              presetTitle ||
              (type === "ASSIGNMENT"
                ? "Lesson Assignment"
                : type === "QUIZ"
                  ? "Lesson Quiz"
                  : type === "ASSESSMENT"
                    ? "Lesson Assessment"
                    : "");
            return {
              ...l,
              subLessons: [
                ...subs,
                {
                  id: subId,
                  title: defaultTitle,
                  content: "",
                  durationMin: type === "ASSIGNMENT" ? 30 : type === "ASSESSMENT" ? 30 : 10,
                  contentType: type,
                  resourceUrl: "",
                  required: true,
                  assignmentMaxMarks: type === "ASSIGNMENT" ? 100 : undefined,
                  assignmentInstructions: type === "ASSIGNMENT" ? "" : undefined,
                  assignmentFileTypes: type === "ASSIGNMENT" ? ["PDF", "DOCX", "PPTX"] : undefined,
                  assignmentMaxFileSizeMb: type === "ASSIGNMENT" ? 10 : undefined,
                  quizQuestions:
                    type === "QUIZ" || type === "ASSESSMENT" ? [blankQuestion()] : undefined,
                  quizPassMark: type === "QUIZ" || type === "ASSESSMENT" ? 70 : undefined,
                  quizTimeLimitMinutes: type === "QUIZ" ? 15 : type === "ASSESSMENT" ? 30 : undefined,
                  quizAttemptsAllowed: type === "QUIZ" ? 3 : type === "ASSESSMENT" ? 2 : undefined,
                  quizShuffle: false,
                  assessmentAllowEarlySubmit: true,
                  assessmentAutoSubmitOnExpire: true,
                },
              ],
            };
          }),
        };
      }),
    );
  };

  const addQuizQuestionToLesson = (
    moduleId: string,
    lessonId: string,
    subLessonId?: string,
  ) => {
    const newQ = blankQuestion();
    if (subLessonId) {
      const sub = modules
        .find((m) => m.id === moduleId)
        ?.lessons.find((l) => l.id === lessonId)
        ?.subLessons?.find((s) => s.id === subLessonId);
      const curr = sub?.quizQuestions && sub.quizQuestions.length > 0 ? sub.quizQuestions : [];
      patchSubLesson(moduleId, lessonId, subLessonId, { quizQuestions: [...curr, newQ] });
    } else {
      const les = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
      const curr = les?.quizQuestions && les.quizQuestions.length > 0 ? les.quizQuestions : [];
      patchLesson(moduleId, lessonId, { quizQuestions: [...curr, newQ] });
    }
  };

  const patchQuizQuestion = (
    moduleId: string,
    lessonId: string,
    subLessonId: string | undefined,
    questionIndex: number,
    patch: Partial<Question>,
  ) => {
    const updateList = (curr: Question[] = []) => {
      const next = [...curr];
      if (next[questionIndex]) {
        next[questionIndex] = { ...next[questionIndex], ...patch };
      }
      return next;
    };
    if (subLessonId) {
      const sub = modules
        .find((m) => m.id === moduleId)
        ?.lessons.find((l) => l.id === lessonId)
        ?.subLessons?.find((s) => s.id === subLessonId);
      patchSubLesson(moduleId, lessonId, subLessonId, {
        quizQuestions: updateList(sub?.quizQuestions),
      });
    } else {
      const les = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
      patchLesson(moduleId, lessonId, { quizQuestions: updateList(les?.quizQuestions) });
    }
  };

  const removeQuizQuestion = (
    moduleId: string,
    lessonId: string,
    subLessonId: string | undefined,
    questionIndex: number,
  ) => {
    const updateList = (curr: Question[] = []) => curr.filter((_, idx) => idx !== questionIndex);
    if (subLessonId) {
      const sub = modules
        .find((m) => m.id === moduleId)
        ?.lessons.find((l) => l.id === lessonId)
        ?.subLessons?.find((s) => s.id === subLessonId);
      patchSubLesson(moduleId, lessonId, subLessonId, {
        quizQuestions: updateList(sub?.quizQuestions),
      });
    } else {
      const les = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
      patchLesson(moduleId, lessonId, { quizQuestions: updateList(les?.quizQuestions) });
    }
  };

  const moveQuizQuestion = (
    moduleId: string,
    lessonId: string,
    subLessonId: string | undefined,
    questionIndex: number,
    direction: -1 | 1,
  ) => {
    const updateList = (curr: Question[] = []) => {
      const target = questionIndex + direction;
      if (target < 0 || target >= curr.length) return curr;
      const next = [...curr];
      [next[questionIndex], next[target]] = [next[target], next[questionIndex]];
      return next;
    };
    if (subLessonId) {
      const sub = modules
        .find((m) => m.id === moduleId)
        ?.lessons.find((l) => l.id === lessonId)
        ?.subLessons?.find((s) => s.id === subLessonId);
      patchSubLesson(moduleId, lessonId, subLessonId, {
        quizQuestions: updateList(sub?.quizQuestions),
      });
    } else {
      const les = modules.find((m) => m.id === moduleId)?.lessons.find((l) => l.id === lessonId);
      patchLesson(moduleId, lessonId, { quizQuestions: updateList(les?.quizQuestions) });
    }
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

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
        description: m.description?.trim() || undefined,
        objectives: m.objectives?.trim() || undefined,
        durationMinutes: m.durationMinutes || undefined,
        lessons: m.lessons
          .filter((l) => l.title.trim() !== "")
          .map((l) => ({
            title: l.title.trim(),
            content:
              l.contentType === "ASSIGNMENT"
                ? l.assignmentInstructions || l.content || ""
                : l.content || "",
            durationMin: l.durationMin || 15,
            contentType: l.contentType,
            resourceUrl: l.resourceUrl?.trim() || undefined,
            subLessons: (l.subLessons ?? [])
              .filter((sub) => sub.title.trim() !== "")
              .map((sub) => ({
                title: sub.title.trim(),
                content:
                  sub.contentType === "ASSIGNMENT"
                    ? sub.assignmentInstructions || sub.content || ""
                    : sub.content || "",
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

  // Auto-save draft to backend when owner closes/navigates away before finishing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (title.trim() || modules.length > 0) {
        const quiz = buildQuizPayload();
        const curriculum = buildCurriculumPayload();
        if (savedCourseIdRef.current) {
          updateCourseFull(savedCourseIdRef.current, {
            title: title.trim() || "Draft Course",
            category,
            level,
            description: description.trim(),
            objectives: objectives.trim(),
            department: department.trim(),
            targetAudience: targetAudience.trim(),
            deliveryMethod: deliveryMethod.trim(),
            language: language.trim(),
            prerequisites: prerequisites.trim(),
            cover: coverFile,
            modules: curriculum,
            quiz,
          }).catch(() => {});
        } else if (title.trim()) {
          createCourse({
            title: title.trim(),
            code: code.trim().toUpperCase() || "DRAFT",
            category,
            level,
            description: description.trim(),
            objectives: objectives.trim(),
            department: department.trim(),
            targetAudience: targetAudience.trim(),
            deliveryMethod: deliveryMethod.trim(),
            language: language.trim(),
            prerequisites: prerequisites.trim(),
            cover: coverFile,
            modules: curriculum,
            quiz,
          }).then((res: any) => {
            if (res?.courseId) savedCourseIdRef.current = res.courseId;
          }).catch(() => {});
        }
        e.preventDefault();
        e.returnValue = "Your course draft will be saved automatically.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, code, modules, description, objectives, department, targetAudience, prerequisites, coverFile, questions, quizTitle, passMark]);

  const handleCancelWithSave = async () => {
    if (title.trim() || modules.length > 0) {
      try {
        const quiz = buildQuizPayload();
        const curriculum = buildCurriculumPayload();
        if (savedCourseIdRef.current) {
          await updateCourseFull(savedCourseIdRef.current, {
            title: title.trim() || "Draft Course",
            category,
            level,
            description: description.trim(),
            objectives: objectives.trim(),
            department: department.trim(),
            targetAudience: targetAudience.trim(),
            deliveryMethod: deliveryMethod.trim(),
            language: language.trim(),
            prerequisites: prerequisites.trim(),
            cover: coverFile,
            modules: curriculum,
            quiz,
          });
        } else if (title.trim()) {
          const res = await createCourse({
            title: title.trim(),
            code: code.trim().toUpperCase() || "DRAFT",
            category,
            level,
            description: description.trim(),
            objectives: objectives.trim(),
            department: department.trim(),
            targetAudience: targetAudience.trim(),
            deliveryMethod: deliveryMethod.trim(),
            language: language.trim(),
            prerequisites: prerequisites.trim(),
            cover: coverFile,
            modules: curriculum,
            quiz,
          });
          if (res?.courseId) savedCourseIdRef.current = res.courseId;
        }
      } catch {
        // silent draft save
      }
    }
    onCancel();
  };

  const handleSave = async (andSubmit = false) => {
    setSaving(true);
    setFlash(null);

    const quiz = buildQuizPayload();
    const curriculum = buildCurriculumPayload();

    try {
      let savedCourseId = savedCourseIdRef.current || editingCourse?.id;

      if (editingCourse || savedCourseIdRef.current) {
        const courseId = savedCourseIdRef.current || editingCourse!.id;
        const result = await updateCourseFull(courseId, {
          title: title.trim(),
          category,
          level,
          description: description.trim(),
          objectives: objectives.trim(),
          department: department.trim(),
          targetAudience: targetAudience.trim(),
          deliveryMethod: deliveryMethod.trim(),
          language: language.trim(),
          prerequisites: prerequisites.trim(),
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
          objectives: objectives.trim(),
          department: department.trim(),
          targetAudience: targetAudience.trim(),
          deliveryMethod: deliveryMethod.trim(),
          language: language.trim(),
          prerequisites: prerequisites.trim(),
          cover: coverFile,
          modules: curriculum,
          quiz,
        });
        if (!result.ok) throw new Error(result.message);
        savedCourseId = result.courseId;
        savedCourseIdRef.current = result.courseId;
      }

      if (andSubmit && savedCourseId) {
        const submitRes = await submitForApproval(savedCourseId);
        if (!submitRes.ok) {
          throw new Error(submitRes.message || "Failed to submit course for approval.");
        }
      }

      try {
        localStorage.removeItem("mor_draft_new_course");
      } catch {}

      onDone();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to save course.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Content Type Icon Helper ──────────────────────────────────── */

  const renderTypeIcon = (type: WizardContentType, size = "h-4 w-4") => {
    switch (type) {
      case "VIDEO":
        return <Video className={cn(size, "text-rose-600")} />;
      case "AUDIO":
        return <Headphones className={cn(size, "text-emerald-600")} />;
      case "PRESENTATION":
        return <Presentation className={cn(size, "text-amber-600")} />;
      case "INTERACTIVE":
        return <Sparkles className={cn(size, "text-violet-600")} />;
      case "EXTERNAL_LINK":
        return <ExternalLink className={cn(size, "text-blue-600")} />;
      case "ASSIGNMENT":
        return <ClipboardList className={cn(size, "text-orange-600")} />;
      case "QUIZ":
        return <FileQuestion className={cn(size, "text-indigo-600")} />;
      case "ASSESSMENT":
        return <Award className={cn(size, "text-emerald-600")} />;
      default:
        return <FileText className={cn(size, "text-indigo-600")} />;
    }
  };

  /* ── Content Upload / Input Form Helper ────────────────────────── */

  const renderContentInput = (
    lesson: LessonDraft,
    moduleId: string,
    subLessonId?: string,
  ) => {
    const isSub = Boolean(subLessonId);

    // Assignment-specific form
    if (lesson.contentType === "ASSIGNMENT") {
      const allowedTypes = lesson.assignmentFileTypes ?? ["PDF", "DOCX", "PPTX"];
      const fileOptions = [
        { id: "PDF", label: "PDF (.pdf)", icon: "📄" },
        { id: "DOCX", label: "Word (.docx, .doc)", icon: "📝" },
        { id: "PPTX", label: "PowerPoint (.pptx, .ppt)", icon: "📊" },
        { id: "TXT", label: "Text / Markdown (.txt)", icon: "📋" },
        { id: "XLSX", label: "Spreadsheet (.xlsx, .xls)", icon: "📈" },
        { id: "TEXT_ENTRY", label: "Online Rich Text Entry", icon: "✍️" },
      ];

      const toggleFileType = (typeId: string) => {
        const next = allowedTypes.includes(typeId)
          ? allowedTypes.filter((t) => t !== typeId)
          : [...allowedTypes, typeId];
        const val = { assignmentFileTypes: next.length > 0 ? next : ["PDF"] };
        if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
        else patchLesson(moduleId, lesson.id, val);
      };

      const setAllFileTypes = () => {
        const val = { assignmentFileTypes: fileOptions.map((o) => o.id) };
        if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
        else patchLesson(moduleId, lesson.id, val);
      };

      return (
        <div className="mt-3 rounded-2xl border border-orange-200/90 bg-orange-50/40 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-orange-600" /> Assignment Details & Submission Setup
            </span>
            <Badge variant="amber">Assignment</Badge>
          </div>

          <div>
            <label className={labelClass}>Assignment Instructions & Prompt *</label>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Use rich text formatting (bold, italic, lists, headings) to clearly explain the assignment requirements, deliverables, and evaluation criteria.
            </p>
            <RichEditor
              value={lesson.assignmentInstructions || lesson.content || ""}
              placeholder="Describe what the learner must research, prepare, write, and submit…"
              onChange={(html) => {
                const val = { assignmentInstructions: html, content: html };
                if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                else patchLesson(moduleId, lesson.id, val);
              }}
            />
          </div>

          {/* Supported Submission Formats */}
          <div className="space-y-2 rounded-xl border border-orange-200/70 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <label className={labelClass}>Supported Submission Formats *</label>
                <p className="text-[11px] text-slate-500">
                  Select which file types learners can upload or allow direct text response.
                </p>
              </div>
              <button
                type="button"
                onClick={setAllFileTypes}
                className="text-xs font-semibold text-orange-700 hover:text-orange-900 underline"
              >
                Allow All Formats
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {fileOptions.map((opt) => {
                const isSelected = allowedTypes.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleFileType(opt.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all shadow-2xs",
                      isSelected
                        ? "border-orange-500 bg-orange-500 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/50",
                    )}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Maximum Marks / Points</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={lesson.assignmentMaxMarks ?? 100}
                onChange={(e) => {
                  const val = { assignmentMaxMarks: parseInt(e.target.value) || 100 };
                  if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                  else patchLesson(moduleId, lesson.id, val);
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Maximum Upload File Size</label>
              <select
                value={lesson.assignmentMaxFileSizeMb ?? 10}
                onChange={(e) => {
                  const val = { assignmentMaxFileSizeMb: parseInt(e.target.value) || 10 };
                  if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                  else patchLesson(moduleId, lesson.id, val);
                }}
                className={inputClass}
              >
                <option value={5}>5 MB (Small documents)</option>
                <option value={10}>10 MB (Standard documents)</option>
                <option value={25}>25 MB (Presentations / Worksheets)</option>
                <option value={50}>50 MB (Large portfolios)</option>
                <option value={100}>100 MB (Maximum)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Due Date (Optional)</label>
              <input
                type="date"
                value={lesson.assignmentDueDate ?? ""}
                onChange={(e) => {
                  const val = { assignmentDueDate: e.target.value };
                  if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                  else patchLesson(moduleId, lesson.id, val);
                }}
                className={inputClass}
              />
            </div>
          </div>

          {/* Reference Material / Template attachment */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <label className={labelClass}>Starter Template / Worksheet File for Learners (Optional)</label>
            <p className="text-[11px] text-slate-500">
              Upload a template, problem sheet, or assignment brief that learners can download.
            </p>
            {lesson.resourceUrl ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold">{lesson.fileName || "Template file uploaded"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={lesson.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3 w-3" /> View / Download
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const val = { resourceUrl: "", fileName: "", fileSize: 0 };
                      if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                      else patchLesson(moduleId, lesson.id, val);
                    }}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  id={`assign-file-${lesson.id}-${subLessonId || "parent"}`}
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLessonFileUpload(f, moduleId, lesson.id, subLessonId);
                  }}
                />
                <label
                  htmlFor={`assign-file-${lesson.id}-${subLessonId || "parent"}`}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50/20 px-4 py-3 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Starter Template or Assignment PDF/Word/PPT file</span>
                </label>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Quiz and Assessment interactive builder
    if (lesson.contentType === "QUIZ" || lesson.contentType === "ASSESSMENT") {
      const isQuiz = lesson.contentType === "QUIZ";
      const qList =
        lesson.quizQuestions && lesson.quizQuestions.length > 0
          ? lesson.quizQuestions
          : [blankQuestion()];
      const totalPoints = qList.reduce((sum, q) => sum + (q.points || 10), 0);

      const importBankQuestions = () => {
        if (bankQuestions.length === 0) return;
        const next = [...qList, ...bankQuestions.map((q) => ({ ...q, id: uid("q") }))];
        const val = { quizQuestions: next };
        if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
        else patchLesson(moduleId, lesson.id, val);
      };

      return (
        <div
          className={cn(
            "mt-3 rounded-2xl border p-5 space-y-5 shadow-2xs",
            isQuiz ? "border-indigo-200/90 bg-indigo-50/30" : "border-emerald-200/90 bg-emerald-50/30",
          )}
        >
          {/* Header Bar */}
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 border-b pb-3",
              isQuiz ? "border-indigo-100" : "border-emerald-100",
            )}
          >
            <div className="flex items-center gap-2">
              {isQuiz ? (
                <FileQuestion className="h-4 w-4 text-indigo-600" />
              ) : (
                <Award className="h-4 w-4 text-emerald-600" />
              )}
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isQuiz ? "text-indigo-900" : "text-emerald-900",
                )}
              >
                {isQuiz ? "Interactive Quiz Builder" : "Module / Lesson Assessment Exam"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 bg-white border px-2 py-0.5 rounded-md shadow-2xs">
                Total Marks:{" "}
                <strong className={isQuiz ? "text-indigo-600" : "text-emerald-600"}>
                  {totalPoints} Pts
                </strong>
              </span>
              <Badge variant={isQuiz ? "blue" : "green"}>{isQuiz ? "Quiz" : "Assessment"}</Badge>
            </div>
          </div>

          {/* Guidelines / Overview with RichTextEditor */}
          <div>
            <label className={labelClass}>
              {isQuiz ? "Quiz Instructions & Guidelines" : "Assessment Overview & Exam Instructions"}
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Format text with bold, italic, bullet lists, and headings for clear guidelines.
            </p>
            <RichEditor
              value={lesson.content || ""}
              placeholder={
                isQuiz
                  ? "Enter quiz instructions, topics covered, and advice for learners…"
                  : "Enter comprehensive assessment instructions, honor code, rules…"
              }
              onChange={(html) => {
                if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, { content: html });
                else patchLesson(moduleId, lesson.id, { content: html });
              }}
            />
          </div>

          {/* Settings Card */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isQuiz ? "Quiz Settings & Grading" : "Assessment Rules & Time Limits"}
            </h5>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Passing Score (% minimum)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={lesson.quizPassMark ?? 70}
                  onChange={(e) => {
                    const val = {
                      quizPassMark: Math.max(1, Math.min(100, parseInt(e.target.value) || 70)),
                    };
                    if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                    else patchLesson(moduleId, lesson.id, val);
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Time Limit (Minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={lesson.quizTimeLimitMinutes ?? (isQuiz ? 20 : 45)}
                  onChange={(e) => {
                    const val = { quizTimeLimitMinutes: parseInt(e.target.value) || null };
                    if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                    else patchLesson(moduleId, lesson.id, val);
                  }}
                  placeholder="0 for untimed"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Max Attempts Allowed</label>
                <select
                  value={lesson.quizAttemptsAllowed ?? (isQuiz ? 3 : 2)}
                  onChange={(e) => {
                    const val = { quizAttemptsAllowed: parseInt(e.target.value) || 1 };
                    if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                    else patchLesson(moduleId, lesson.id, val);
                  }}
                  className={inputClass}
                >
                  <option value={1}>1 Attempt (Strict Exam)</option>
                  <option value={2}>2 Attempts</option>
                  <option value={3}>3 Attempts (Standard)</option>
                  <option value={5}>5 Attempts</option>
                  <option value={10}>Unlimited Practice</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(lesson.quizShuffle)}
                  onChange={(e) => {
                    const val = { quizShuffle: e.target.checked };
                    if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                    else patchLesson(moduleId, lesson.id, val);
                  }}
                  className="h-4 w-4 rounded text-indigo-600"
                />
                <span>Shuffle question order per attempt</span>
              </label>

              {!isQuiz && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={lesson.assessmentAllowEarlySubmit ?? true}
                      onChange={(e) => {
                        const val = { assessmentAllowEarlySubmit: e.target.checked };
                        if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                        else patchLesson(moduleId, lesson.id, val);
                      }}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                    <span>Allow early submission</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={lesson.assessmentAutoSubmitOnExpire ?? true}
                      onChange={(e) => {
                        const val = { assessmentAutoSubmitOnExpire: e.target.checked };
                        if (isSub) patchSubLesson(moduleId, lesson.id, subLessonId!, val);
                        else patchLesson(moduleId, lesson.id, val);
                      }}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                    <span>Auto-submit when timer expires</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Interactive Questions Builder */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Questions ({qList.length})
              </h5>
              <div className="flex items-center gap-2">
                {bankQuestions.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={importBankQuestions}
                    className="text-xs gap-1.5 shadow-2xs"
                  >
                    <Copy className="h-3.5 w-3.5" /> Import from Bank ({bankQuestions.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  type="button"
                  onClick={() => addQuizQuestionToLesson(moduleId, lesson.id, subLessonId)}
                  className="text-xs gap-1.5 shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Question
                </Button>
              </div>
            </div>

            {qList.map((q, qIdx) => (
              <div
                key={q.id || qIdx}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                      {qIdx + 1}
                    </span>
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const newType = e.target.value as QuestionType;
                        patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                          type: newType,
                          options: optionsForType(newType),
                          correctIndex: 0,
                          answerText: "",
                        });
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <span>Points:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={q.points || 10}
                        onChange={(e) => {
                          patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                            points: parseInt(e.target.value) || 10,
                          });
                        }}
                        className="w-12 rounded border border-slate-200 px-1.5 py-0.5 text-center text-xs font-bold text-indigo-700"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={qIdx === 0}
                      onClick={() => moveQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, -1)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={qIdx === qList.length - 1}
                      onClick={() => moveQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, 1)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={qList.length <= 1}
                      onClick={() => removeQuizQuestion(moduleId, lesson.id, subLessonId, qIdx)}
                      className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      title="Delete Question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Question Prompt * (Interactive Rich Text)</label>
                  <CompactRichEditor
                    value={q.text || ""}
                    placeholder="Enter question statement, scenario, or prompt (format with bold, italic, bullets)…"
                    onChange={(html) => {
                      patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                        text: html,
                      });
                    }}
                  />
                </div>

                {/* Multiple Choice Options */}
                {q.type === "multiple_choice" && (
                  <div className="space-y-2">
                    <label className={labelClass}>Options (Select the correct radio option)</label>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name={`quiz-correct-${lesson.id}-${subLessonId || "p"}-${qIdx}`}
                          checked={q.correctIndex === optIdx}
                          onChange={() => {
                            patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                              correctIndex: optIdx,
                            });
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          title="Mark as correct answer"
                        />
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const nextOpts = [...q.options];
                            nextOpts[optIdx] = e.target.value;
                            patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                              options: nextOpts,
                            });
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          className={inputClass}
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextOpts = q.options.filter((_, i) => i !== optIdx);
                              const nextCorrect =
                                q.correctIndex >= nextOpts.length ? 0 : q.correctIndex;
                              patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                                options: nextOpts,
                                correctIndex: nextCorrect,
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Remove option"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() => {
                          patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                            options: [...q.options, ""],
                          });
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Option
                      </button>
                    )}
                  </div>
                )}

                {/* True / False */}
                {q.type === "true_false" && (
                  <div>
                    <label className={labelClass}>Correct Answer</label>
                    <div className="flex gap-4 mt-1.5">
                      <label className="flex items-center gap-2 cursor-pointer border rounded-xl p-3 flex-1 hover:bg-slate-50">
                        <input
                          type="radio"
                          name={`quiz-tf-${lesson.id}-${subLessonId || "p"}-${qIdx}`}
                          checked={q.correctIndex === 0}
                          onChange={() => {
                            patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                              correctIndex: 0,
                            });
                          }}
                          className="h-4 w-4 text-indigo-600"
                        />
                        <span className="text-xs font-bold text-slate-800">True</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer border rounded-xl p-3 flex-1 hover:bg-slate-50">
                        <input
                          type="radio"
                          name={`quiz-tf-${lesson.id}-${subLessonId || "p"}-${qIdx}`}
                          checked={q.correctIndex === 1}
                          onChange={() => {
                            patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                              correctIndex: 1,
                            });
                          }}
                          className="h-4 w-4 text-indigo-600"
                        />
                        <span className="text-xs font-bold text-slate-800">False</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {q.type === "short_answer" && (
                  <div>
                    <label className={labelClass}>Expected Correct Answer / Key Phrase</label>
                    <input
                      type="text"
                      value={q.answerText || ""}
                      onChange={(e) => {
                        patchQuizQuestion(moduleId, lesson.id, subLessonId, qIdx, {
                          answerText: e.target.value,
                        });
                      }}
                      placeholder="e.g. Value Added Tax"
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

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
                  <span>Choose file to upload to storage</span>
                </label>
              </div>
            )}

            {lesson.uploadError ? (
              <p className="mt-1 text-xs text-red-600">{lesson.uploadError}</p>
            ) : null}
          </div>
        )}

        {/* Lesson Notes / Content — not for assignments */}
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

  /* ── Curriculum position counter ──────────────────────────────── */
  // Flat sequential index across the whole curriculum
  let seqCounter = 0;
  const nextSeq = () => {
    seqCounter += 1;
    return seqCounter;
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

      {draftRestored ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 text-xs text-indigo-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-semibold text-indigo-900">Restored unfinished course draft</p>
              <p className="text-[11px] text-indigo-700">Continuing from where you left off. All your entered details, curriculum, and settings are preserved.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem("mor_draft_new_course");
              } catch {}
              setDraftRestored(false);
              setTitle("");
              setCode("");
              setDescription("");
              setObjectives("");
              setDepartment("");
              setTargetAudience("");
              setPrerequisites("");
              setModules([]);
              setQuestions([]);
              setStep(0);
            }}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 shadow-2xs transition"
          >
            Discard Draft
          </button>
        </div>
      ) : null}

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
              <label className={labelClass}>Course Title *</label>
              <input
                type="text"
                value={title}
                placeholder="Enter course title"
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
            <RichEditor
              value={description}
              placeholder="Describe what learners will learn in this course…"
              onChange={setDescription}
              minHeight={120}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Course Learning Objectives *</label>
              <span className="text-[11px] text-slate-400">Min. 10 characters</span>
            </div>
            <RichEditor
              value={objectives}
              placeholder="Enter the learning objectives for this course…"
              onChange={setObjectives}
              minHeight={120}
            />
            {objectivesText.length > 0 && objectivesText.length < 10 ? (
              <p className="mt-1 text-xs text-amber-600">Please enter at least 10 characters.</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Owning Department</label>
              <input
                type="text"
                value={department}
                placeholder="e.g. Tax Audit Division"
                onChange={(e) => setDepartment(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                placeholder="e.g. Junior Tax Auditors, Revenue Staff"
                onChange={(e) => setTargetAudience(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Prerequisites (Optional)</label>
            <input
              type="text"
              value={prerequisites}
              placeholder="e.g. Introduction to Tax Law, BASIC-101, or 1 year in service"
              onChange={(e) => setPrerequisites(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {/* ── STEP 2: Curriculum (Modules, Lessons, Sub-lessons & Media) ─ */}
      {step === 1 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Curriculum Builder
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Build your course hierarchy: Modules → Lessons → Sub-lessons. Add assignments, media, and rich content.
              </p>
            </div>
            <Button size="sm" onClick={addModule} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Module
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Lesson
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" /> Sub-lesson
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardList className="h-3 w-3 text-orange-500" /> Assignment
            </span>
            <span className="ml-auto flex items-center gap-1 text-[11px]">
              <Lock className="h-3 w-3 text-slate-400" /> = blocked until previous complete
            </span>
          </div>

          {/* Empty state */}
          {modules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
              <Layers className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">No modules yet</p>
              <p className="mt-1 text-xs text-slate-400 max-w-xs">
                Click "Add Module" to start building your course curriculum.
              </p>
              <Button size="sm" onClick={addModule} className="mt-5 gap-1.5">
                <Plus className="h-4 w-4" /> Add your first module
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            {modules.map((mod, modIdx) => {
              const isModExpanded = expandedModules.has(mod.id);
              // Reset seq counter at the start of each module render pass
              // Actually we need global seq — reset before the map
              return (
                <div
                  key={mod.id}
                  className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-slate-50/40 px-4 py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 transition hover:bg-indigo-200"
                        title={isModExpanded ? "Collapse module" : "Expand module"}
                      >
                        {isModExpanded ? (
                          <Minus className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white">
                        {modIdx + 1}
                      </span>

                      <input
                        type="text"
                        value={mod.title}
                        placeholder="Module title…"
                        onChange={(e) => patchModule(mod.id, { title: e.target.value })}
                        className="w-full max-w-md rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none"
                      />
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

                  {/* Module Body */}
                  {isModExpanded ? (
                    <div className="p-4 space-y-4">
                      {/* Module Metadata */}
                      <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                        <div className="sm:col-span-2 space-y-3">
                          <div>
                            <label className={labelClass}>Module Learning Objectives</label>
                            <RichEditor
                              value={mod.objectives ?? ""}
                              placeholder="Specify the key learning objectives for this module…"
                              onChange={(html) => patchModule(mod.id, { objectives: html })}
                              minHeight={80}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Module Description (Optional)</label>
                            <CompactRichEditor
                              value={mod.description ?? ""}
                              placeholder="Brief summary of module scope and focus — supports bold, italic, and bullets"
                              onChange={(html) => patchModule(mod.id, { description: html })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Est. Duration (min)</label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                            <input
                              type="number"
                              min={5}
                              step={5}
                              value={mod.durationMinutes ?? 60}
                              onChange={(e) =>
                                patchModule(mod.id, {
                                  durationMinutes: parseInt(e.target.value) || 60,
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Estimated study minutes.
                          </p>
                        </div>
                      </div>

                      {/* Lessons */}
                      {mod.lessons.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-xs text-slate-400">
                          No lessons yet — add your first lesson below.
                        </div>
                      ) : null}

                      <div className="space-y-2 pl-0">
                        {mod.lessons.map((lesson, lesIdx) => {
                          const isLesExpanded = expandedLessons.has(lesson.id);
                          const hasSubLessons = (lesson.subLessons ?? []).length > 0;
                          const lessonSeq = modIdx * 100 + lesIdx + 1;

                          return (
                            <div
                              key={lesson.id}
                              className="rounded-xl border border-sky-100/80 bg-white pl-0 shadow-2xs"
                            >
                              {/* Lesson Header Row */}
                              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-sky-50/50 rounded-t-xl">
                                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleLesson(lesson.id)}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700 hover:bg-sky-200 transition"
                                    title={isLesExpanded ? "Collapse lesson" : "Expand lesson"}
                                  >
                                    {isLesExpanded ? (
                                      <Minus className="h-3 w-3" />
                                    ) : (
                                      <Plus className="h-3 w-3" />
                                    )}
                                  </button>

                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-500 text-[10px] font-bold text-white">
                                    {modIdx + 1}.{lesIdx + 1}
                                  </span>

                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200">
                                    {renderTypeIcon(lesson.contentType, "h-3.5 w-3.5")}
                                  </div>

                                  <input
                                    type="text"
                                    value={lesson.title}
                                    placeholder="Lesson title…"
                                    onChange={(e) =>
                                      patchLesson(mod.id, lesson.id, { title: e.target.value })
                                    }
                                    className="w-full font-semibold text-slate-800 text-sm border-b border-transparent focus:border-indigo-400 focus:outline-none bg-transparent"
                                  />
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  {/* Content Type */}
                                  <select
                                    value={lesson.contentType}
                                    onChange={(e) =>
                                      patchLesson(mod.id, lesson.id, {
                                        contentType: e.target.value as WizardContentType,
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none"
                                  >
                                    <option value="DOCUMENT">PDF / Document</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="AUDIO">Audio</option>
                                    <option value="PRESENTATION">Presentation</option>
                                    <option value="QUIZ">Quiz (Interactive)</option>
                                    <option value="ASSIGNMENT">Assignment</option>
                                    <option value="ASSESSMENT">Assessment (Exam)</option>
                                    <option value="INTERACTIVE">Interactive Activity</option>
                                    <option value="EXTERNAL_LINK">External Link</option>
                                  </select>

                                  {/* Duration */}
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

                                  {/* Required toggle */}
                                  <label className="flex items-center gap-1 cursor-pointer text-xs text-slate-600" title="Required for progression">
                                    <input
                                      type="checkbox"
                                      checked={lesson.required !== false}
                                      onChange={(e) =>
                                        patchLesson(mod.id, lesson.id, { required: e.target.checked })
                                      }
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                                    />
                                    <Lock className="h-3 w-3 text-slate-400" />
                                  </label>

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

                              {/* Lesson Expanded Content */}
                              {isLesExpanded ? (
                                <div className="px-3 pb-3">
                                  {renderContentInput(lesson, mod.id)}

                                  {/* Sub-lessons Section */}
                                  <div className="mt-3 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleSubLesson(lesson.id)}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                                      >
                                        {expandedSubLessons.has(lesson.id) ? (
                                          <Minus className="h-3.5 w-3.5 text-violet-500" />
                                        ) : (
                                          <Plus className="h-3.5 w-3.5 text-violet-500" />
                                        )}
                                        Sub-lessons ({lesson.subLessons?.length ?? 0})
                                      </button>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          addSubLesson(mod.id, lesson.id, "DOCUMENT");
                          setExpandedSubLessons((prev) => new Set(Array.from(prev).concat(lesson.id)));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Sub-lesson
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addSubLesson(mod.id, lesson.id, "QUIZ", "Lesson Quiz");
                          setExpandedSubLessons((prev) => new Set(Array.from(prev).concat(lesson.id)));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition shadow-2xs"
                      >
                        <FileQuestion className="h-3.5 w-3.5" /> Quiz
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addSubLesson(mod.id, lesson.id, "ASSIGNMENT", "Lesson Assignment");
                          setExpandedSubLessons((prev) => new Set(Array.from(prev).concat(lesson.id)));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 transition shadow-2xs"
                      >
                        <ClipboardList className="h-3.5 w-3.5" /> Assignment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addSubLesson(mod.id, lesson.id, "ASSESSMENT", "Lesson Assessment");
                          setExpandedSubLessons((prev) => new Set(Array.from(prev).concat(lesson.id)));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition shadow-2xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Assessment
                      </button>
                    </div>
                                    </div>

                                    {expandedSubLessons.has(lesson.id) && lesson.subLessons && lesson.subLessons.length > 0 ? (
                                      <div className="space-y-2 pl-4 border-l-2 border-violet-200">
                                        {lesson.subLessons.map((sub, subIdx) => (
                                          <div
                                            key={sub.id}
                                            className="rounded-xl border border-violet-100/80 bg-violet-50/30 p-3 shadow-2xs"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
                                                  {modIdx + 1}.{lesIdx + 1}.{subIdx + 1}
                                                </span>
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white border border-slate-200">
                                                  {renderTypeIcon(sub.contentType, "h-3 w-3")}
                                                </div>
                                                <input
                                                  type="text"
                                                  value={sub.title}
                                                  placeholder="Sub-lesson title…"
                                                  onChange={(e) =>
                                                    patchSubLesson(mod.id, lesson.id, sub.id, {
                                                      title: e.target.value,
                                                    })
                                                  }
                                                  className="w-full text-xs font-semibold text-slate-800 border-b border-transparent focus:border-indigo-400 focus:outline-none bg-transparent"
                                                />
                                              </div>

                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <select
                                                  value={sub.contentType}
                                                  onChange={(e) =>
                                                    patchSubLesson(mod.id, lesson.id, sub.id, {
                                                      contentType: e.target.value as WizardContentType,
                                                    })
                                                  }
                                                  className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
                                                >
                                                  <option value="DOCUMENT">PDF / Doc</option>
                                                  <option value="VIDEO">Video</option>
                                                  <option value="AUDIO">Audio</option>
                                                  <option value="PRESENTATION">Slides</option>
                                                  <option value="QUIZ">Quiz (Interactive)</option>
                                                  <option value="ASSIGNMENT">Assignment</option>
                                                  <option value="ASSESSMENT">Assessment (Exam)</option>
                                                  <option value="INTERACTIVE">Interactive Activity</option>
                                                  <option value="EXTERNAL_LINK">Link</option>
                                                </select>

                                                <div className="flex items-center gap-0.5 text-xs text-slate-500">
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
                                                  onClick={() => moveSubLesson(mod.id, lesson.id, sub.id, -1)}
                                                  disabled={subIdx === 0}
                                                  className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                >
                                                  <ChevronUp className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => moveSubLesson(mod.id, lesson.id, sub.id, 1)}
                                                  disabled={subIdx === lesson.subLessons!.length - 1}
                                                  className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                >
                                                  <ChevronDown className="h-3 w-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => removeSubLesson(mod.id, lesson.id, sub.id)}
                                                  className="rounded p-1 text-slate-400 hover:text-red-600 transition"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Sub-lesson Content */}
                                            {renderContentInput(sub, mod.id, sub.id)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addLesson(mod.id, "DOCUMENT")}
                          className="gap-1.5 text-sky-700 border-sky-300 hover:bg-sky-50 shadow-2xs"
                        >
                          <Plus className="h-4 w-4" /> Add Lesson
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addLesson(mod.id, "QUIZ", "Module Quiz")}
                          className="gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50 shadow-2xs"
                        >
                          <FileQuestion className="h-4 w-4" /> Add Quiz
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addLesson(mod.id, "ASSIGNMENT", "Module Assignment")}
                          className="gap-1.5 text-orange-700 border-orange-300 hover:bg-orange-50 shadow-2xs"
                        >
                          <ClipboardList className="h-4 w-4" /> Add Assignment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addLesson(mod.id, "ASSESSMENT", "Module Assessment")}
                          className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-2xs"
                        >
                          <Sparkles className="h-4 w-4" /> Add Assessment
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Collapsed module summary
                    <div className="px-4 py-2 flex items-center gap-3 text-xs text-slate-500">
                      <span>{mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}</span>
                      {mod.durationMinutes ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {mod.durationMinutes} min
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {modules.length > 0 ? (
            <Button size="sm" variant="outline" onClick={addModule} className="gap-1.5 border-dashed">
              <Plus className="h-4 w-4" /> Add Another Module
            </Button>
          ) : null}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Question Bank ({questions.length} question{questions.length !== 1 ? "s" : ""})
              </h4>
              <div className="flex items-center gap-2">
                {bankQuestions.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setQuestions((prev) => [
                        ...prev,
                        ...bankQuestions.map((bq) => ({
                          ...bq,
                          id: uid("q"),
                        })),
                      ]);
                    }}
                    className="gap-1.5 shadow-xs"
                  >
                    <Copy className="h-3.5 w-3.5" /> Import from Bank ({bankQuestions.length})
                  </Button>
                )}
                <Button size="sm" onClick={addQuestion} className="gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" /> Add Question
                </Button>
              </div>
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
                    <span className="text-xs font-bold text-indigo-700">
                      Question {qIdx + 1}
                    </span>

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

                      {/* Points per question */}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">Pts:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={q.points}
                          onChange={(e) =>
                            patchQuestion(qIdx, { points: parseInt(e.target.value) || 10 })
                          }
                          className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs text-center"
                        />
                      </div>

                      {/* Reorder */}
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, -1)}
                        disabled={qIdx === 0}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move question up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(qIdx, 1)}
                        disabled={qIdx === questions.length - 1}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move question down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

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
                    <label className={labelClass}>Question Prompt * (Interactive Rich Text)</label>
                    <CompactRichEditor
                      value={q.text || ""}
                      placeholder="Enter question statement, scenario, or prompt (format with bold, italic, bullets)…"
                      onChange={(html) => patchQuestion(qIdx, { text: html })}
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Review & Submit</h3>
              <p className="text-xs text-slate-500">
                Verify your course configuration before saving or requesting approval.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowReviewDetails(!showReviewDetails)}
              className="gap-1.5 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 shadow-2xs transition"
            >
              {showReviewDetails ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showReviewDetails ? "Collapse Details" : "Show Learner View & Details"}
            </Button>
          </div>

          {/* Course Summary Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{code}</span>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="outline">{category}</Badge>
                  <Badge variant="slate">{level.toUpperCase()}</Badge>
                </div>
              </div>

              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover preview" className="h-20 w-32 rounded-xl object-cover border border-slate-200" />
              ) : null}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3 text-xs">
              <div>
                <p className="font-semibold text-slate-700">Course Description</p>
                {description && description.replace(/<[^>]+>/g, "").trim() ? (
                  <div
                    className="text-slate-600 mt-0.5 leading-relaxed prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                ) : (
                  <p className="mt-1 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-amber-700 italic">
                    ⚠ No description added yet — go back to Step 1 and fill in the Course Description.
                  </p>
                )}
              </div>

              {objectives && objectives.replace(/<[^>]+>/g, "").trim() ? (
                <div className="rounded-xl bg-indigo-50/60 p-3 border border-indigo-100/70">
                  <p className="font-semibold text-indigo-900">Course Learning Objectives</p>
                  <div
                    className="text-indigo-800/90 mt-1 leading-relaxed prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{ __html: objectives }}
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50/60 p-3 border border-amber-100/70">
                  <p className="font-semibold text-amber-800">⚠ No Learning Objectives added</p>
                  <p className="text-amber-700 mt-0.5 text-[11px]">Go back to Step 1 and add what learners will achieve from this course.</p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-slate-500 pt-1">
                <div><span className="font-medium text-slate-700">Department:</span> {department || <span className="text-amber-600 italic">Not specified</span>}</div>
                <div><span className="font-medium text-slate-700">Target Audience:</span> {targetAudience || <span className="text-amber-600 italic">Not specified</span>}</div>
                <div><span className="font-medium text-slate-700">Prerequisites:</span> {prerequisites || "None"}</div>
              </div>
            </div>
          </div>

          {/* Curriculum Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Curriculum Breakdown
              </h4>
              <span className="text-xs text-slate-500">
                {modules.length} Module{modules.length !== 1 ? "s" : ""} ·{" "}
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
              {modules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-xs text-amber-700 italic">
                  ⚠ No modules added yet — go back to Step 2 to build your course curriculum.
                </p>
              ) : (
                modules.map((m, mIdx) => (
                  <div key={m.id} className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 text-xs space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          Module {mIdx + 1}: {m.title.trim() || <span className="text-amber-600 italic font-normal">Untitled Module (needs title in Step 2)</span>}
                        </p>
                        {m.description && m.description.replace(/<[^>]+>/g, "").trim() ? (
                          <div
                            className="mt-1 text-xs text-slate-600 leading-relaxed prose prose-xs max-w-none"
                            dangerouslySetInnerHTML={{ __html: m.description }}
                          />
                        ) : (
                          <p className="mt-1 text-[11px] text-amber-700/80 italic rounded-md bg-amber-50/80 px-2.5 py-1 border border-dashed border-amber-200">
                            ⚠ No module description — learners will not see an overview for this module.
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                        {m.durationMinutes ? `${m.durationMinutes} min` : "60 min"} · {m.lessons.length} lessons
                      </span>
                    </div>

                    {m.lessons.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-700 italic">
                        ⚠ No lessons in this module. Learners will have no content to study. Go back to Step 2 to add lessons.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {m.lessons.map((l, lIdx) => (
                          <li key={l.id} className="rounded-lg border border-slate-200/70 bg-white p-3 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 font-mono text-[10px] font-bold text-indigo-700">
                                  {mIdx + 1}.{lIdx + 1}
                                </span>
                                <span className="font-semibold text-slate-800 text-xs">
                                  {l.title.trim() || <span className="text-amber-600 italic font-normal">Untitled Lesson</span>}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <Badge variant="slate">{l.contentType}</Badge>
                                <span>{l.durationMin || 15}m</span>
                                <span>{l.required === false ? "· Optional" : "· Required"}</span>
                                {l.resourceUrl ? <Badge variant="blue">1 File Attached</Badge> : null}
                              </div>
                            </div>

                            {/* Show Details (Learner View) */}
                            {showReviewDetails && (
                              <div className="mt-2 pt-2 border-t border-slate-100 space-y-2 text-xs">
                                {l.resourceUrl ? (
                                  <div className="flex items-center gap-2 rounded-lg bg-indigo-50/60 p-2 text-[11px] text-indigo-900 border border-indigo-100">
                                    <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                    <span className="font-medium">Attached Material:</span>
                                    <span className="truncate max-w-xs">{l.fileName || l.resourceUrl}</span>
                                  </div>
                                ) : null}

                                {l.content && l.content.replace(/<[^>]+>/g, "").trim() ? (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lesson Reading Notes / Instructions:</p>
                                    <div
                                      className="mt-0.5 rounded-lg bg-slate-50 p-2.5 text-slate-700 leading-relaxed prose prose-xs max-w-none border border-slate-100"
                                      dangerouslySetInnerHTML={{ __html: l.content }}
                                    />
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-amber-600/90 italic">⚠ No reading notes or instructions written for this lesson.</p>
                                )}

                                {l.subLessons && l.subLessons.length > 0 ? (
                                  <div className="mt-2 space-y-1 pl-3 border-l-2 border-indigo-200">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Sub-Lessons ({l.subLessons.length})</p>
                                    {l.subLessons.map((sub, sIdx) => (
                                      <div key={sub.id} className="text-[11px] text-slate-600 flex items-center justify-between">
                                        <span>↳ {mIdx + 1}.{lIdx + 1}.{sIdx + 1} {sub.title} ({sub.contentType})</span>
                                        <span className="text-slate-400">{sub.durationMin}m</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assessment & Rules Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Final Assessment & Completion Rules
              </h4>
              <span className="text-xs font-semibold text-indigo-600">
                {questions.length} Question{questions.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-slate-500 font-medium">Passing Score</p>
                <p className="text-base font-bold text-slate-900 mt-1">{passMark}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-slate-500 font-medium">Time Limit</p>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {timeLimitMinutes ? `${timeLimitMinutes} min` : "No limit"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-slate-500 font-medium">Attempts Allowed</p>
                <p className="text-base font-bold text-slate-900 mt-1">{attemptsAllowed}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-slate-500 font-medium">Total Questions</p>
                <p className="text-base font-bold text-slate-900 mt-1">{questions.length}</p>
              </div>
            </div>

            {/* Questions Preview */}
            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-amber-800 text-xs">
                ⚠ No assessment questions added yet. Learners will not be tested before completion. Go back to Step 3 to add questions.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Assessment Questions Preview ({questions.length})
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReviewDetails(!showReviewDetails)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 h-7"
                  >
                    {showReviewDetails ? "Hide Question Details" : "Show All Questions"}
                  </Button>
                </div>

                {showReviewDetails && (
                  <div className="space-y-3">
                    {questions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                              {qIdx + 1}
                            </span>
                            <Badge variant="slate">
                              {q.type === "multiple_choice" ? "Multiple Choice" : q.type === "true_false" ? "True / False" : "Short Answer"}
                            </Badge>
                          </div>
                          <span className="font-semibold text-slate-600 text-[11px]">{q.points || 10} Points</span>
                        </div>

                        <div
                          className="font-medium text-slate-800 text-xs prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{ __html: q.text || "<em>No question prompt</em>" }}
                        />

                        {q.type === "multiple_choice" && (
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs",
                                  q.correctIndex === optIdx
                                    ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-900"
                                    : "bg-white border-slate-200 text-slate-600"
                                )}
                              >
                                <span className="font-mono text-[10px] text-slate-500">{String.fromCharCode(65 + optIdx)}.</span>
                                <span>{opt}</span>
                                {q.correctIndex === optIdx && (
                                  <Badge variant="green" className="ml-auto text-[10px] py-0 px-1.5">
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === "true_false" && (
                          <div className="flex items-center gap-3 pt-1">
                            {["True", "False"].map((opt, optIdx) => (
                              <span
                                key={opt}
                                className={cn(
                                  "px-3 py-1 rounded-lg border text-xs font-semibold",
                                  q.correctIndex === optIdx
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                    : "bg-white border-slate-200 text-slate-500"
                                )}
                              >
                                {opt} {q.correctIndex === optIdx ? "✓ (Correct)" : ""}
                              </span>
                            ))}
                          </div>
                        )}

                        {q.type === "short_answer" && (
                          <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                            <span className="font-semibold text-slate-700">Expected Keywords / Rubric: </span>
                            {q.answerText || <span className="italic text-slate-400">None specified</span>}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Wizard Footer Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 pt-5">
        <button
          type="button"
          onClick={() => (step === 0 ? handleCancelWithSave() : setStep(step - 1))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {step === 0 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="gap-1.5 shadow-xs text-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save as Draft
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !detailsValid}
              className="gap-1.5 shadow-xs"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}