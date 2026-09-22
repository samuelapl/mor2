"use client";

import React from "react";
import {
  Award,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  ExternalLink,
  FileQuestion,
  FileText,
  Headphones,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  Minus,
  Plus,
  Presentation,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { Question, QuestionType, UploadedResource } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { cn } from "@/lib/utils";
import { uploadAttachment } from "@/lib/api/files";
import {
  inputClass,
  labelClass,
  uid,
  type LessonDraft,
  type ModuleDraft,
  type WizardContentType,
} from "./wizard-types";
import { CompactRichEditor, MultiFileUploader, RichEditor } from "./wizard-components";

export interface StepCurriculumProps {
  modules: ModuleDraft[];
  setModules: React.Dispatch<React.SetStateAction<ModuleDraft[]>>;
  expandedModules: Set<string>;
  setExpandedModules: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedLessons: Set<string>;
  setExpandedLessons: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedSubLessons: Set<string>;
  setExpandedSubLessons: React.Dispatch<React.SetStateAction<Set<string>>>;
  editingCourseId?: string;
}

function blankQuestion(type: QuestionType = "multiple_choice"): Question {
  return {
    id: uid("q"),
    type,
    text: "",
    options: type === "true_false" ? ["True", "False"] : ["", ""],
    correctIndex: 0,
    points: 10,
  };
}

export function StepCurriculum({
  modules,
  setModules,
  expandedModules,
  setExpandedModules,
  expandedLessons,
  setExpandedLessons,
  expandedSubLessons,
  setExpandedSubLessons,
  editingCourseId,
}: StepCurriculumProps) {
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
            const containsSub = (l.subLessons ?? []).some((s) => s.id === subLessonId);
            if (l.id !== lessonId && !containsSub) return l;
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
            const containsSub = (l.subLessons ?? []).some((s) => s.id === subLessonId);
            if (l.id !== lessonId && !containsSub) return l;
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
            const containsSub = (l.subLessons ?? []).some((s) => s.id === subLessonId);
            if (l.id !== lessonId && !containsSub) return l;
            return {
              ...l,
              subLessons: (l.subLessons ?? []).filter((s) => s.id !== subLessonId),
            };
          }),
        };
      }),
    );
  };

  const normalizeFiles = (input: File | File[] | FileList): File[] => {
    if (Array.isArray(input)) return input;
    if (input instanceof File) return [input];
    return Array.from(input);
  };

  const handleModuleFileUpload = async (files: File | File[] | FileList, moduleId: string) => {
    const fileList = normalizeFiles(files);
    if (fileList.length === 0) return;

    patchModule(moduleId, { uploading: true, uploadError: null });

    try {
      const targetMod = modules.find((m) => m.id === moduleId);
      const existingResources = [...(targetMod?.resources || targetMod?.attachments || [])];
      if (existingResources.length === 0 && targetMod?.resourceUrl) {
        existingResources.push({
          id: "legacy",
          name: targetMod.fileName || targetMod.resourceUrl.split("/").pop() || "Attached File",
          url: targetMod.resourceUrl,
          size: targetMod.fileSize || 0,
        });
      }

      const uploaded: UploadedResource[] = [];
      for (const f of fileList) {
        const res = await uploadAttachment(f, {
          moduleId,
          courseId: editingCourseId,
        });
        uploaded.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: res.fileName,
          url: res.fileUrl,
          size: res.sizeBytes,
          type: res.fileType,
        });
      }

      const combined = [...existingResources, ...uploaded];
      patchModule(moduleId, {
        uploading: false,
        resources: combined,
        attachments: combined,
        resourceUrl: combined[0]?.url || "",
        fileName: combined[0]?.name || "",
        fileSize: combined[0]?.size || 0,
        uploadError: null,
      });
    } catch (err) {
      patchModule(moduleId, {
        uploading: false,
        uploadError: err instanceof Error ? err.message : "Failed to upload module file(s)",
      });
    }
  };

  const removeModuleFile = (moduleId: string, fileIdOrUrl: string) => {
    const targetMod = modules.find((m) => m.id === moduleId);
    const existing = [...(targetMod?.resources || targetMod?.attachments || [])];
    const filtered = existing.filter((f) => f.id !== fileIdOrUrl && f.url !== fileIdOrUrl);
    patchModule(moduleId, {
      resources: filtered,
      attachments: filtered,
      resourceUrl: filtered[0]?.url || "",
      fileName: filtered[0]?.name || "",
      fileSize: filtered[0]?.size || 0,
    });
  };

  const handleLessonFileUpload = async (
    files: File | File[] | FileList,
    moduleId: string,
    targetLessonId: string,
    parentLessonId?: string,
  ) => {
    const fileList = normalizeFiles(files);
    if (fileList.length === 0) return;

    const updateTarget = (patch: Partial<LessonDraft>) => {
      if (parentLessonId) {
        patchSubLesson(moduleId, parentLessonId, targetLessonId, patch);
      } else {
        patchLesson(moduleId, targetLessonId, patch);
      }
    };

    updateTarget({ uploading: true, uploadError: null });

    try {
      const parentMod = modules.find((m) => m.id === moduleId);
      let targetLesson: LessonDraft | undefined;
      if (parentLessonId) {
        targetLesson = parentMod?.lessons
          .find((l) => l.id === parentLessonId)
          ?.subLessons?.find((s) => s.id === targetLessonId);
      } else {
        targetLesson = parentMod?.lessons.find((l) => l.id === targetLessonId);
      }

      const existingResources = [...(targetLesson?.resources || targetLesson?.attachments || [])];
      if (existingResources.length === 0 && targetLesson?.resourceUrl) {
        existingResources.push({
          id: "legacy",
          name: targetLesson.fileName || targetLesson.resourceUrl.split("/").pop() || "Attached File",
          url: targetLesson.resourceUrl,
          size: targetLesson.fileSize || 0,
        });
      }

      const uploaded: UploadedResource[] = [];
      for (const f of fileList) {
        const res = await uploadAttachment(f, {
          moduleId,
          lessonId: targetLessonId,
          courseId: editingCourseId,
        });
        uploaded.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: res.fileName,
          url: res.fileUrl,
          size: res.sizeBytes,
          type: res.fileType,
        });
      }

      const combined = [...existingResources, ...uploaded];
      updateTarget({
        uploading: false,
        resources: combined,
        attachments: combined,
        resourceUrl: combined[0]?.url || "",
        fileName: combined[0]?.name || "",
        fileSize: combined[0]?.size || 0,
        uploadError: null,
      });
    } catch (err) {
      updateTarget({
        uploading: false,
        uploadError: err instanceof Error ? err.message : "Failed to upload file(s)",
      });
    }
  };

  const removeLessonFile = (
    moduleId: string,
    targetLessonId: string,
    fileIdOrUrl: string,
    parentLessonId?: string,
  ) => {
    const parentMod = modules.find((m) => m.id === moduleId);
    let targetLesson: LessonDraft | undefined;
    if (parentLessonId) {
      targetLesson = parentMod?.lessons
        .find((l) => l.id === parentLessonId)
        ?.subLessons?.find((s) => s.id === targetLessonId);
    } else {
      targetLesson = parentMod?.lessons.find((l) => l.id === targetLessonId);
    }

    const existing = [...(targetLesson?.resources || targetLesson?.attachments || [])];
    const filtered = existing.filter((f) => f.id !== fileIdOrUrl && f.url !== fileIdOrUrl);

    const patch: Partial<LessonDraft> = {
      resources: filtered,
      attachments: filtered,
      resourceUrl: filtered[0]?.url || "",
      fileName: filtered[0]?.name || "",
      fileSize: filtered[0]?.size || 0,
    };

    if (parentLessonId) {
      patchSubLesson(moduleId, parentLessonId, targetLessonId, patch);
    } else {
      patchLesson(moduleId, targetLessonId, patch);
    }
  };

  const handleQuestionImageUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    onError: (err: string) => void,
  ) => {
    try {
      const res = await uploadAttachment(file, {
        courseId: editingCourseId,
      });
      onSuccess(res.fileUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to upload image");
    }
  };

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

  const renderContentInput = (
    lesson: LessonDraft,
    moduleId: string,
    parentLessonId?: string,
  ) => {
    const applyPatch = (val: Partial<LessonDraft>) => {
      if (parentLessonId) {
        patchSubLesson(moduleId, parentLessonId, lesson.id, val);
      } else {
        patchLesson(moduleId, lesson.id, val);
      }
    };

    if (lesson.contentType === "ASSIGNMENT") {
      const allowedTypes = lesson.assignmentFileTypes ?? ["PDF", "DOCX", "PPTX"];
      const fileOptions = [
        { id: "PDF", label: "PDF (.pdf)", icon: "📄" },
        { id: "DOCX", label: "Word (.docx, .doc)", icon: "📝" },
        { id: "PPTX", label: "PowerPoint (.pptx, .ppt)", icon: "📊" },
        { id: "TXT", label: "Text / Markdown (.txt)", icon: "📋" },
        { id: "XLSX", label: "Spreadsheet (.xlsx, .xls, .csv)", icon: "📈" },
        { id: "TEXT_ENTRY", label: "Online Rich Text Entry", icon: "✍️" },
      ];

      const toggleFileType = (typeId: string) => {
        const next = allowedTypes.includes(typeId)
          ? allowedTypes.filter((t) => t !== typeId)
          : [...allowedTypes, typeId];
        applyPatch({ assignmentFileTypes: next.length > 0 ? next : ["PDF"] });
      };

      const setAllFileTypes = () => {
        applyPatch({ assignmentFileTypes: fileOptions.map((o) => o.id) });
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
              onChange={(html) => applyPatch({ assignmentInstructions: html, content: html })}
            />
          </div>

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
                        ? "border-orange-500 bg-orange-500 text-white shadow-orange-500/20"
                        : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white",
                    )}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (lesson.contentType === "QUIZ" || lesson.contentType === "ASSESSMENT") {
      const questions = lesson.quizQuestions ?? [];
      const patchQ = (qIdx: number, patch: Partial<Question>) => {
        const next = [...questions];
        if (next[qIdx]) next[qIdx] = { ...next[qIdx], ...patch };
        applyPatch({ quizQuestions: next });
      };

      const addQ = () => {
        applyPatch({ quizQuestions: [...questions, blankQuestion()] });
      };

      const removeQ = (qIdx: number) => {
        applyPatch({ quizQuestions: questions.filter((_, i) => i !== qIdx) });
      };

      return (
        <div className="mt-3 rounded-2xl border border-indigo-200/90 bg-indigo-50/30 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <FileQuestion className="h-4 w-4 text-indigo-600" />
              {lesson.contentType === "ASSESSMENT" ? "Lesson Assessment Questions" : "Lesson Quiz Questions"}
            </span>
            <Button size="sm" variant="outline" onClick={addQ} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Question
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((q, qIdx) => (
              <div key={q.id || qIdx} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                    {qIdx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQ(qIdx)}
                    className="p-1 text-slate-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <label className={labelClass}>Question Prompt</label>
                  <CompactRichEditor
                    value={q.text}
                    placeholder="Enter question text…"
                    onChange={(html) => patchQ(qIdx, { text: html })}
                  />
                </div>

                {q.type === "multiple_choice" && (
                  <div className="space-y-2">
                    <label className={labelClass}>Options (select correct answer)</label>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`quiz-q-${lesson.id}-${qIdx}`}
                          checked={q.correctIndex === optIdx}
                          onChange={() => patchQ(qIdx, { correctIndex: optIdx })}
                          className="h-4 w-4 text-indigo-600"
                        />
                        <input
                          type="text"
                          value={opt}
                          placeholder={`Option ${optIdx + 1}`}
                          onChange={(e) => {
                            const newOpts = [...q.options];
                            newOpts[optIdx] = e.target.value;
                            patchQ(qIdx, { options: newOpts });
                          }}
                          className={inputClass}
                        />
                      </div>
                    ))}
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
                onChange={(e) => applyPatch({ resourceUrl: e.target.value })}
                className={cn(inputClass, "pl-9")}
              />
              <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
        ) : lesson.contentType === "INTERACTIVE" ? (
          <div>
            <RichTextArea
              label="Interactive Activity Instructions & Guide"
              rows={3}
              value={lesson.content}
              placeholder="Describe instructions, quiz references, or interactive prompts for learners…"
              onChange={(val) => applyPatch({ content: val })}
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
                    : "Course Document (PDF, Word DOC/DOCX, Spreadsheets, Text)"}
            </label>

            {lesson.uploadError ? (
              <p className="mt-1 text-xs text-red-600">{lesson.uploadError}</p>
            ) : null}
            <MultiFileUploader
              id={`file-${lesson.id}-${parentLessonId || "parent"}`}
              files={lesson.resources || lesson.attachments}
              legacyUrl={lesson.resourceUrl}
              legacyName={lesson.fileName}
              legacySize={lesson.fileSize}
              accept={
                lesson.contentType === "VIDEO"
                  ? "video/mp4,video/webm,video/ogg"
                  : lesson.contentType === "AUDIO"
                    ? "audio/*"
                    : lesson.contentType === "PRESENTATION"
                      ? ".ppt,.pptx,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf"
                      : ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              }
              uploading={lesson.uploading}
              uploadError={lesson.uploadError}
              theme="indigo"
              placeholderText="Upload Lesson Files (batch drag & drop supported)"
              descriptionText="Attach multiple files, lecture notes, or slides to this lesson without replacing previous uploads."
              onUpload={(files) => handleLessonFileUpload(files, moduleId, lesson.id, parentLessonId)}
              onRemove={(fileIdOrUrl) => removeLessonFile(moduleId, lesson.id, fileIdOrUrl, parentLessonId)}
            />
          </div>
        )}

        <div>
          <label className={labelClass}>Lesson Notes / Detailed Reading Content</label>
          <RichEditor
            value={lesson.content}
            placeholder="Detailed instruction text, reading guide, or reference materials…"
            onChange={(html) => applyPatch({ content: html })}
          />
        </div>
      </div>
    );
  };

  return (
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

                  {/* Module Syllabus / Resource File */}
                  <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={labelClass}>Module Syllabus & Reference Materials (Optional)</label>
                      {mod.uploading && (
                        <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading module file…
                        </span>
                      )}
                    </div>
                    {mod.uploadError && (
                      <p className="text-xs text-red-600 mt-1">{mod.uploadError}</p>
                    )}
                    <MultiFileUploader
                      id={`module-file-${mod.id}`}
                      files={mod.resources || mod.attachments}
                      legacyUrl={mod.resourceUrl}
                      legacyName={mod.fileName}
                      legacySize={mod.fileSize}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.png,.jpg,.jpeg"
                      uploading={mod.uploading}
                      uploadError={mod.uploadError}
                      theme="indigo"
                      placeholderText="Upload Module Syllabus, Overview Document, or Reference Slides"
                      descriptionText="Attach multiple syllabi, slide decks, reference manuals, or guides for this module."
                      onUpload={(files) => handleModuleFileUpload(files, mod.id)}
                      onRemove={(fileIdOrUrl) => removeModuleFile(mod.id, fileIdOrUrl)}
                    />
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
                                        {renderContentInput(sub, mod.id, lesson.id)}
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
  );
}

