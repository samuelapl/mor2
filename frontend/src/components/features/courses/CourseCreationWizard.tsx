"use client";

import { useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import type { Course, CourseLevel, Question, QuestionType, Quiz, UploadedResource } from "@/types";
import { Button } from "@/components/ui/Button";
import { stripHtmlTags } from "@/components/ui/RichContent";
import { cn } from "@/lib/utils";
import { useLms } from "@/lib/lms-store";
import { fetchAssessmentWithAnswers, fetchCourseAssessments } from "@/lib/api/quiz";
import { uploadAttachment } from "@/lib/api/files";
import { COURSE_CATEGORIES } from "@/constants/course-categories";
import { toast } from "@/lib/toast";

import {
  type LessonDraft,
  type ModuleDraft,
  type WizardContentType,
  uid,
} from "./wizard-types";
import { StepCourseDetails } from "./StepCourseDetails";
import { StepCurriculum } from "./StepCurriculum";
import { StepFinalAssessment } from "./StepFinalAssessment";
import { StepReviewSubmit } from "./StepReviewSubmit";

interface CourseCreationWizardProps {
  onDone: () => void;
  onCancel: () => void;
  /** When provided the wizard runs in edit mode for an existing draft/rejected course. */
  editingCourse?: Course | null;
}

const STEPS = [
  "Course Details",
  "Curriculum & Content",
  "Final Assessment & Rules",
  "Review & Submit",
];

export function CourseCreationWizard({
  onDone,
  onCancel,
  editingCourse,
}: CourseCreationWizardProps) {
  const { courses, createCourse, updateCourseFull, submitForApproval } = useLms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const savedCourseIdRef = useRef<string | undefined>(editingCourse?.id);

  const isEdit = Boolean(editingCourse);

  // Step 1: Course Details & Objectives
  const [title, setTitle] = useState(editingCourse?.title ?? "");
  const [titleAm, setTitleAm] = useState((editingCourse as any)?.titleAm ?? "");
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
  const getInitialDraftResources = (item: {
    resources?: UploadedResource[];
    attachments?: UploadedResource[];
    resourceUrl?: string;
    fileName?: string;
    fileSize?: number;
  }): UploadedResource[] => {
    if (item.resources && item.resources.length > 0) return item.resources;
    if (item.attachments && item.attachments.length > 0) return item.attachments;
    if (item.resourceUrl) {
      return [
        {
          id: "legacy",
          name: item.fileName || item.resourceUrl.split("/").pop() || "Attached File",
          url: item.resourceUrl,
          size: item.fileSize || 0,
        },
      ];
    }
    return [];
  };

  const [modules, setModules] = useState<ModuleDraft[]>(() => {
    if (editingCourse?.modules && editingCourse.modules.length > 0) {
      return editingCourse.modules.map((mod) => {
        const modRes = getInitialDraftResources(mod);
        return {
          id: mod.id,
          title: mod.title,
          description: mod.description ?? "",
          objectives: mod.objectives ?? "",
          durationMinutes: mod.durationMinutes || 60,
          resourceUrl: mod.resourceUrl || modRes[0]?.url || "",
          fileName: mod.fileName || modRes[0]?.name || "",
          fileSize: mod.fileSize || modRes[0]?.size || 0,
          resources: modRes,
          attachments: modRes,
          lessons: mod.lessons.map((lesson) => {
            const lesRes = getInitialDraftResources(lesson);
            return {
              id: lesson.id,
              title: lesson.title,
              content: lesson.content ?? "",
              durationMin: lesson.durationMin || 15,
              contentType: (lesson.contentType as WizardContentType) || "DOCUMENT",
              resourceUrl: lesson.resourceUrl || lesRes[0]?.url || "",
              fileName: lesson.fileName || lesRes[0]?.name || "",
              fileSize: lesson.fileSize || lesRes[0]?.size || 0,
              resources: lesRes,
              attachments: lesRes,
              required: true,
              assignmentInstructions:
                lesson.contentType === "ASSIGNMENT" ? lesson.content ?? "" : undefined,
              assignmentFileTypes: ["PDF", "DOCX", "PPTX"],
              assignmentMaxMarks: 100,
              subLessons: (lesson.subLessons ?? []).map((sub) => {
                const subRes = getInitialDraftResources(sub);
                return {
                  id: sub.id,
                  title: sub.title,
                  content: sub.content ?? "",
                  durationMin: sub.durationMin || 15,
                  contentType: (sub.contentType as WizardContentType) || "DOCUMENT",
                  resourceUrl: sub.resourceUrl || subRes[0]?.url || "",
                  fileName: sub.fileName || subRes[0]?.name || "",
                  fileSize: sub.fileSize || subRes[0]?.size || 0,
                  resources: subRes,
                  attachments: subRes,
                  required: true,
                  assignmentInstructions:
                    sub.contentType === "ASSIGNMENT" ? sub.content ?? "" : undefined,
                  assignmentFileTypes: ["PDF", "DOCX", "PPTX"],
                  assignmentMaxMarks: 100,
                };
              }),
            };
          }),
        };
      });
    }
    return [];
  });

  // Expand/collapse tracking for curriculum
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [expandedSubLessons, setExpandedSubLessons] = useState<Set<string>>(new Set());

  // Step 3: Final Assessment & Completion Rules
  const [quizTitle, setQuizTitle] = useState("Final Assessment");
  const [passMark, setPassMark] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(60);
  const [attemptsAllowed, setAttemptsAllowed] = useState(2);
  const [allowEarlySubmission, setAllowEarlySubmission] = useState(true);
  const [autoSubmitOnExpire, setAutoSubmitOnExpire] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [assessmentFileUrl, setAssessmentFileUrl] = useState<string>("");
  const [assessmentFileName, setAssessmentFileName] = useState<string>("");
  const [assessmentFileSize, setAssessmentFileSize] = useState<number>(0);
  const [assessmentResources, setAssessmentResources] = useState<UploadedResource[]>(() => {
    if (editingCourse?.attachments && editingCourse.attachments.length > 0) {
      return editingCourse.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
      }));
    }
    return [];
  });
  const [assessmentUploading, setAssessmentUploading] = useState<boolean>(false);
  const [assessmentUploadError, setAssessmentUploadError] = useState<string | null>(null);

  const handleFinalAssessmentFileUpload = async (files: File | File[] | FileList) => {
    const fileList = Array.isArray(files) ? files : files instanceof File ? [files] : Array.from(files);
    if (fileList.length === 0) return;

    setAssessmentUploading(true);
    setAssessmentUploadError(null);
    try {
      const uploaded: UploadedResource[] = [];
      for (const f of fileList) {
        const res = await uploadAttachment(f, { courseId: editingCourse?.id });
        uploaded.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: res.fileName,
          url: res.fileUrl,
          size: res.sizeBytes,
          type: res.fileType,
        });
      }
      const combined = [...assessmentResources, ...uploaded];
      setAssessmentResources(combined);
      setAssessmentFileUrl(combined[0]?.url || "");
      setAssessmentFileName(combined[0]?.name || "");
      setAssessmentFileSize(combined[0]?.size || 0);
    } catch (err) {
      setAssessmentUploadError(err instanceof Error ? err.message : "Failed to upload reference file");
    } finally {
      setAssessmentUploading(false);
    }
  };

  const removeFinalAssessmentFile = (fileIdOrUrl: string) => {
    const filtered = assessmentResources.filter((f) => f.id !== fileIdOrUrl && f.url !== fileIdOrUrl);
    setAssessmentResources(filtered);
    setAssessmentFileUrl(filtered[0]?.url || "");
    setAssessmentFileName(filtered[0]?.name || "");
    setAssessmentFileSize(filtered[0]?.size || 0);
  };

  // Load question bank questions from existing assessments
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

  // Prefill assessment if editing an existing course
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
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [editingCourse?.id]);

  // Validation for Step 1
  const titleText = stripHtmlTags(title);
  const codeText = stripHtmlTags(code);
  const descriptionText = stripHtmlTags(description);
  const objectivesText = stripHtmlTags(objectives);
  const detailsValid =
    titleText !== "" &&
    codeText !== "" &&
    descriptionText !== "" &&
    objectivesText.length >= 10;

  // Restore unfinished course draft on initial mount
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem("mor_draft_new_course");
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (
        draft &&
        (draft.title?.trim() ||
          (Array.isArray(draft.modules) && draft.modules.length > 0) ||
          draft.description?.trim())
      ) {
        if (draft.title) setTitle(draft.title);
        if (draft.titleAm) setTitleAm(draft.titleAm);
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
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // Persist course draft to localStorage whenever fields change
  useEffect(() => {
    if (isEdit) return;
    if (!stripHtmlTags(title) && modules.length === 0 && !stripHtmlTags(description)) return;

    try {
      const draftData = {
        step,
        title,
        titleAm,
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
    } catch {}
  }, [
    step,
    title,
    titleAm,
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

  /* ── Save & Submit Handlers ─────────────────────────────────────── */

  const buildCurriculumPayload = () =>
    modules
      .filter((m) => m.title.trim() !== "" || m.lessons.some((l) => l.title.trim() !== ""))
      .map((m) => {
        const mResources = m.resources?.length ? m.resources : m.attachments?.length ? m.attachments : [];
        return {
          title: m.title.trim() || "Module",
          description: m.description?.trim() || undefined,
          objectives: m.objectives?.trim() || undefined,
          durationMinutes: m.durationMinutes || undefined,
          resourceUrl: m.resourceUrl?.trim() || mResources[0]?.url || undefined,
          fileName: m.fileName || mResources[0]?.name || undefined,
          fileSize: m.fileSize || mResources[0]?.size || undefined,
          resources: mResources,
          attachments: mResources,
          lessons: m.lessons
            .filter((l) => l.title.trim() !== "")
            .map((l) => {
              const lResources = l.resources?.length ? l.resources : l.attachments?.length ? l.attachments : [];
              return {
                title: l.title.trim(),
                content:
                  l.contentType === "ASSIGNMENT"
                    ? l.assignmentInstructions || l.content || ""
                    : l.content || "",
                durationMin: l.durationMin || 15,
                contentType: l.contentType,
                resourceUrl: l.resourceUrl?.trim() || lResources[0]?.url || undefined,
                fileName: l.fileName || lResources[0]?.name || undefined,
                fileSize: l.fileSize || lResources[0]?.size || undefined,
                resources: lResources,
                attachments: lResources,
                subLessons: (l.subLessons ?? [])
                  .filter((sub) => sub.title.trim() !== "")
                  .map((sub) => {
                    const sResources = sub.resources?.length ? sub.resources : sub.attachments?.length ? sub.attachments : [];
                    return {
                      title: sub.title.trim(),
                      content:
                        sub.contentType === "ASSIGNMENT"
                          ? sub.assignmentInstructions || sub.content || ""
                          : sub.content || "",
                      durationMin: sub.durationMin || 15,
                      contentType: sub.contentType,
                      resourceUrl: sub.resourceUrl?.trim() || sResources[0]?.url || undefined,
                      fileName: sub.fileName || sResources[0]?.name || undefined,
                      fileSize: sub.fileSize || sResources[0]?.size || undefined,
                      resources: sResources,
                      attachments: sResources,
                    };
                  }),
              };
            }),
        };
      });

  const buildQuizPayload = (): Quiz | undefined =>
    questions.length > 0
      ? {
          id: `q-${Date.now()}`,
          title: quizTitle.trim() || "Final Assessment",
          passMark,
          attemptsAllowed,
          timeLimitMinutes: timeLimitMinutes || null,
          questions,
          resourceUrl: assessmentFileUrl || assessmentResources[0]?.url || undefined,
          fileName: assessmentFileName || assessmentResources[0]?.name || undefined,
          resources: assessmentResources,
          attachments: assessmentResources,
        }
      : undefined;

  // Auto-save draft to backend before unload if changes exist
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
      } catch {}
    }
    onCancel();
  };

  const handleSave = async (andSubmit = false) => {
    setSaving(true);

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
        toast.success("Course submitted for approval successfully!");
      } else {
        toast.success("Course draft saved successfully!");
      }

      try {
        localStorage.removeItem("mor_draft_new_course");
      } catch {}

      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save course.");
    } finally {
      setSaving(false);
    }
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
              <p className="text-[11px] text-indigo-700">
                Continuing from where you left off. All your entered details, curriculum, and settings are preserved.
              </p>
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
              setTitleAm("");
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

      {/* ── STEP 1: Course Details ── */}
      {step === 0 ? (
        <StepCourseDetails
          title={title}
          setTitle={setTitle}
          titleAm={titleAm}
          setTitleAm={setTitleAm}
          code={code}
          setCode={setCode}
          category={category}
          setCategory={setCategory}
          level={level}
          setLevel={setLevel}
          description={description}
          setDescription={setDescription}
          objectives={objectives}
          setObjectives={setObjectives}
          department={department}
          setDepartment={setDepartment}
          targetAudience={targetAudience}
          setTargetAudience={setTargetAudience}
          prerequisites={prerequisites}
          setPrerequisites={setPrerequisites}
          coverPreview={coverPreview}
          setCoverPreview={setCoverPreview}
          setCoverFile={setCoverFile}
          fileInputRef={fileInputRef}
          isEdit={isEdit}
          objectivesText={objectivesText}
        />
      ) : null}

      {/* ── STEP 2: Curriculum & Content ── */}
      {step === 1 ? (
        <StepCurriculum
          modules={modules}
          setModules={setModules}
          expandedModules={expandedModules}
          setExpandedModules={setExpandedModules}
          expandedLessons={expandedLessons}
          setExpandedLessons={setExpandedLessons}
          expandedSubLessons={expandedSubLessons}
          setExpandedSubLessons={setExpandedSubLessons}
          editingCourseId={editingCourse?.id}
        />
      ) : null}

      {/* ── STEP 3: Final Assessment & Rules ── */}
      {step === 2 ? (
        <StepFinalAssessment
          quizTitle={quizTitle}
          setQuizTitle={setQuizTitle}
          passMark={passMark}
          setPassMark={setPassMark}
          timeLimitMinutes={timeLimitMinutes}
          setTimeLimitMinutes={setTimeLimitMinutes}
          attemptsAllowed={attemptsAllowed}
          setAttemptsAllowed={setAttemptsAllowed}
          allowEarlySubmission={allowEarlySubmission}
          setAllowEarlySubmission={setAllowEarlySubmission}
          autoSubmitOnExpire={autoSubmitOnExpire}
          setAutoSubmitOnExpire={setAutoSubmitOnExpire}
          questions={questions}
          setQuestions={setQuestions}
          bankQuestions={bankQuestions}
          assessmentResources={assessmentResources}
          assessmentFileUrl={assessmentFileUrl}
          assessmentFileName={assessmentFileName}
          assessmentFileSize={assessmentFileSize}
          assessmentUploading={assessmentUploading}
          assessmentUploadError={assessmentUploadError}
          handleFinalAssessmentFileUpload={handleFinalAssessmentFileUpload}
          removeFinalAssessmentFile={removeFinalAssessmentFile}
        />
      ) : null}

      {/* ── STEP 4: Review & Submit ── */}
      {step === 3 ? (
        <StepReviewSubmit
          title={title}
          titleAm={titleAm}
          code={code}
          category={category}
          level={level}
          description={description}
          objectives={objectives}
          department={department}
          targetAudience={targetAudience}
          prerequisites={prerequisites}
          coverPreview={coverPreview}
          modules={modules}
          quizTitle={quizTitle}
          passMark={passMark}
          timeLimitMinutes={timeLimitMinutes}
          attemptsAllowed={attemptsAllowed}
          allowEarlySubmission={allowEarlySubmission}
          autoSubmitOnExpire={autoSubmitOnExpire}
          questions={questions}
          assessmentResources={assessmentResources}
          assessmentFileUrl={assessmentFileUrl}
          assessmentFileName={assessmentFileName}
          assessmentFileSize={assessmentFileSize}
          onNavigateToStep={(targetIdx) => setStep(targetIdx)}
        />
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
            isLoading={saving}
            loadingText="Saving..."
            onClick={() => handleSave(false)}
            className="gap-1.5 shadow-xs text-xs"
          >
            <Save className="h-3.5 w-3.5" />
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
              isLoading={saving}
              loadingText="Submitting..."
              onClick={() => handleSave(true)}
              className="gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}