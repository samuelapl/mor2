"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  FileCheck,
  FileQuestion,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  Globe,
  HelpCircle,
  Layers,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { RichTextArea } from "@/components/ui/RichTextArea";
import {
  createCourseAssessment,
  createQuestionBankItem,
  deleteQuestionBankItem,
  fetchAssessmentWithAnswers,
  fetchCourseAssessments,
  fetchQuestionBank,
  updateAssessment,
  updateQuestionBankItem,
  type AssessmentQuestionInput,
  type SaveAssessmentBody,
} from "@/lib/api/quiz";
import { fetchCourseModules } from "@/lib/api/courses";
import type { ApiModule, ApiLesson } from "@/lib/api/types";
import type { Course, QuestionType, Role } from "@/types";

export interface BankQuestion {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  question: string;
  options: string[];
  correctAnswer?: number | string | null;
  points: number;
  courseId: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  subLessonId?: string | null;
  category?: string;
  isReusable?: boolean;
  module?: { id: string; titleEn: string; titleAm: string; order: number } | null;
  lesson?: { id: string; titleEn: string; titleAm: string; order: number } | null;
  subLesson?: { id: string; titleEn: string; titleAm: string; order: number } | null;
}

export type CurriculumNodeType = "ALL" | "GLOBAL" | "COURSE_GENERAL" | "MODULE" | "LESSON" | "SUB_LESSON";

export interface ActiveCurriculumNode {
  type: CurriculumNodeType;
  id: string | null;
  title: string;
  moduleId?: string | null;
  lessonId?: string | null;
  subLessonId?: string | null;
}

function getCleanModuleTitle(title?: string | null): string {
  if (!title) return "";
  return title.replace(/^(module\s*\d+|m\d+)[\s:.-]*/i, "").trim() || title;
}

function getCleanLessonTitle(title?: string | null): string {
  if (!title) return "";
  return title
    .replace(/^lesson\s*\d+(\.\d+)?[\s:.-]*/i, "")
    .replace(/^\d+\.\d+[\s:.-]*/, "")
    .trim() || title;
}

function getCleanSubLessonTitle(title?: string | null): string {
  if (!title) return "";
  return title
    .replace(/^sub-?lesson\s*(\d+\.?)*[\s:.-]*/i, "")
    .replace(/^\d+\.\d+\.\d+[\s:.-]*/, "")
    .trim() || title;
}

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

interface QuestionBankWorkspaceProps {
  role: "trainer" | "course_owner";
}

export function QuestionBankWorkspace({ role }: QuestionBankWorkspaceProps) {
  const { courses, currentUser } = useLms();

  // All actors with question bank access can access all institutional courses by default
  const [courseFilterMode, setCourseFilterMode] = useState<"ALL" | "MY">("ALL");

  const myCourses = useMemo(() => {
    if (role === "course_owner") {
      return courses.filter(
        (c) =>
          c.ownerId === currentUser?.id ||
          ((c as any).ownerIds && (c as any).ownerIds.includes(currentUser?.id)) ||
          ((c as any).owners && (c as any).owners.some((o: any) => o.userId === currentUser?.id || o.user?.id === currentUser?.id)),
      );
    }
    // Trainer role: assigned courses
    return courses.filter(
      (c) =>
        c.trainerId === currentUser?.id ||
        ((c as any).trainerIds && (c as any).trainerIds.includes(currentUser?.id)) ||
        ((c as any).trainers && (c as any).trainers.some((t: any) => t.userId === currentUser?.id || t.user?.id === currentUser?.id)),
    );
  }, [courses, currentUser, role]);

  const relevantCourses = useMemo(() => {
    if (courseFilterMode === "MY" && myCourses.length > 0) {
      return myCourses;
    }
    // "ALL" mode: returns all courses without restriction
    return courses;
  }, [courses, myCourses, courseFilterMode]);

  const [courseSearch, setCourseSearch] = useState("");

  const filteredRelevantCourses = useMemo(() => {
    if (!courseSearch.trim()) return relevantCourses;
    const term = courseSearch.toLowerCase();
    return relevantCourses.filter(
      (c) =>
        (c.code || "").toLowerCase().includes(term) ||
        (c.title || "").toLowerCase().includes(term) ||
        (c.titleEn || "").toLowerCase().includes(term) ||
        (c.titleAm || "").toLowerCase().includes(term),
    );
  }, [relevantCourses, courseSearch]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"questions" | "quizzes">("questions");

  useEffect(() => {
    if (filteredRelevantCourses.length > 0) {
      if (!selectedCourseId || !filteredRelevantCourses.some((c) => c.id === selectedCourseId)) {
        setSelectedCourseId(filteredRelevantCourses[0].id);
      }
    }
  }, [filteredRelevantCourses, selectedCourseId]);

  const currentCourse = useMemo(
    () => relevantCourses.find((c) => c.id === selectedCourseId) ?? relevantCourses[0],
    [relevantCourses, selectedCourseId],
  );

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterScope, setFilterScope] = useState<"ALL" | "GLOBAL" | "COURSE">("ALL");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);

  const [qType, setQType] = useState<"MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER">("MULTIPLE_CHOICE");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState<string[]>(["", "", "", ""]);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qAnswerText, setQAnswerText] = useState("");
  const [qPoints, setQPoints] = useState(10);
  const [qCategory, setQCategory] = useState("General");
  const [qIsReusable, setQIsReusable] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [quizBuilderOpen, setQuizBuilderOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("Course Quiz");
  const [quizDescription, setQuizDescription] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(45);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<BankQuestion[]>([]);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizFlash, setQuizFlash] = useState<string | null>(null);

  const [courseAssessments, setCourseAssessments] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  const loadAssessments = async (cId: string) => {
    if (!cId) return;
    setLoadingAssessments(true);
    try {
      const list = await fetchCourseAssessments(cId);
      setCourseAssessments(list);
    } catch {
      setCourseAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const loadQuestions = async (cId: string) => {
    setLoadingQuestions(true);
    try {
      const items = await fetchQuestionBank({
        courseId: cId || undefined,
        includeGlobal: true,
      });
      const bank: BankQuestion[] = items.map((q) => {
        let parsedAnswer: number | string | null = q.correctAnswer;
        if (q.type !== "SHORT_ANSWER" && q.correctAnswer !== null && q.correctAnswer !== undefined) {
          const num = parseInt(q.correctAnswer, 10);
          if (!isNaN(num)) parsedAnswer = num;
        }
        return {
          id: q.id,
          type: q.type,
          question: q.question,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          correctAnswer: parsedAnswer,
          points: q.points || 10,
          courseId: q.courseId,
          moduleId: q.moduleId,
          lessonId: q.lessonId,
          subLessonId: q.subLessonId,
          category: q.category || "General",
          isReusable: !q.courseId,
          module: q.module,
          lesson: q.lesson,
          subLesson: q.subLesson,
        };
      });
      setQuestions(bank);
    } catch (err) {
      console.error("Failed to load question bank:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const [courseModules, setCourseModules] = useState<ApiModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [activeCurriculumNode, setActiveCurriculumNode] = useState<ActiveCurriculumNode>({
    type: "ALL",
    id: null,
    title: "All Course Questions",
  });
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  // Form states for target curriculum level
  const [targetLevel, setTargetLevel] = useState<"COURSE_GENERAL" | "MODULE" | "LESSON" | "SUB_LESSON" | "GLOBAL">("COURSE_GENERAL");
  const [targetModuleId, setTargetModuleId] = useState<string>("");
  const [targetLessonId, setTargetLessonId] = useState<string>("");
  const [targetSubLessonId, setTargetSubLessonId] = useState<string>("");

  const loadModules = async (cId: string) => {
    if (!cId) return;
    setLoadingModules(true);
    try {
      const mods = await fetchCourseModules(cId);
      setCourseModules(mods || []);
      if (mods && mods.length > 0) {
        setExpandedModules(new Set(mods.map((m) => m.id)));
      }
    } catch (err) {
      console.error("Failed to load course modules:", err);
      setCourseModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadQuestions(selectedCourseId);
      loadAssessments(selectedCourseId);
      loadModules(selectedCourseId);
      setActiveCurriculumNode({
        type: "ALL",
        id: null,
        title: "All Course Questions",
      });
    }
  }, [selectedCourseId]);

  const toggleModuleAccordion = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const toggleLessonAccordion = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  // Compute question counts for each node in the curriculum
  const questionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: questions.filter((q) => !q.courseId || q.courseId === selectedCourseId).length,
      global: questions.filter((q) => !q.courseId).length,
      courseGeneral: questions.filter((q) => q.courseId === selectedCourseId && !q.moduleId).length,
    };

    questions.forEach((q) => {
      if (q.courseId === selectedCourseId || !q.courseId) {
        if (q.moduleId) {
          counts[`module_${q.moduleId}`] = (counts[`module_${q.moduleId}`] || 0) + 1;
        }
        if (q.lessonId) {
          counts[`lesson_${q.lessonId}`] = (counts[`lesson_${q.lessonId}`] || 0) + 1;
        }
        if (q.subLessonId) {
          counts[`sublesson_${q.subLessonId}`] = (counts[`sublesson_${q.subLessonId}`] || 0) + 1;
        }
      }
    });

    return counts;
  }, [questions, selectedCourseId]);

  // Derived options for modal dropdowns
  const activeModule = useMemo(() => {
    return courseModules.find((m) => m.id === targetModuleId);
  }, [courseModules, targetModuleId]);

  const activeModuleLessons = useMemo(() => {
    return activeModule?.lessons || [];
  }, [activeModule]);

  const activeLesson = useMemo(() => {
    return activeModuleLessons.find((l) => l.id === targetLessonId);
  }, [activeModuleLessons, targetLessonId]);

  const activeLessonSubLessons = useMemo(() => {
    return activeLesson?.subLessons || [];
  }, [activeLesson]);

  const courseQuestions = useMemo(() => {
    return questions.filter((q) => !q.courseId || q.courseId === selectedCourseId);
  }, [questions, selectedCourseId]);

  const filteredQuestions = useMemo(() => {
    return courseQuestions.filter((q) => {
      // 1. Curriculum Node Filter
      if (activeCurriculumNode.type === "GLOBAL") {
        if (q.courseId) return false;
      } else if (activeCurriculumNode.type === "COURSE_GENERAL") {
        if (q.moduleId || !q.courseId) return false;
      } else if (activeCurriculumNode.type === "MODULE") {
        if (q.moduleId !== activeCurriculumNode.id) return false;
      } else if (activeCurriculumNode.type === "LESSON") {
        if (q.lessonId !== activeCurriculumNode.id) return false;
      } else if (activeCurriculumNode.type === "SUB_LESSON") {
        if (q.subLessonId !== activeCurriculumNode.id) return false;
      }

      // 2. Search, Type, and Scope filters
      const matchesSearch =
        !searchQuery ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some((o) => o.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.category || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "ALL" || q.type === filterType;
      const matchesScope =
        filterScope === "ALL" ||
        (filterScope === "GLOBAL" && !q.courseId) ||
        (filterScope === "COURSE" && !!q.courseId);

      return matchesSearch && matchesType && matchesScope;
    });
  }, [courseQuestions, activeCurriculumNode, searchQuery, filterType, filterScope]);

  const questionsPage = usePagination(filteredQuestions, 10);
  const assessmentsPage = usePagination(courseAssessments, 6);

  const openCreateQuestion = (node?: ActiveCurriculumNode) => {
    const target = node || activeCurriculumNode;
    setEditingQuestion(null);
    setQType("MULTIPLE_CHOICE");
    setQText("");
    setQOptions(["", "", "", ""]);
    setQCorrectIndex(0);
    setQAnswerText("");
    setQPoints(10);
    setQCategory("General");
    setSaveError(null);

    if (target.type === "GLOBAL") {
      setTargetLevel("GLOBAL");
      setQIsReusable(true);
      setTargetModuleId("");
      setTargetLessonId("");
      setTargetSubLessonId("");
    } else if (target.type === "MODULE") {
      setTargetLevel("MODULE");
      setQIsReusable(false);
      setTargetModuleId(target.moduleId || target.id || "");
      setTargetLessonId("");
      setTargetSubLessonId("");
    } else if (target.type === "LESSON") {
      setTargetLevel("LESSON");
      setQIsReusable(false);
      setTargetModuleId(target.moduleId || "");
      setTargetLessonId(target.lessonId || target.id || "");
      setTargetSubLessonId("");
    } else if (target.type === "SUB_LESSON") {
      setTargetLevel("SUB_LESSON");
      setQIsReusable(false);
      setTargetModuleId(target.moduleId || "");
      setTargetLessonId(target.lessonId || "");
      setTargetSubLessonId(target.subLessonId || target.id || "");
    } else {
      setTargetLevel("COURSE_GENERAL");
      setQIsReusable(false);
      setTargetModuleId("");
      setTargetLessonId("");
      setTargetSubLessonId("");
    }

    setEditorOpen(true);
  };

  const openEditQuestion = (q: BankQuestion) => {
    setEditingQuestion(q);
    setQType(q.type);
    setQText(q.question);
    setQOptions(q.options.length > 0 ? q.options : ["", "", "", ""]);
    setQCorrectIndex(typeof q.correctAnswer === "number" ? q.correctAnswer : 0);
    setQAnswerText(typeof q.correctAnswer === "string" ? q.correctAnswer : "");
    setQPoints(q.points || 10);
    setQCategory(q.category || "General");
    setQIsReusable(!q.courseId);
    setSaveError(null);

    if (!q.courseId) {
      setTargetLevel("GLOBAL");
      setTargetModuleId("");
      setTargetLessonId("");
      setTargetSubLessonId("");
    } else if (q.subLessonId) {
      setTargetLevel("SUB_LESSON");
      setTargetModuleId(q.moduleId || "");
      setTargetLessonId(q.lessonId || "");
      setTargetSubLessonId(q.subLessonId);
    } else if (q.lessonId) {
      setTargetLevel("LESSON");
      setTargetModuleId(q.moduleId || "");
      setTargetLessonId(q.lessonId);
      setTargetSubLessonId("");
    } else if (q.moduleId) {
      setTargetLevel("MODULE");
      setTargetModuleId(q.moduleId);
      setTargetLessonId("");
      setTargetSubLessonId("");
    } else {
      setTargetLevel("COURSE_GENERAL");
      setTargetModuleId("");
      setTargetLessonId("");
      setTargetSubLessonId("");
    }

    setEditorOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) return;

    setSavingQuestion(true);
    setSaveError(null);

    const options =
      qType === "TRUE_FALSE"
        ? ["True", "False"]
        : qType === "SHORT_ANSWER"
        ? []
        : qOptions.filter((o) => o.trim() !== "");

    let correctAnswerStr: string | null = null;
    if (qType === "SHORT_ANSWER") {
      correctAnswerStr = qAnswerText.trim() ? qAnswerText.trim() : null;
    } else {
      correctAnswerStr = String(qCorrectIndex);
    }

    const isGlobal = targetLevel === "GLOBAL" || qIsReusable;
    const finalModuleId =
      !isGlobal && (targetLevel === "MODULE" || targetLevel === "LESSON" || targetLevel === "SUB_LESSON")
        ? targetModuleId || null
        : null;
    const finalLessonId =
      !isGlobal && (targetLevel === "LESSON" || targetLevel === "SUB_LESSON")
        ? targetLessonId || null
        : null;
    const finalSubLessonId =
      !isGlobal && targetLevel === "SUB_LESSON" ? targetSubLessonId || null : null;

    const payload = {
      courseId: isGlobal ? null : selectedCourseId,
      moduleId: finalModuleId,
      lessonId: finalLessonId,
      subLessonId: finalSubLessonId,
      type: qType,
      question: qText.trim(),
      options,
      correctAnswer: correctAnswerStr,
      points: qPoints,
      category: qCategory.trim() || "General",
    };

    try {
      if (editingQuestion) {
        const updated = await updateQuestionBankItem(editingQuestion.id, payload);
        let parsedAnswer: number | string | null = updated.correctAnswer;
        if (updated.type !== "SHORT_ANSWER" && updated.correctAnswer !== null) {
          const num = parseInt(updated.correctAnswer, 10);
          if (!isNaN(num)) parsedAnswer = num;
        }
        const mapped: BankQuestion = {
          id: updated.id,
          type: updated.type,
          question: updated.question,
          options: Array.isArray(updated.options) ? (updated.options as string[]) : [],
          correctAnswer: parsedAnswer,
          points: updated.points,
          courseId: updated.courseId,
          moduleId: updated.moduleId,
          lessonId: updated.lessonId,
          subLessonId: updated.subLessonId,
          category: updated.category,
          isReusable: !updated.courseId,
          module: updated.module,
          lesson: updated.lesson,
          subLesson: updated.subLesson,
        };
        setQuestions((prev) => prev.map((item) => (item.id === editingQuestion.id ? mapped : item)));
      } else {
        const created = await createQuestionBankItem(payload);
        let parsedAnswer: number | string | null = created.correctAnswer;
        if (created.type !== "SHORT_ANSWER" && created.correctAnswer !== null) {
          const num = parseInt(created.correctAnswer, 10);
          if (!isNaN(num)) parsedAnswer = num;
        }
        const mapped: BankQuestion = {
          id: created.id,
          type: created.type,
          question: created.question,
          options: Array.isArray(created.options) ? (created.options as string[]) : [],
          correctAnswer: parsedAnswer,
          points: created.points,
          courseId: created.courseId,
          moduleId: created.moduleId,
          lessonId: created.lessonId,
          subLessonId: created.subLessonId,
          category: created.category,
          isReusable: !created.courseId,
          module: created.module,
          lesson: created.lesson,
          subLesson: created.subLesson,
        };
        setQuestions((prev) => [mapped, ...prev]);
      }
      setEditorOpen(false);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save question to bank");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestionBankItem(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setSelectedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  };

  const handleDuplicateQuestion = async (q: BankQuestion) => {
    try {
      const created = await createQuestionBankItem({
        courseId: q.courseId,
        moduleId: q.moduleId,
        lessonId: q.lessonId,
        subLessonId: q.subLessonId,
        type: q.type,
        question: `${q.question} (Copy)`,
        options: q.options,
        correctAnswer: q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer) : null,
        points: q.points,
        category: q.category,
      });
      let parsedAnswer: number | string | null = created.correctAnswer;
      if (created.type !== "SHORT_ANSWER" && created.correctAnswer !== null) {
        const num = parseInt(created.correctAnswer, 10);
        if (!isNaN(num)) parsedAnswer = num;
      }
      const mapped: BankQuestion = {
        id: created.id,
        type: created.type,
        question: created.question,
        options: Array.isArray(created.options) ? (created.options as string[]) : [],
        correctAnswer: parsedAnswer,
        points: created.points,
        courseId: created.courseId,
        moduleId: created.moduleId,
        lessonId: created.lessonId,
        subLessonId: created.subLessonId,
        category: created.category,
        isReusable: !created.courseId,
        module: created.module,
        lesson: created.lesson,
        subLesson: created.subLesson,
      };
      setQuestions((prev) => [mapped, ...prev]);
    } catch (err) {
      console.error("Failed to duplicate question:", err);
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const openQuizBuilderWithSelected = () => {
    const selected = courseQuestions.filter((q) => selectedQuestionIds.has(q.id));
    setQuizQuestions(selected.length > 0 ? selected : courseQuestions.slice(0, 5));
    setQuizTitle(`${currentCourse?.title || "Course"} Quiz`);
    setQuizDescription("Answer all questions to demonstrate your mastery of this training material.");
    setPassingScore(70);
    setMaxAttempts(3);
    setTimeLimitMinutes(30);
    setShuffleQuestions(false);
    setQuizFlash(null);
    setQuizBuilderOpen(true);
  };

  const handleSaveQuiz = async () => {
    if (!selectedCourseId || quizQuestions.length === 0) return;
    setSavingQuiz(true);
    setQuizFlash(null);

    try {
      const questionsPayload: AssessmentQuestionInput[] = quizQuestions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer ?? 0,
        points: q.points,
      }));

      const body: SaveAssessmentBody = {
        titleEn: quizTitle,
        titleAm: quizTitle,
        descriptionEn: quizDescription,
        descriptionAm: quizDescription,
        passingScore,
        maxAttempts,
        timeLimitMinutes,
        shuffleQuestions,
        questions: questionsPayload,
      };

      await createCourseAssessment(selectedCourseId, body);
      setQuizFlash("Quiz successfully saved and published for learners!");
      await loadAssessments(selectedCourseId);

      setTimeout(() => {
        setQuizBuilderOpen(false);
        setActiveTab("quizzes");
      }, 1200);
    } catch (err: any) {
      setQuizFlash(`Error saving quiz: ${err?.message || "Please verify quiz settings."}`);
    } finally {
      setSavingQuiz(false);
    }
  };

  const moveQuizQuestion = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= quizQuestions.length) return;
    setQuizQuestions((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const removeQuizQuestion = (index: number) => {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <PageShell
      role={role}
      title="Question Bank & Quiz Builder"
      description="Create reusable question repositories, organize questions by topic, and assemble quizzes in a dedicated full-screen workspace."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadAssessments(selectedCourseId)}
            disabled={loadingAssessments}
          >
            <RefreshCw className={`h-4 w-4 ${loadingAssessments ? "animate-spin" : ""}`} />
            Sync Bank
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={openQuizBuilderWithSelected}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <FileQuestion className="h-4 w-4" />
            Assemble Quiz ({selectedQuestionIds.size > 0 ? selectedQuestionIds.size : "All"})
          </Button>
        </div>
      }
    >
      {/* Course Filter Bar with Search */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[320px]">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Active Course:</span>
          </div>

          {/* Search bar to find & switch course */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder="Search course by code or title..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition"
            />
            {courseSearch && (
              <button
                type="button"
                onClick={() => setCourseSearch("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Course select dropdown populated with filtered relevant courses */}
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 max-w-xs truncate"
          >
            {filteredRelevantCourses.length === 0 ? (
              <option value="" disabled>
                No matching courses found
              </option>
            ) : (
              filteredRelevantCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title || c.titleEn}
                </option>
              ))
            )}
          </select>

          {/* Quick Scope Filter: All Courses vs My Assigned/Owned Courses */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/80 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setCourseFilterMode("ALL")}
              className={`px-2.5 py-1 rounded-lg transition ${
                courseFilterMode === "ALL"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Browse Question Banks across all institutional courses"
            >
              All Courses ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setCourseFilterMode("MY")}
              className={`px-2.5 py-1 rounded-lg transition ${
                courseFilterMode === "MY"
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title={`Show only courses where you are assigned as ${role === "course_owner" ? "Owner" : "Trainer"}`}
            >
              {role === "course_owner" ? "My Created" : "My Assigned"} ({myCourses.length})
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "questions"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Questions ({courseQuestions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("quizzes")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "quizzes"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Published Quizzes ({courseAssessments.length})
          </button>
        </div>
      </div>

      {activeTab === "questions" ? (
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Column: Course Curriculum Hierarchy Navigator */}
          <div className="w-full lg:w-96 xl:w-[410px] shrink-0 space-y-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Curriculum Content
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {courseModules.length} Modules
                </span>
              </div>

              {/* Scope/Root Buttons */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveCurriculumNode({ type: "ALL", id: null, title: "All Course Questions" })}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeCurriculumNode.type === "ALL"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <ListChecks className="h-3.5 w-3.5 shrink-0" />
                    All Questions
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeCurriculumNode.type === "ALL" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {questionCounts.all || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCurriculumNode({ type: "COURSE_GENERAL", id: null, title: "Course-Level (General)" })}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeCurriculumNode.type === "COURSE_GENERAL"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    Course Level (General)
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeCurriculumNode.type === "COURSE_GENERAL" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {questionCounts.courseGeneral || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCurriculumNode({ type: "GLOBAL", id: null, title: "Reusable Global Questions" })}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeCurriculumNode.type === "GLOBAL"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    Reusable Global
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeCurriculumNode.type === "GLOBAL" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {questionCounts.global || 0}
                  </span>
                </button>
              </div>

              {/* Modules, Lessons & Sub-lessons Tree */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Modules & Lessons</span>
                  <span>Questions</span>
                </div>

                {loadingModules ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading curriculum…</div>
                ) : courseModules.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                    No curriculum modules found.
                  </div>
                ) : (
                  <div className="max-h-[540px] overflow-y-auto space-y-1.5 pr-1">
                    {courseModules.map((mod, modIdx) => {
                      const isModActive = activeCurriculumNode.type === "MODULE" && activeCurriculumNode.id === mod.id;
                      const isExpanded = expandedModules.has(mod.id);
                      const modCount = questionCounts[`module_${mod.id}`] || 0;
                      const cleanModuleTitle = getCleanModuleTitle(mod.titleEn);

                      return (
                        <div key={mod.id} className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                          {/* Module Header */}
                          <div
                            className={`group flex items-center justify-between p-2 text-xs transition-colors cursor-pointer ${
                              isModActive
                                ? "bg-indigo-50/90 text-indigo-950 font-bold ring-1 ring-indigo-200"
                                : "hover:bg-slate-50 text-slate-800"
                            }`}
                          >
                            <div
                              className="flex items-center gap-2 flex-1 min-w-0"
                              onClick={() => setActiveCurriculumNode({
                                type: "MODULE",
                                id: mod.id,
                                title: `Module ${modIdx + 1}: ${cleanModuleTitle}`,
                                moduleId: mod.id,
                              })}
                              title={`Module ${modIdx + 1}: ${cleanModuleTitle}`}
                            >
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight shrink-0 ${
                                  isModActive
                                    ? "bg-indigo-600 text-white"
                                    : "bg-indigo-100/80 text-indigo-800 border border-indigo-200/60"
                                }`}
                              >
                                M{modIdx + 1}
                              </span>
                              <span className="truncate font-semibold text-slate-900 text-xs">
                                {cleanModuleTitle}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span
                                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                                  isModActive
                                    ? "bg-indigo-200/70 text-indigo-900 border-indigo-300"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                                title={`${modCount} questions attached to this module`}
                              >
                                {modCount}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCreateQuestion({
                                    type: "MODULE",
                                    id: mod.id,
                                    title: `Module ${modIdx + 1}: ${cleanModuleTitle}`,
                                    moduleId: mod.id,
                                  });
                                }}
                                title="Add question for this module"
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              {mod.lessons && mod.lessons.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleModuleAccordion(mod.id);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition"
                                  title={isExpanded ? "Collapse lessons" : "Expand lessons"}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Lessons */}
                          {isExpanded && mod.lessons && mod.lessons.length > 0 && (
                            <div className="pl-3 pr-1 py-1.5 space-y-1 bg-slate-50/50 border-t border-slate-100">
                              {mod.lessons.map((les, lesIdx) => {
                                const isLesActive = activeCurriculumNode.type === "LESSON" && activeCurriculumNode.id === les.id;
                                const isLesExpanded = expandedLessons.has(les.id);
                                const lesCount = questionCounts[`lesson_${les.id}`] || 0;
                                const cleanLessonTitle = getCleanLessonTitle(les.titleEn);

                                return (
                                  <div
                                    key={les.id}
                                    className={`rounded-lg border transition-all ${
                                      isLesActive
                                        ? "bg-white border-indigo-300 ring-1 ring-indigo-200 shadow-2xs"
                                        : "bg-white/90 border-slate-200/70 hover:border-slate-300"
                                    }`}
                                  >
                                    <div
                                      className={`flex items-center justify-between p-2 text-xs transition cursor-pointer ${
                                        isLesActive ? "text-indigo-950 font-bold" : "hover:bg-slate-50/70"
                                      }`}
                                    >
                                      <div
                                        className="flex items-center gap-2 flex-1 min-w-0"
                                        onClick={() => setActiveCurriculumNode({
                                          type: "LESSON",
                                          id: les.id,
                                          title: `Lesson ${modIdx + 1}.${lesIdx + 1}: ${cleanLessonTitle}`,
                                          moduleId: mod.id,
                                          lessonId: les.id,
                                        })}
                                        title={`Lesson ${modIdx + 1}.${lesIdx + 1}: ${cleanLessonTitle}`}
                                      >
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                                            isLesActive
                                              ? "bg-indigo-100 text-indigo-800"
                                              : "bg-slate-100 text-slate-600 border border-slate-200/60"
                                          }`}
                                        >
                                          {modIdx + 1}.{lesIdx + 1}
                                        </span>
                                        <span className="truncate text-slate-800 text-xs font-medium">
                                          {cleanLessonTitle}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200/70">
                                          {lesCount}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCreateQuestion({
                                              type: "LESSON",
                                              id: les.id,
                                              title: `Lesson ${modIdx + 1}.${lesIdx + 1}: ${cleanLessonTitle}`,
                                              moduleId: mod.id,
                                              lessonId: les.id,
                                            });
                                          }}
                                          title="Add question for this lesson"
                                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                        {les.subLessons && les.subLessons.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleLessonAccordion(les.id);
                                            }}
                                            className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                                            title={isLesExpanded ? "Collapse sub-lessons" : "Expand sub-lessons"}
                                          >
                                            {isLesExpanded ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Sub-lessons */}
                                    {isLesExpanded && les.subLessons && les.subLessons.length > 0 && (
                                      <div className="pl-4 pr-1.5 py-1 space-y-1 bg-slate-50/80 border-t border-slate-100">
                                        {les.subLessons.map((sub, subIdx) => {
                                          const isSubActive = activeCurriculumNode.type === "SUB_LESSON" && activeCurriculumNode.id === sub.id;
                                          const subCount = questionCounts[`sublesson_${sub.id}`] || 0;
                                          const cleanSubTitle = getCleanSubLessonTitle(sub.titleEn);

                                          return (
                                            <div
                                              key={sub.id}
                                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                                                isSubActive
                                                  ? "bg-indigo-100 text-indigo-950 font-bold border border-indigo-200 shadow-2xs"
                                                  : "hover:bg-white text-slate-600 border border-transparent hover:border-slate-200/60"
                                              }`}
                                              onClick={() => setActiveCurriculumNode({
                                                type: "SUB_LESSON",
                                                id: sub.id,
                                                title: `Sub-lesson ${modIdx + 1}.${lesIdx + 1}.${subIdx + 1}: ${cleanSubTitle}`,
                                                moduleId: mod.id,
                                                lessonId: les.id,
                                                subLessonId: sub.id,
                                              })}
                                              title={`Sub-lesson ${modIdx + 1}.${lesIdx + 1}.${subIdx + 1}: ${cleanSubTitle}`}
                                            >
                                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                <span className="text-slate-400 font-mono text-[10px] shrink-0">↳</span>
                                                <span className="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-white text-slate-500 border border-slate-200 shrink-0">
                                                  {modIdx + 1}.{lesIdx + 1}.{subIdx + 1}
                                                </span>
                                                <span className="truncate text-[11px] font-normal leading-tight text-slate-700 flex-1 min-w-0">
                                                  {cleanSubTitle}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500">
                                                  {subCount}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openCreateQuestion({
                                                      type: "SUB_LESSON",
                                                      id: sub.id,
                                                      title: `Sub-lesson ${modIdx + 1}.${lesIdx + 1}.${subIdx + 1}: ${cleanSubTitle}`,
                                                      moduleId: mod.id,
                                                      lessonId: les.id,
                                                      subLessonId: sub.id,
                                                    });
                                                  }}
                                                  title="Add question for this sub-lesson"
                                                  className="p-0.5 rounded text-slate-400 hover:text-indigo-600 transition"
                                                >
                                                  <Plus className="h-2.5 w-2.5" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Question Content Area */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            {/* Active Node Context Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>Filtered Curriculum Content:</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {activeCurriculumNode.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => openCreateQuestion(activeCurriculumNode)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Question Here
                </Button>
              </div>
            </div>

            {/* Search, Filter & Bulk Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search questions or answer options…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="ALL">All Question Types</option>
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>

                <select
                  value={filterScope}
                  onChange={(e) => setFilterScope(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="ALL">All Scopes (Course & Reusable)</option>
                  <option value="COURSE">Course-specific Only</option>
                  <option value="GLOBAL">Reusable (Across Courses)</option>
                </select>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadQuestions(selectedCourseId)}
                  disabled={loadingQuestions}
                  title="Refresh Question Bank"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loadingQuestions ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleSelectAll}
                  className="text-xs"
                >
                  {selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0
                    ? "Deselect All"
                    : `Select All (${filteredQuestions.length})`}
                </Button>
              </div>
            </div>

            {/* Question List */}
            {loadingQuestions ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                <FileQuestion className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-sm font-semibold text-slate-800">
                  No questions prepared yet for this content item
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Click &quot;Add Question&quot; to prepare targeted questions for this specific module, lesson, or course so trainers can import or randomly generate them during live classes.
                </p>
                <Button size="sm" onClick={() => openCreateQuestion(activeCurriculumNode)} className="mt-4">
                  <Plus className="h-4 w-4" /> Add Question to {activeCurriculumNode.title}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questionsPage.pageItems.map((q, idx) => {
                  const isSelected = selectedQuestionIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-150 p-5 ${
                        isSelected
                          ? "border-indigo-400 bg-indigo-50/20 shadow-sm ring-2 ring-indigo-500/10"
                          : "border-slate-200/90 bg-white hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectQuestion(q.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-400">
                                #{(questionsPage.page - 1) * 10 + idx + 1}
                              </span>
                              <Badge variant={q.type === "MULTIPLE_CHOICE" ? "blue" : q.type === "TRUE_FALSE" ? "green" : "amber"}>
                                {q.type.replace("_", " ")}
                              </Badge>
                              {!q.courseId ? (
                                <Badge variant="indigo">Reusable Global</Badge>
                              ) : q.subLesson ? (
                                <Badge variant="amber" className="gap-1">
                                  <Bookmark className="h-3 w-3" />
                                  Sub-lesson: {q.subLesson.titleEn}
                                </Badge>
                              ) : q.lesson ? (
                                <Badge variant="slate" className="gap-1">
                                  <FileText className="h-3 w-3" />
                                  Lesson: {q.lesson.titleEn}
                                </Badge>
                              ) : q.module ? (
                                <Badge variant="indigo" className="gap-1">
                                  <Folder className="h-3 w-3" />
                                  Module: {q.module.titleEn}
                                </Badge>
                              ) : (
                                <Badge variant="slate">Course General</Badge>
                              )}
                              <span className="text-xs font-semibold text-slate-500">
                                {q.points} pts
                              </span>
                              {q.category && (
                                <span className="text-xs text-slate-400">· {q.category}</span>
                              )}
                            </div>

                            <h4 className="mt-2 text-sm font-bold text-slate-900 leading-relaxed">
                              {q.question}
                            </h4>

                            {/* Options breakdown */}
                            {q.type === "MULTIPLE_CHOICE" && q.options.length > 0 && (
                              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                                {q.options.map((opt, optIdx) => {
                                  const isCorrect = q.correctAnswer === optIdx;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium ${
                                        isCorrect
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                                          : "bg-slate-50 text-slate-600 border border-slate-100"
                                      }`}
                                    >
                                      <span
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                                          isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span className="truncate">{opt}</span>
                                      {isCorrect && (
                                        <Check className="ml-auto h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === "TRUE_FALSE" && (
                              <div className="mt-2 flex items-center gap-3 text-xs">
                                <span
                                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                                    q.correctAnswer === 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  True {q.correctAnswer === 0 ? "✓ (Correct)" : ""}
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                                    q.correctAnswer === 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  False {q.correctAnswer === 1 ? "✓ (Correct)" : ""}
                                </span>
                              </div>
                            )}

                            {q.type === "SHORT_ANSWER" && (
                              <div className="mt-2 text-xs">
                                {q.correctAnswer ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    Accepted: &quot;{q.correctAnswer}&quot;
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                                    Open-ended / Manually graded (no fixed answer)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicateQuestion(q)}
                            title="Duplicate Question"
                          >
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditQuestion(q)}
                            title="Edit Question"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Delete Question"
                            className="hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Pagination
              page={questionsPage.page}
              totalPages={questionsPage.totalPages}
              onPageChange={questionsPage.setPage}
            />
          </div>
        </div>
      ) : (
        /* Published Quizzes View */
        <div className="space-y-4">
          {courseAssessments.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Award className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-800">No quizzes assembled yet</h3>
              <p className="mt-1 text-xs text-slate-500">
                Select questions from the Question Bank and click &quot;Assemble Quiz&quot; to publish an assessment.
              </p>
              <Button size="sm" onClick={openQuizBuilderWithSelected} className="mt-4">
                <FileQuestion className="h-4 w-4" /> Assemble Quiz
              </Button>
            </div>
          ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assessmentsPage.pageItems.map((asm) => (
                <div
                  key={asm.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="blue">Passing: {asm.passingScore}%</Badge>
                    <span className="text-xs text-slate-400">
                      {asm.questionsCount || (asm.questions ? asm.questions.length : "Multi")} questions
                    </span>
                  </div>

                  <h4 className="font-display text-sm font-bold text-slate-900 line-clamp-1">
                    {asm.titleEn}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {asm.descriptionEn || "No description provided."}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {asm.timeLimitMinutes ? `${asm.timeLimitMinutes} min` : "No limit"}
                    </span>
                    <span>Max {asm.maxAttempts} attempts</span>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={assessmentsPage.page}
              totalPages={assessmentsPage.totalPages}
              onPageChange={assessmentsPage.setPage}
            />
            </>
          )}
        </div>
      )}

      {/* FULL-SCREEN QUESTION EDITOR OVERLAY */}
      {editorOpen && (
        <WorkspaceDetailOverlay
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          title={editingQuestion ? "Edit Question" : "Add Question to Bank"}
          subtitle={
            qIsReusable
              ? "Global Question Bank (Reusable across all courses)"
              : `Assign to ${currentCourse?.title || "Course"} Question Bank`
          }
        >
          <div className="w-full py-4">
            <form onSubmit={handleSaveQuestion} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
              {/* Reusable Toggle */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qIsReusable}
                    onChange={(e) => setQIsReusable(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Reusable across courses (Save as Global Question)
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6.5">
                  {qIsReusable
                    ? "✓ This question will be available to all courses and can be imported or used in any quiz."
                    : `This question is linked specifically to: ${currentCourse?.title || "Active Course"}.`}
                </p>
              </div>

              {/* Target Curriculum Content Selector */}
              {!qIsReusable && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      Target Curriculum Level
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Map question to Module, Lesson, or Sub-lesson
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">Level</label>
                      <select
                        value={targetLevel}
                        onChange={(e) => {
                          const lvl = e.target.value as any;
                          setTargetLevel(lvl);
                          if (lvl === "COURSE_GENERAL") {
                            setTargetModuleId("");
                            setTargetLessonId("");
                            setTargetSubLessonId("");
                          } else if (lvl === "MODULE") {
                            if (!targetModuleId && courseModules.length > 0) {
                              setTargetModuleId(courseModules[0].id);
                            }
                            setTargetLessonId("");
                            setTargetSubLessonId("");
                          } else if (lvl === "LESSON") {
                            if (!targetModuleId && courseModules.length > 0) {
                              setTargetModuleId(courseModules[0].id);
                            }
                            setTargetSubLessonId("");
                          }
                        }}
                        className={inputClass}
                      >
                        <option value="COURSE_GENERAL">Course Level (General)</option>
                        <option value="MODULE">Specific Module</option>
                        <option value="LESSON">Specific Lesson</option>
                        <option value="SUB_LESSON">Specific Sub-lesson</option>
                      </select>
                    </div>

                    {targetLevel !== "COURSE_GENERAL" && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Module</label>
                        <select
                          value={targetModuleId}
                          onChange={(e) => {
                            setTargetModuleId(e.target.value);
                            setTargetLessonId("");
                            setTargetSubLessonId("");
                          }}
                          className={inputClass}
                        >
                          <option value="">Select a Module…</option>
                          {courseModules.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.titleEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(targetLevel === "LESSON" || targetLevel === "SUB_LESSON") && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Lesson</label>
                        <select
                          value={targetLessonId}
                          onChange={(e) => {
                            setTargetLessonId(e.target.value);
                            setTargetSubLessonId("");
                          }}
                          className={inputClass}
                        >
                          <option value="">Select a Lesson…</option>
                          {activeModuleLessons.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.titleEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {targetLevel === "SUB_LESSON" && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Sub-lesson</label>
                        <select
                          value={targetSubLessonId}
                          onChange={(e) => setTargetSubLessonId(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select a Sub-lesson…</option>
                          {activeLessonSubLessons.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.titleEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Question Type</label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as any)}
                    className={inputClass}
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice (Single Answer)</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Points / Marks</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={qPoints}
                    onChange={(e) => setQPoints(parseInt(e.target.value) || 10)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <RichTextArea
                  label="Question Prompt"
                  required
                  placeholder="Type your interactive question statement, code snippet, or scenario…"
                  value={qText}
                  onChange={(val) => setQText(val)}
                  compact
                  rows={3}
                />
              </div>

              {/* Options based on type */}
              {qType === "MULTIPLE_CHOICE" && (
                <div className="space-y-3">
                  <label className={labelClass}>
                    Answer Choices (Select the radio button for the correct option)
                  </label>
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctAnswerOption"
                        checked={qCorrectIndex === idx}
                        onChange={() => setQCorrectIndex(idx)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-500 w-5">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text…`}
                        value={opt}
                        onChange={(e) => {
                          const next = [...qOptions];
                          next[idx] = e.target.value;
                          setQOptions(next);
                        }}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              )}

              {qType === "TRUE_FALSE" && (
                <div className="space-y-2">
                  <label className={labelClass}>Correct Answer</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="tfAnswer"
                        checked={qCorrectIndex === 0}
                        onChange={() => setQCorrectIndex(0)}
                        className="h-4 w-4 text-indigo-600"
                      />
                      True
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                      <input
                        type="radio"
                        name="tfAnswer"
                        checked={qCorrectIndex === 1}
                        onChange={() => setQCorrectIndex(1)}
                        className="h-4 w-4 text-indigo-600"
                      />
                      False
                    </label>
                  </div>
                </div>
              )}

              {qType === "SHORT_ANSWER" && (
                <div>
                  <label className={labelClass}>Accepted Answer Text (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave empty for open-ended / manually-graded questions"
                    value={qAnswerText}
                    onChange={(e) => setQAnswerText(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    If provided, student answers will be automatically checked against this value. If left blank, questions are treated as open-ended.
                  </p>
                </div>
              )}

              {saveError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  {saveError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" type="button" onClick={() => setEditorOpen(false)} disabled={savingQuestion}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingQuestion}>
                  {savingQuestion ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingQuestion ? (
                    "Update Question"
                  ) : (
                    "Save to Bank"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </WorkspaceDetailOverlay>
      )}

      {/* FULL-SCREEN QUIZ BUILDER WORKSPACE OVERLAY */}
      {quizBuilderOpen && (
        <WorkspaceDetailOverlay
          open={quizBuilderOpen}
          onClose={() => setQuizBuilderOpen(false)}
          title={`Quiz Builder: ${quizTitle}`}
          subtitle={`Configuring assessment for ${currentCourse?.title || "Course"} (${quizQuestions.length} Questions)`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuizBuilderOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveQuiz}
                disabled={savingQuiz || quizQuestions.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingQuiz ? "Publishing…" : "Save & Publish Quiz"}
              </Button>
            </div>
          }
        >
          <div className="w-full py-4 space-y-6 pb-12">
            {quizFlash && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {quizFlash}
              </div>
            )}

            {/* Quiz Configuration Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-600" />
                Assessment Settings & Rules
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Quiz Title *</label>
                  <input
                    type="text"
                    required
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Passing Score (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <RichTextArea
                  label="Instructions for Learners"
                  placeholder="Type instructions, guidelines, or passing criteria for learners…"
                  value={quizDescription}
                  onChange={(val) => setQuizDescription(val)}
                  compact
                  rows={2}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Max Attempts</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 3)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Time Limit (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 45)}
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Shuffle questions on attempt
                  </label>
                </div>
              </div>
            </div>

            {/* Assembled Questions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-indigo-600" />
                    Quiz Questions ({quizQuestions.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total Marks: {quizQuestions.reduce((s, q) => s + (q.points || 10), 0)} pts
                  </p>
                </div>
              </div>

              {quizQuestions.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                  No questions in this quiz. Select questions from the Question Bank.
                </div>
              ) : (
                <div className="space-y-3">
                  {quizQuestions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-700">
                          {qIdx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{q.question}</p>
                          <p className="text-[11px] text-slate-400">
                            {q.type} · {q.points || 10} pts · {q.options.length} choices
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveQuizQuestion(qIdx, -1)}
                          disabled={qIdx === 0}
                          className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuizQuestion(qIdx, 1)}
                          disabled={qIdx === quizQuestions.length - 1}
                          className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuizQuestion(qIdx)}
                          className="rounded p-1 text-slate-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </WorkspaceDetailOverlay>
      )}
    </PageShell>
  );
}
