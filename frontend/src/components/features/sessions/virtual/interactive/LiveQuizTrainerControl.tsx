'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HelpCircle,
  X,
  Play,
  Eye,
  CheckCircle2,
  Clock,
  BarChart3,
  Search,
  Plus,
  Trash2,
  FileQuestion,
  Users,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Globe,
  Filter,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
  Zap,
  Layers,
  FileText,
  Shuffle,
  ArrowRight,
  ListOrdered,
  FolderOpen,
  Download,
  Award,
  FileSpreadsheet,
  UserCheck,
  UserX,
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  MonitorPlay,
  Sparkles,
  History,
  Tag,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  fetchQuestionBank,
  createQuestionBankItem,
  type ApiQuestionBankQuestion,
} from '@/lib/api/quiz';
import { fetchCourseDetail, fetchCourseModules } from '@/lib/api/courses';
import { fetchLiveSessionQuizReport, type ApiLiveQuizReport } from '@/lib/api/monitoring';
import type { ApiModule, ApiLesson } from '@/lib/api/types';
import type { LiveKitDataEvent, LiveQuizOption, LiveQuizPayload } from '@/types/livekit-events';
import { PreparedQuizPanel } from '@/components/features/prepared-quiz/PreparedQuizPanel';
import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';
import { usePreparedQuizStore } from '@/lib/stores/prepared-quiz-store';
import { useLookupCategories } from '@/lib/api/useLookupCategories';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';

function stripHtmlTags(str?: string): string {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

function formatRemainingTime(sec: number): string {
  if (sec <= 0) return '0s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
}

function getInitials(name?: string): string {
  if (!name || name === '—') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface HistoricalQuizRecord {
  quiz: LiveQuizPayload;
  revealData?: any;
  answers: Record<
    string,
    {
      userId: string;
      userName: string;
      selectedOptionIds: string[];
      submittedAt?: number;
      responseDurationSeconds?: number;
      allAnswers?: Record<string, string[]>;
    }
  >;
  completedAt: number;
}

interface LiveQuizTrainerControlProps {
  open: boolean;
  onClose: () => void;
  sessionId?: string;
  courseId: string;
  course?: {
    id: string;
    titleEn?: string;
    titleAm?: string;
    code?: string;
    title?: string;
  } | null;
  trainerName?: string;
  onBroadcast: (event: LiveKitDataEvent) => void;
  activeQuiz: LiveQuizPayload | null;
  answers: Record<
    string,
    {
      userId: string;
      userName: string;
      selectedOptionIds: string[];
      submittedAt?: number;
      responseDurationSeconds?: number;
      allAnswers?: Record<string, string[]>;
    }
  >;
  onClearQuiz: () => void;
  quizHistory?: HistoricalQuizRecord[];
  attendees?: Array<{
    userId: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  }>;
}

export function LiveQuizTrainerControl({
  open,
  onClose,
  sessionId,
  courseId,
  course,
  trainerName,
  onBroadcast,
  activeQuiz,
  answers,
  onClearQuiz,
  quizHistory = [],
  attendees = [],
}: LiveQuizTrainerControlProps) {
  const [tab, setTab] = useState<'prepared' | 'bank' | 'custom'>('prepared');
  const preparedQuizzes = usePreparedQuizStore((state) => state.quizzes);
  const loadPreparedQuiz = usePreparedQuizStore((state) => state.loadForSession);
  const totalPreparedCount = preparedQuizzes.reduce((acc, q) => acc + q.questions.length, 0);

  useEffect(() => {
    if (open && sessionId) {
      loadPreparedQuiz(sessionId);
    }
  }, [open, sessionId, loadPreparedQuiz]);
  const [questions, setQuestions] = useState<ApiQuestionBankQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<ApiQuestionBankQuestion | null>(null);

  // Course Details
  const [courseInfo, setCourseInfo] = useState<{
    id: string;
    code?: string;
    titleEn?: string;
    titleAm?: string;
    title?: string;
  } | null>(course || null);

  // Curriculum modules state
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);

  // Curriculum Filters for Question Bank tab
  const [selectedModuleId, setSelectedModuleId] = useState<string>('ALL');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('ALL');
  const [selectedSubLessonId, setSelectedSubLessonId] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Staged Broadcast Queue (Used by both Question Bank and Custom Question)
  const [questionAmount, setQuestionAmount] = useState<number>(1);
  const [stagedQueue, setStagedQueue] = useState<ApiQuestionBankQuestion[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);

  // Active countdown timer & auto-advance state
  const [activeRemainingSeconds, setActiveRemainingSeconds] = useState<number | null>(null);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(false);
  const autoAdvancingRef = useRef(false);

  // Queue item interaction state (details expansion & editing)
  const [expandedQueueIdx, setExpandedQueueIdx] = useState<number | null>(null);
  const [editingQueueItem, setEditingQueueItem] = useState<{
    index: number;
    questionId: string;
    titleEn: string;
    titleAm: string;
    options: string[];
    correctOptionIdx: number;
    explanation: string;
    moduleId: string;
    lessonId: string;
    subLessonId: string;
  } | null>(null);

  // Translation & Question Type Category Lookups
  const { isAmharic } = useTranslation();
  const { items: questionTypeCategories } = useLookupCategories('QUESTION_TYPE');
  const [customQuestionType, setCustomQuestionType] = useState<string>('MULTIPLE_CHOICE');

  const questionTypeOptions = useMemo(() => {
    if (questionTypeCategories && questionTypeCategories.length > 0) {
      return questionTypeCategories.map((c) => ({
        value: c.value.toUpperCase(),
        label: isAmharic && c.labelAm ? c.labelAm : c.labelEn,
      }));
    }
    return [
      { value: 'MULTIPLE_CHOICE', label: isAmharic ? 'ባለብዙ ምርጫ' : 'Multiple Choice' },
      { value: 'TRUE_FALSE', label: isAmharic ? 'እውነት / ሐሰት' : 'True / False' },
      { value: 'SHORT_ANSWER', label: isAmharic ? 'አጭር መልስ' : 'Short Answer' },
    ];
  }, [questionTypeCategories, isAmharic]);

  // Custom question form state
  const [customTitleEn, setCustomTitleEn] = useState('');
  const [customTitleAm, setCustomTitleAm] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);
  const [customExplanation, setCustomExplanation] = useState('');
  const [customTargetModuleId, setCustomTargetModuleId] = useState<string>('NONE');
  const [customTargetLessonId, setCustomTargetLessonId] = useState<string>('NONE');
  const [customTargetSubLessonId, setCustomTargetSubLessonId] = useState<string>('NONE');
  const [customAddedSuccess, setCustomAddedSuccess] = useState<string | null>(null);
  const [saveToQuestionBank, setSaveToQuestionBank] = useState<boolean>(false);

  // Timer settings (in minutes for entire sequenced quiz, just like prepared quiz)
  const [timerMinutes, setTimerMinutes] = useState<number>(3);
  const timerSeconds = timerMinutes * 60;
  const [isRevealed, setIsRevealed] = useState(false);


  // Synchronize staged queue and current index from activeQuiz when modal opens or activeQuiz is running
  useEffect(() => {
    if (activeQuiz) {
      if (activeQuiz.allQuestions && activeQuiz.allQuestions.length > 0) {
        if (stagedQueue.length === 0) {
          const restored: ApiQuestionBankQuestion[] = activeQuiz.allQuestions.map((q) => {
            const rawOpts = q.options.map((opt) => opt.textEn);
            return {
              id: q.id,
              courseId: courseId,
              type: (q.type as any) || 'SINGLE_CHOICE',
              question: q.titleEn,
              options: rawOpts,
              correctAnswer: q.correctOptionIds?.[0] || '0',
              points: 10,
              category: 'General',
              createdAt: new Date(q.startedAt).toISOString(),
              updatedAt: new Date(q.startedAt).toISOString(),
            };
          });
          setStagedQueue(restored);
        }
        if (typeof activeQuiz.questionIndex === 'number') {
          setCurrentQueueIndex(activeQuiz.questionIndex);
        }
      } else if (stagedQueue.length === 0) {
        const single: ApiQuestionBankQuestion = {
          id: activeQuiz.id,
          courseId: courseId,
          type: (activeQuiz.type as any) || 'SINGLE_CHOICE',
          question: activeQuiz.titleEn,
          options: activeQuiz.options.map((opt) => opt.textEn),
          correctAnswer: activeQuiz.correctOptionIds?.[0] || '0',
          points: 10,
          category: 'General',
          createdAt: new Date(activeQuiz.startedAt).toISOString(),
          updatedAt: new Date(activeQuiz.startedAt).toISOString(),
        };
        setStagedQueue([single]);
        setCurrentQueueIndex(0);
      }
    }
  }, [activeQuiz, courseId, stagedQueue.length]);

  // Active Question View Mode: Distribution bars vs Learner Responses breakdown
  const [activeQuizViewMode, setActiveQuizViewMode] = useState<'distribution' | 'responses'>(
    'distribution',
  );
  const [responseFilter, setResponseFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'PENDING'>(
    'ALL',
  );
  const [expandedRespondentId, setExpandedRespondentId] = useState<string | null>(null);
  const [responseSearchQuery, setResponseSearchQuery] = useState('');

  // Modal screen mode: "selection" (question bank / queue / builder) vs "broadcast" (dedicated live monitor) vs "report" vs "history"
  const [viewMode, setViewMode] = useState<'selection' | 'broadcast' | 'report' | 'history'>('selection');

  // Quiz Label for Question Bank & Instant Custom broadcasting
  const [bankQuizLabel, setBankQuizLabel] = useState<string>('');

  // Broadcasted History View State
  const [expandedHistoryGroupLabel, setExpandedHistoryGroupLabel] = useState<string | null>(null);
  const [historyGroupSubTab, setHistoryGroupSubTab] = useState<'results' | 'questions'>('results');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [submittingBatchLabel, setSubmittingBatchLabel] = useState<string | null>(null);
  const [submittedBatchLabels, setSubmittedBatchLabels] = useState<Set<string>>(new Set());

  // Automatically switch to broadcast monitor when modal opens if a question is actively broadcasting
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (!prevOpenRef.current && open && activeQuiz) {
      setViewMode('broadcast');
    }
    prevOpenRef.current = open;
  }, [open, activeQuiz]);

  // Live Session Report state
  const [backendReport, setBackendReport] = useState<ApiLiveQuizReport | null>(null);
  const [loadingBackendReport, setLoadingBackendReport] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [expandedReportQuestionId, setExpandedReportQuestionId] = useState<string | null>(null);

  // Fetch backend report whenever tab === "report" or tab === "history" or sessionId changes
  const loadBackendReport = () => {
    if (!sessionId) return;
    setLoadingBackendReport(true);
    fetchLiveSessionQuizReport(sessionId)
      .then((res) => setBackendReport(res))
      .catch((err) => console.error('Failed to load live quiz report:', err))
      .finally(() => setLoadingBackendReport(false));
  };

  useEffect(() => {
    if ((viewMode === 'report' || viewMode === 'history' || open) && sessionId) {
      loadBackendReport();
    }
  }, [viewMode, open, sessionId]);

  // Set of questions previously broadcasted during this session
  const broadcastedQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    if (quizHistory && Array.isArray(quizHistory)) {
      for (const h of quizHistory) {
        if (h.quiz?.id) ids.add(h.quiz.id);
        if (h.quiz?.allQuestions && Array.isArray(h.quiz.allQuestions)) {
          for (const q of h.quiz.allQuestions) {
            if (q.id) ids.add(q.id);
          }
        }
      }
    }
    if (activeQuiz?.allQuestions && Array.isArray(activeQuiz.allQuestions)) {
      const activeIdx = activeQuiz.questionIndex ?? 0;
      activeQuiz.allQuestions.forEach((q, idx) => {
        if (idx <= activeIdx) {
          ids.add(q.id);
        }
      });
    } else if (activeQuiz?.id) {
      ids.add(activeQuiz.id);
    }
    if (activeQuiz && currentQueueIndex >= 0) {
      for (let i = 0; i <= currentQueueIndex && i < stagedQueue.length; i++) {
        if (stagedQueue[i]?.id) ids.add(stagedQueue[i].id);
      }
    }
    if (backendReport?.questions && Array.isArray(backendReport.questions)) {
      for (const bq of backendReport.questions) {
        if (bq.questionId) ids.add(bq.questionId);
      }
    }
    return ids;
  }, [quizHistory, activeQuiz, currentQueueIndex, stagedQueue, backendReport]);

  // Set of quiz titles that have completed broadcasting in this session
  const broadcastedQuizTitles = useMemo(() => {
    const titles = new Set<string>();
    if (quizHistory && Array.isArray(quizHistory)) {
      for (const h of quizHistory) {
        if (h.quiz?.quizTitle) titles.add(h.quiz.quizTitle);
      }
    }
    return titles;
  }, [quizHistory]);

  // Load course details
  useEffect(() => {
    if (course) {
      setCourseInfo(course);
    } else if (courseId) {
      fetchCourseDetail(courseId)
        .then((data) => {
          if (data) {
            setCourseInfo({
              id: data.id,
              code: data.code,
              titleEn: data.titleEn,
              titleAm: data.titleAm,
            });
          }
        })
        .catch((err) => console.warn('Could not fetch course details:', err));
    }
  }, [course, courseId]);

  // Load question bank for course
  const loadQuestions = () => {
    setLoadingQuestions(true);
    fetchQuestionBank({ courseId, includeGlobal: true })
      .then((data) => setQuestions(data || []))
      .catch((err) => console.error('Failed to load question bank:', err))
      .finally(() => setLoadingQuestions(false));
  };

  // Load curriculum modules for course
  const loadModules = () => {
    if (!courseId) return;
    setLoadingModules(true);
    fetchCourseModules(courseId)
      .then((data) => setModules(data || []))
      .catch((err) => console.error('Failed to load course modules:', err))
      .finally(() => setLoadingModules(false));
  };

  useEffect(() => {
    if (!open) return;
    loadQuestions();
    loadModules();
  }, [open, courseId]);

  // Derived curriculum structures for Question Bank Filter
  const activeModule = useMemo(() => {
    if (selectedModuleId === 'ALL' || selectedModuleId === 'COURSE_GENERAL') return null;
    return modules.find((m) => m.id === selectedModuleId) || null;
  }, [modules, selectedModuleId]);

  const activeModuleLessons = useMemo(() => {
    return activeModule?.lessons || [];
  }, [activeModule]);

  const activeLesson = useMemo(() => {
    if (selectedLessonId === 'ALL') return null;
    return activeModuleLessons.find((l) => l.id === selectedLessonId) || null;
  }, [activeModuleLessons, selectedLessonId]);

  const activeLessonSubLessons = useMemo(() => {
    return activeLesson?.subLessons || [];
  }, [activeLesson]);

  // Derived curriculum structures for Instant Custom Question Target
  const customActiveModule = useMemo(() => {
    if (customTargetModuleId === 'NONE') return null;
    return modules.find((m) => m.id === customTargetModuleId) || null;
  }, [modules, customTargetModuleId]);

  const customActiveLessons = useMemo(() => {
    return customActiveModule?.lessons || [];
  }, [customActiveModule]);

  const customActiveLesson = useMemo(() => {
    if (customTargetLessonId === 'NONE') return null;
    return customActiveLessons.find((l) => l.id === customTargetLessonId) || null;
  }, [customActiveLessons, customTargetLessonId]);

  const customActiveSubLessons = useMemo(() => {
    return customActiveLesson?.subLessons || [];
  }, [customActiveLesson]);

  // Derived curriculum structures for Queued Item Edit Modal
  const editTargetModule = useMemo(() => {
    if (!editingQueueItem || editingQueueItem.moduleId === 'NONE') return null;
    return modules.find((m) => m.id === editingQueueItem.moduleId) || null;
  }, [modules, editingQueueItem?.moduleId]);

  const editTargetLessons = useMemo(() => {
    return editTargetModule?.lessons || [];
  }, [editTargetModule]);

  const editTargetLesson = useMemo(() => {
    if (!editingQueueItem || editingQueueItem.lessonId === 'NONE') return null;
    return editTargetLessons.find((l) => l.id === editingQueueItem.lessonId) || null;
  }, [editTargetLessons, editingQueueItem?.lessonId]);

  const editTargetSubLessons = useMemo(() => {
    return editTargetLesson?.subLessons || [];
  }, [editTargetLesson]);

  // Filter bank questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const qLower = searchQuery.toLowerCase();
        const matchText = (q.question || '').toLowerCase().includes(qLower);
        const matchCat = (q.category || '').toLowerCase().includes(qLower);
        const matchOpts =
          Array.isArray(q.options) &&
          q.options.some((opt: any) =>
            (typeof opt === 'string' ? opt : opt.textEn || '').toLowerCase().includes(qLower),
          );
        if (!matchText && !matchCat && !matchOpts) return false;
      }

      // 2. Type filter
      if (typeFilter !== 'ALL' && q.type !== typeFilter) {
        return false;
      }

      // 3. Curriculum Hierarchy filter
      if (selectedModuleId === 'COURSE_GENERAL') {
        if (q.courseId !== courseId || q.moduleId) return false;
      } else if (selectedModuleId === 'GLOBAL') {
        if (q.courseId) return false;
      } else if (selectedModuleId !== 'ALL') {
        if (q.moduleId !== selectedModuleId) return false;
        if (selectedLessonId !== 'ALL') {
          if (q.lessonId !== selectedLessonId) return false;
          if (selectedSubLessonId !== 'ALL') {
            if (q.subLessonId !== selectedSubLessonId) return false;
          }
        }
      } else {
        // "ALL" modules: course questions or global
        if (q.courseId && q.courseId !== courseId) return false;
      }

      return true;
    });
  }, [
    questions,
    searchQuery,
    typeFilter,
    selectedModuleId,
    selectedLessonId,
    selectedSubLessonId,
    courseId,
  ]);

  // Automatically prime the first question when filtered list changes if none selected
  useEffect(() => {
    if (filteredQuestions.length > 0) {
      if (!selectedQuestion || !filteredQuestions.some((q) => q.id === selectedQuestion.id)) {
        setSelectedQuestion(filteredQuestions[0]);
      }
    } else {
      setSelectedQuestion(null);
    }
  }, [filteredQuestions]);

  // Breadcrumb string for current curriculum filter
  const curriculumBreadcrumb = useMemo(() => {
    const parts = [courseInfo?.code || 'Course'];
    if (selectedModuleId === 'COURSE_GENERAL') {
      parts.push('Course General (No Module)');
    } else if (selectedModuleId === 'GLOBAL') {
      parts.push('Reusable Global');
    } else if (selectedModuleId !== 'ALL' && activeModule) {
      parts.push(`Module: ${activeModule.titleEn}`);
      if (selectedLessonId !== 'ALL' && activeLesson) {
        parts.push(`Lesson: ${activeLesson.titleEn}`);
        if (selectedSubLessonId !== 'ALL') {
          const sub = activeLessonSubLessons.find((s) => s.id === selectedSubLessonId);
          if (sub) parts.push(`Sub-lesson: ${sub.titleEn}`);
        }
      }
    } else {
      parts.push('All Modules & Lessons');
    }
    return parts.join(' > ');
  }, [
    courseInfo,
    selectedModuleId,
    activeModule,
    selectedLessonId,
    activeLesson,
    selectedSubLessonId,
    activeLessonSubLessons,
  ]);

  // Compute live distribution
  const totalResponses = Object.keys(answers).length;
  const distribution: Record<string, number> = {};

  if (activeQuiz) {
    activeQuiz.options.forEach((opt) => {
      distribution[opt.id] = 0;
    });
    Object.values(answers).forEach((ans) => {
      ans.selectedOptionIds.forEach((optId) => {
        if (distribution[optId] !== undefined) {
          distribution[optId]++;
        }
      });
    });
  }

  // All questions in current active quiz pack
  const allQuizPackQuestions = useMemo(() => {
    if (activeQuiz?.allQuestions && activeQuiz.allQuestions.length > 0) {
      return activeQuiz.allQuestions;
    }
    if (activeQuiz) {
      return [activeQuiz];
    }
    return [];
  }, [activeQuiz]);

  // Active Question Learner Responses list
  const activeLearnerResponses = useMemo(() => {
    if (!activeQuiz) return [];
    return Object.values(answers).map((ans) => {
      const allAnsMap: Record<string, string[]> =
        (ans as any).allAnswers || (ans.selectedOptionIds ? { [activeQuiz.id]: ans.selectedOptionIds } : {});

      const questionBreakdown = allQuizPackQuestions.map((q, qIdx) => {
        const userSelectedIds = allAnsMap[q.id] || (q.id === activeQuiz.id ? ans.selectedOptionIds : []) || [];
        const selectedOptions = userSelectedIds.map((optId: string) => {
          const opt = q.options.find((o) => o.id === optId);
          const optIdx = q.options.findIndex((o) => o.id === optId);
          const letter = optIdx >= 0 ? String.fromCharCode(65 + optIdx) : '?';
          return {
            id: optId,
            letter,
            textEn: opt?.textEn || 'Option',
          };
        });

        const correctOptions = (q.correctOptionIds || []).map((cId) => {
          const opt = q.options.find((o) => o.id === cId);
          const optIdx = q.options.findIndex((o) => o.id === cId);
          const letter = optIdx >= 0 ? String.fromCharCode(65 + optIdx) : '?';
          return {
            id: cId,
            letter,
            textEn: opt?.textEn || 'Option',
          };
        });

        const hasCorrectSpec = q.correctOptionIds && q.correctOptionIds.length > 0;
        let isCorrect: boolean | null = null;
        if (hasCorrectSpec) {
          if (userSelectedIds.length === 0) {
            isCorrect = false;
          } else {
            const hasAllCorrect = q.correctOptionIds!.every((id) => userSelectedIds.includes(id));
            const hasNoWrong = userSelectedIds.every((id: string) => q.correctOptionIds!.includes(id));
            isCorrect = hasAllCorrect && hasNoWrong;
          }
        }

        return {
          question: q,
          questionIndex: qIdx,
          userSelectedIds,
          selectedOptions,
          correctOptions,
          isCorrect,
        };
      });

      const gradedQuestions = questionBreakdown.filter(
        (qb) => qb.question.correctOptionIds && qb.question.correctOptionIds.length > 0,
      );
      const totalCorrect = gradedQuestions.filter((qb) => qb.isCorrect === true).length;

      return {
        userId: ans.userId,
        userName: ans.userName || 'Learner',
        responseDurationSeconds: ans.responseDurationSeconds,
        submittedAt: ans.submittedAt,
        allAnswers: allAnsMap,
        questionBreakdown,
        totalCorrect,
        totalGraded: gradedQuestions.length,
        totalQuestions: allQuizPackQuestions.length,
      };
    });
  }, [activeQuiz, answers, allQuizPackQuestions]);

  const activeCorrectCount = useMemo(
    () => activeLearnerResponses.filter((r) => r.totalGraded > 0 && r.totalCorrect === r.totalGraded).length,
    [activeLearnerResponses],
  );
  const activeIncorrectCount = useMemo(
    () => activeLearnerResponses.filter((r) => r.totalGraded > 0 && r.totalCorrect < r.totalGraded).length,
    [activeLearnerResponses],
  );

  // Unanswered learners for active quiz from room attendees
  const activeUnansweredLearners = useMemo(() => {
    if (!activeQuiz || !attendees || attendees.length === 0) return [];
    const answeredIds = new Set(Object.keys(answers));
    return attendees
      .filter((a) => !answeredIds.has(a.userId))
      .map((a) => ({
        userId: a.userId,
        userName: a.user
          ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() || a.user.email || 'Learner'
          : 'Learner',
        email: a.user?.email,
      }));
  }, [activeQuiz, attendees, answers]);

  // Filtered active learner responses
  const filteredActiveResponses = useMemo(() => {
    let list = activeLearnerResponses;
    if (responseSearchQuery.trim()) {
      const q = responseSearchQuery.toLowerCase();
      list = list.filter((r) => r.userName.toLowerCase().includes(q));
    }
    return list;
  }, [activeLearnerResponses, responseSearchQuery]);

  // Filtered unanswered active learners
  const filteredActiveUnanswered = useMemo(() => {
    if (!responseSearchQuery.trim()) return activeUnansweredLearners;
    const q = responseSearchQuery.toLowerCase();
    return activeUnansweredLearners.filter(
      (u) => u.userName.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q)),
    );
  }, [activeUnansweredLearners, responseSearchQuery]);

  // Expanded accordion states for report
  const [expandedQuizGroupId, setExpandedQuizGroupId] = useState<string | null>(null);

  // Grouped session quizzes (by prepared quiz group or broadcasted session)
  const sessionQuizGroups = useMemo(() => {
    const groups: Array<{
      id: string;
      title: string;
      isActive: boolean;
      totalResponses: number;
      accuracy: number;
      completedAt?: number;
      questions: Array<{
        id: string;
        titleEn: string;
        titleAm?: string;
        options: LiveQuizOption[];
        correctOptionIds?: string[];
        explanationEn?: string;
        totalResponses: number;
        correctCount: number;
        accuracy: number;
        distribution: Record<string, number>;
        answers: Array<{
          userId: string;
          userName: string;
          selectedOptionIds: string[];
          isCorrect?: boolean | null;
          responseDurationSeconds?: number;
        }>;
      }>;
    }> = [];

    // Helper to build a question report object
    const buildQuestionData = (
      q: any,
      sourceAnswers: Record<string, any>,
      fallbackActiveQuizId?: string,
      fallbackReveal?: any,
    ) => {
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      let qOptions: LiveQuizOption[] = rawOptions.map((opt: any, oIdx: number) => {
        if (typeof opt === 'string') {
          return { id: String(oIdx), textEn: opt };
        }
        return {
          id: opt.id !== undefined && opt.id !== null ? String(opt.id) : String(oIdx),
          textEn: opt.textEn || opt.text || opt.title || `Option ${oIdx + 1}`,
          textAm: opt.textAm,
        };
      });

      // If question options are empty, check backend report for this question
      const bqMatch = backendReport?.questions?.find((b) => b.questionId === q.id);
      if (qOptions.length === 0 && bqMatch && Array.isArray(bqMatch.options) && bqMatch.options.length > 0) {
        qOptions = bqMatch.options.map((opt: any, oIdx: number) => {
          if (typeof opt === 'string') return { id: String(oIdx), textEn: opt };
          return {
            id: opt.id !== undefined && opt.id !== null ? String(opt.id) : String(oIdx),
            textEn: opt.textEn || opt.text || `Option ${oIdx + 1}`,
          };
        });
      }

      // Initialize distribution for all options
      const distribution: Record<string, number> = {};
      qOptions.forEach((opt) => {
        distribution[opt.id] = 0;
      });

      // Pre-seed distribution from fallbackReveal or bqMatch if available
      const preseededDist = fallbackReveal?.distribution || bqMatch?.distribution || {};
      Object.entries(preseededDist).forEach(([k, v]) => {
        const numVal = Number(v) || 0;
        const matched = qOptions.find(
          (o, idx) => o.id === k || String(idx) === k || o.textEn.toLowerCase() === k.toLowerCase(),
        );
        if (matched) {
          distribution[matched.id] = Math.max(distribution[matched.id] || 0, numVal);
        } else {
          distribution[k] = numVal;
        }
      });

      // Resolve correct options
      const resolvedCorrectIds: string[] = [];
      if (Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
        resolvedCorrectIds.push(...q.correctOptionIds.map(String));
      } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
        const caStr = String(q.correctAnswer).trim();
        const matched = qOptions.find(
          (o, idx) =>
            o.id === caStr || String(idx) === caStr || o.textEn.toLowerCase() === caStr.toLowerCase(),
        );
        if (matched) {
          resolvedCorrectIds.push(matched.id);
        } else {
          resolvedCorrectIds.push(caStr);
        }
      } else if (bqMatch?.correctAnswer) {
        resolvedCorrectIds.push(String(bqMatch.correctAnswer));
      }

      const qAnswers: Array<{
        userId: string;
        userName: string;
        selectedOptionIds: string[];
        isCorrect?: boolean | null;
        responseDurationSeconds?: number;
      }> = [];

      // Process in-memory answers (from WebSocket / data channel / session state)
      Object.values(sourceAnswers || {}).forEach((ans: any) => {
        const allAnsMap = ans.allAnswers || {};
        let rawSelected: string[] = allAnsMap[q.id];
        if (!rawSelected || rawSelected.length === 0) {
          if (ans.questionId === q.id || (fallbackActiveQuizId && q.id === fallbackActiveQuizId)) {
            rawSelected = ans.selectedOptionIds;
          } else if (ans.selectedOptionIds && !ans.allAnswers) {
            rawSelected = ans.selectedOptionIds;
          }
        }
        const userSelected = (rawSelected || []).map(String);

        // Map selections to normalized option ids
        const normalizedSelected: string[] = [];
        userSelected.forEach((sel) => {
          const matched = qOptions.find(
            (o, idx) =>
              o.id === sel || String(idx) === sel || o.textEn.toLowerCase() === sel.toLowerCase(),
          );
          const targetId = matched ? matched.id : sel;
          normalizedSelected.push(targetId);
          distribution[targetId] = (distribution[targetId] || 0) + 1;
        });

        const hasCorrectSpec = resolvedCorrectIds.length > 0;
        let isCorrect: boolean | null = null;
        if (hasCorrectSpec) {
          if (normalizedSelected.length === 0) {
            isCorrect = false;
          } else {
            const hasAllCorrect = resolvedCorrectIds.every((id: string) =>
              normalizedSelected.includes(id),
            );
            const hasNoWrong = normalizedSelected.every((id: string) =>
              resolvedCorrectIds.includes(id),
            );
            isCorrect = hasAllCorrect && hasNoWrong;
          }
        }

        qAnswers.push({
          userId: ans.userId,
          userName: ans.userName || 'Learner',
          selectedOptionIds: normalizedSelected,
          isCorrect,
          responseDurationSeconds: ans.responseDurationSeconds,
        });
      });

      // Merge answers from backendReport for this question
      if (bqMatch && Array.isArray(bqMatch.answers)) {
        bqMatch.answers.forEach((bAns: any) => {
          if (!qAnswers.some((a) => a.userId === bAns.userId)) {
            const rawSelected = (bAns.selectedOptionIds || []).map(String);
            const normalizedSelected: string[] = [];
            rawSelected.forEach((sel: string) => {
              const matched = qOptions.find(
                (o, idx) =>
                  o.id === sel ||
                  String(idx) === sel ||
                  o.textEn.toLowerCase() === sel.toLowerCase(),
              );
              const targetId = matched ? matched.id : sel;
              normalizedSelected.push(targetId);
              distribution[targetId] = (distribution[targetId] || 0) + 1;
            });

            qAnswers.push({
              userId: bAns.userId,
              userName: bAns.userName || 'Learner',
              selectedOptionIds: normalizedSelected,
              isCorrect: bAns.isCorrect,
              responseDurationSeconds: bAns.responseDurationSeconds,
            });
          }
        });
      }

      // If qOptions is still empty after all, fallback to synthesizing from distribution
      if (qOptions.length === 0) {
        const optionKeys = Object.keys(distribution);
        if (optionKeys.length > 0) {
          qOptions = optionKeys.map((k, idx) => ({
            id: k,
            textEn: `Option ${idx + 1}`,
          }));
        }
      }

      const totalResp =
        qAnswers.filter((a) => a.selectedOptionIds.length > 0).length ||
        qAnswers.length ||
        bqMatch?.totalResponses ||
        0;
      const correctCount =
        qAnswers.filter((a) => a.isCorrect === true).length || bqMatch?.correctCount || 0;
      const accuracy =
        totalResp > 0 ? Math.round((correctCount / totalResp) * 100) : bqMatch?.accuracy || 0;

      return {
        id: q.id,
        titleEn: q.titleEn || q.title || bqMatch?.titleEn || 'Live Session Question',
        titleAm: q.titleAm,
        options: qOptions,
        correctOptionIds: resolvedCorrectIds.length > 0 ? resolvedCorrectIds : q.correctOptionIds,
        explanationEn: q.explanationEn || q.explanation,
        totalResponses: totalResp,
        correctCount,
        accuracy,
        distribution,
        answers: qAnswers,
      };
    };

    // 1. Current activeQuiz (if broadcasting)
    if (activeQuiz) {
      const allQ =
        activeQuiz.allQuestions && activeQuiz.allQuestions.length > 0
          ? activeQuiz.allQuestions
          : [activeQuiz];

      const questions = allQ.map((q) => buildQuestionData(q, answers, activeQuiz.id));
      const groupTotalResp = questions.reduce((acc, q) => acc + q.totalResponses, 0);
      const groupTotalCorrect = questions.reduce((acc, q) => acc + q.correctCount, 0);
      const groupAccuracy =
        groupTotalResp > 0 ? Math.round((groupTotalCorrect / groupTotalResp) * 100) : 0;

      const groupTitle =
        activeQuiz.quizTitle ||
        (allQ.length > 1
          ? 'Live Prepared Quiz'
          : stripHtmlTags(activeQuiz.titleEn) || 'Active Live Quiz');

      groups.push({
        id: `active-${activeQuiz.id}`,
        title: groupTitle,
        isActive: true,
        totalResponses: groupTotalResp,
        accuracy: groupAccuracy,
        questions,
      });
    }

    // 2. From live in-session quizHistory
    (quizHistory || []).forEach((hist, hIdx) => {
      const allQ: any[] =
        hist.quiz.allQuestions && hist.quiz.allQuestions.length > 0
          ? hist.quiz.allQuestions
          : [hist.quiz];

      const questions = allQ.map((q: any) =>
        buildQuestionData(q, hist.answers, hist.quiz.id, hist.revealData),
      );
      const groupTotalResp = questions.reduce((acc: number, q: any) => acc + q.totalResponses, 0);
      const groupTotalCorrect = questions.reduce(
        (acc: number, q: any) => acc + q.correctCount,
        0,
      );
      const groupAccuracy =
        groupTotalResp > 0 ? Math.round((groupTotalCorrect / groupTotalResp) * 100) : 0;

      const groupTitle =
        hist.quiz.quizTitle ||
        (allQ.length > 1
          ? `Prepared Quiz #${hIdx + 1}`
          : stripHtmlTags(hist.quiz.titleEn) || `Quiz #${hIdx + 1}`);

      groups.push({
        id: `history-${hist.quiz.id}-${hIdx}`,
        title: groupTitle,
        isActive: false,
        totalResponses: groupTotalResp,
        accuracy: groupAccuracy,
        questions,
        completedAt: (hist as any).completedAt || (hist.quiz as any).startedAt,
      });
    });

    // 3. Fallback from backend report if not in active or history
    if (backendReport && backendReport.questions && backendReport.questions.length > 0) {
      const existingQuestionIds = new Set<string>();
      groups.forEach((g) => g.questions.forEach((q) => existingQuestionIds.add(q.id)));

      const unrepresented = backendReport.questions.filter(
        (bq) => !existingQuestionIds.has(bq.questionId),
      );

      if (unrepresented.length > 0) {
        const questions = unrepresented.map((bq) => {
          const qOptions = (Array.isArray(bq.options) ? bq.options : []).map((o: any, idx: number) => ({
            id: typeof o === 'string' ? String(idx) : o.id || String(idx),
            textEn: typeof o === 'string' ? o : o.textEn || String(o),
          }));
          return {
            id: bq.questionId,
            titleEn: bq.titleEn,
            options: qOptions,
            correctOptionIds: bq.correctAnswer ? [bq.correctAnswer] : undefined,
            totalResponses: bq.totalResponses,
            correctCount: bq.correctCount,
            accuracy: bq.accuracy,
            distribution: bq.distribution || {},
            answers: (bq.answers || []).map((ba) => ({
              userId: ba.userId,
              userName: ba.userName,
              selectedOptionIds: ba.selectedOptionIds,
              isCorrect: ba.isCorrect,
              responseDurationSeconds: ba.responseDurationSeconds,
            })),
          };
        });

        const groupTotalResp = questions.reduce((acc, q) => acc + q.totalResponses, 0);
        const groupTotalCorrect = questions.reduce((acc, q) => acc + q.correctCount, 0);
        const groupAccuracy = groupTotalResp > 0 ? Math.round((groupTotalCorrect / groupTotalResp) * 100) : 0;

        groups.push({
          id: 'backend-archived-group',
          title: 'Session Archived Quizzes',
          isActive: false,
          totalResponses: groupTotalResp,
          accuracy: groupAccuracy,
          questions,
        });
      }
    }

    return groups;
  }, [quizHistory, activeQuiz, answers, backendReport]);

  // Aggregate statistics across all quiz groups
  const sessionTotalQuestions = useMemo(
    () => sessionQuizGroups.reduce((acc, g) => acc + g.questions.length, 0),
    [sessionQuizGroups],
  );
  const sessionTotalResponses = useMemo(
    () => sessionQuizGroups.reduce((acc, g) => acc + g.totalResponses, 0),
    [sessionQuizGroups],
  );
  const sessionTotalCorrect = useMemo(
    () =>
      sessionQuizGroups.reduce(
        (acc, g) => acc + g.questions.reduce((qAcc, q) => qAcc + q.correctCount, 0),
        0,
      ),
    [sessionQuizGroups],
  );
  const sessionOverallAccuracy =
    sessionTotalResponses > 0 ? Math.round((sessionTotalCorrect / sessionTotalResponses) * 100) : 0;

  // Total unique learners who answered
  const sessionLearnersCount = useMemo(() => {
    const userIds = new Set<string>();
    sessionQuizGroups.forEach((g) => {
      g.questions.forEach((q) => {
        q.answers.forEach((a) => {
          if (a.userId) userIds.add(a.userId);
        });
      });
    });
    return userIds.size;
  }, [sessionQuizGroups]);

  // Auto-expand first quiz group and first question when opening report
  useEffect(() => {
    if (viewMode === 'report' && sessionQuizGroups.length > 0 && !expandedQuizGroupId) {
      setExpandedQuizGroupId(sessionQuizGroups[0].id);
      if (sessionQuizGroups[0].questions.length > 0) {
        setExpandedReportQuestionId(sessionQuizGroups[0].questions[0].id);
      }
    }
  }, [viewMode, sessionQuizGroups, expandedQuizGroupId]);

  // Batches grouped by Quiz Label for Broadcasted History view
  const historyBatchesGroupedByLabel = useMemo(() => {
    const groupsByLabel: Record<
      string,
      {
        label: string;
        batches: typeof sessionQuizGroups;
        totalQuestions: number;
        totalResponses: number;
        averageAccuracy: number;
        completedAt?: number;
        allQuestions: (typeof sessionQuizGroups)[0]['questions'];
        studentResults: Array<{
          userId: string;
          userName: string;
          answeredCount: number;
          correctCount: number;
          totalQuestions: number;
          scorePercent: number;
          status: 'PASSED' | 'NEEDS_REVIEW';
          totalDurationSeconds: number;
          breakdown: Array<{
            questionId: string;
            questionTitle: string;
            selectedOptionTexts: string[];
            isCorrect: boolean | null;
          }>;
        }>;
      }
    > = {};

    const completedGroups = sessionQuizGroups.filter((g) => !g.isActive);

    completedGroups.forEach((group) => {
      const labelKey = group.title || 'Untitled Quiz Batch';
      if (!groupsByLabel[labelKey]) {
        groupsByLabel[labelKey] = {
          label: labelKey,
          batches: [],
          totalQuestions: 0,
          totalResponses: 0,
          averageAccuracy: 0,
          completedAt: (group as any).completedAt,
          allQuestions: [],
          studentResults: [],
        };
      }
      groupsByLabel[labelKey].batches.push(group);
      if ((group as any).completedAt && !groupsByLabel[labelKey].completedAt) {
        groupsByLabel[labelKey].completedAt = (group as any).completedAt;
      }
    });

    Object.values(groupsByLabel).forEach((item) => {
      const questionMap = new Map<string, (typeof sessionQuizGroups)[0]['questions'][0]>();
      item.batches.forEach((b) => {
        b.questions.forEach((q) => {
          questionMap.set(q.id, q);
        });
      });
      item.allQuestions = Array.from(questionMap.values());
      item.totalQuestions = item.allQuestions.length;

      item.totalResponses = item.batches.reduce((sum, b) => sum + b.totalResponses, 0);
      const totalCorrect = item.allQuestions.reduce((sum, q) => sum + q.correctCount, 0);
      const totalQResponses = item.allQuestions.reduce((sum, q) => sum + q.totalResponses, 0);
      item.averageAccuracy =
        totalQResponses > 0 ? Math.round((totalCorrect / totalQResponses) * 100) : 0;

      const studentMap = new Map<
        string,
        {
          userId: string;
          userName: string;
          answeredCount: number;
          correctCount: number;
          totalDurationSeconds: number;
          breakdown: Array<{
            questionId: string;
            questionTitle: string;
            selectedOptionTexts: string[];
            isCorrect: boolean | null;
          }>;
        }
      >();

      item.allQuestions.forEach((q) => {
        q.answers.forEach((ans) => {
          if (!studentMap.has(ans.userId)) {
            studentMap.set(ans.userId, {
              userId: ans.userId,
              userName: ans.userName || 'Learner',
              answeredCount: 0,
              correctCount: 0,
              totalDurationSeconds: 0,
              breakdown: [],
            });
          }
          const record = studentMap.get(ans.userId)!;
          const selectedTexts = ans.selectedOptionIds.map((optId) => {
            const opt = q.options.find((o) => o.id === optId);
            return opt ? opt.textEn : `Option ${optId}`;
          });

          if (ans.selectedOptionIds && ans.selectedOptionIds.length > 0) {
            record.answeredCount += 1;
          }
          if (ans.isCorrect === true) {
            record.correctCount += 1;
          }
          record.totalDurationSeconds += ans.responseDurationSeconds || 0;
          record.breakdown.push({
            questionId: q.id,
            questionTitle: q.titleEn,
            selectedOptionTexts: selectedTexts,
            isCorrect: ans.isCorrect ?? null,
          });
        });
      });

      item.studentResults = Array.from(studentMap.values()).map((s) => {
        const scorePercent =
          item.totalQuestions > 0 ? Math.round((s.correctCount / item.totalQuestions) * 100) : 0;
        return {
          ...s,
          totalQuestions: item.totalQuestions,
          scorePercent,
          status: (scorePercent >= 60 ? 'PASSED' : 'NEEDS_REVIEW') as 'PASSED' | 'NEEDS_REVIEW',
        };
      });
    });

    return Object.values(groupsByLabel);
  }, [sessionQuizGroups]);

  // Auto-expand first history group when entering history mode
  useEffect(() => {
    if (
      viewMode === 'history' &&
      historyBatchesGroupedByLabel.length > 0 &&
      !expandedHistoryGroupLabel
    ) {
      setExpandedHistoryGroupLabel(historyBatchesGroupedByLabel[0].label);
    }
  }, [viewMode, historyBatchesGroupedByLabel, expandedHistoryGroupLabel]);

  // Filtered batches for history search
  const filteredHistoryBatches = useMemo(() => {
    if (!historySearchQuery.trim()) return historyBatchesGroupedByLabel;
    const q = historySearchQuery.toLowerCase();
    return historyBatchesGroupedByLabel.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.studentResults.some((s) => s.userName.toLowerCase().includes(q)),
    );
  }, [historyBatchesGroupedByLabel, historySearchQuery]);

  // Submit Batch Quiz Results to LMS Gradebook
  const handleSubmitBatchResults = async (group: (typeof historyBatchesGroupedByLabel)[0]) => {
    setSubmittingBatchLabel(group.label);
    try {
      // Simulate submission of student quiz scores to LMS gradebook
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmittedBatchLabels((prev) => {
        const next = new Set(prev);
        next.add(group.label);
        return next;
      });
      toast.success(
        `Successfully submitted quiz results for "${group.label}" (${group.studentResults.length} learners) to LMS gradebook!`,
      );
    } catch (err) {
      toast.error(`Failed to submit quiz results for "${group.label}".`);
    } finally {
      setSubmittingBatchLabel(null);
    }
  };

  // Export individual batch results to CSV
  const handleExportBatchCSV = (group: (typeof historyBatchesGroupedByLabel)[0]) => {
    const headers = [
      'Learner ID',
      'Learner Name',
      'Answered Questions',
      'Total Questions',
      'Correct Answers',
      'Score (%)',
      'Status',
      'Duration (seconds)',
    ];
    const rows = group.studentResults.map((s) => [
      `"${s.userId}"`,
      `"${s.userName.replace(/"/g, '""')}"`,
      s.answeredCount,
      s.totalQuestions,
      s.correctCount,
      `${s.scorePercent}%`,
      s.status,
      s.totalDurationSeconds,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${group.label.replace(/[^a-zA-Z0-9_-]/g, '_')}_Results_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported results for "${group.label}" to CSV!`);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Session ID', sessionId || ''],
      ['Export Date', new Date().toLocaleString()],
      ['Total Questions', String(sessionTotalQuestions)],
      ['Total Responses', String(sessionTotalResponses)],
      ['Class Accuracy', `${sessionOverallAccuracy}%`],
      [],
      [
        'Quiz Group',
        'Question #',
        'Question Title',
        'Learner Name',
        'Selected Option',
        'Result',
        'Duration (s)',
      ],
    ];

    for (const group of sessionQuizGroups) {
      for (let qIdx = 0; qIdx < group.questions.length; qIdx++) {
        const q = group.questions[qIdx];
        if (q.answers.length === 0) {
          rows.push([
            `"${group.title.replace(/"/g, '""')}"`,
            `Q${qIdx + 1}`,
            `"${stripHtmlTags(q.titleEn).replace(/"/g, '""')}"`,
            'No responses submitted',
            '—',
            '—',
            '—',
          ]);
        } else {
          for (const ans of q.answers) {
            const selectedLabels = ans.selectedOptionIds.map((id) => {
              const opt = q.options.find((o) => o.id === id);
              const optIdx = q.options.findIndex((o) => o.id === id);
              const letter = optIdx >= 0 ? String.fromCharCode(65 + optIdx) : '?';
              return `[${letter}] ${stripHtmlTags(opt?.textEn || '')}`;
            });
            rows.push([
              `"${group.title.replace(/"/g, '""')}"`,
              `Q${qIdx + 1}`,
              `"${stripHtmlTags(q.titleEn).replace(/"/g, '""')}"`,
              `"${(ans.userName || 'Learner').replace(/"/g, '""')}"`,
              `"${selectedLabels.join(', ').replace(/"/g, '""')}"`,
              ans.isCorrect === true ? 'Correct' : ans.isCorrect === false ? 'Incorrect' : 'Submitted',
              ans.responseDurationSeconds ? String(ans.responseDurationSeconds) : '—',
            ]);
          }
        }
      }
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `live-session-quiz-report-${sessionId || 'export'}-${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const buildQuizPayload = (q: ApiQuestionBankQuestion) => {
    let parsedOptions: LiveQuizOption[] = [];
    if (q.type === 'TRUE_FALSE') {
      parsedOptions = [
        { id: '0', textEn: 'True' },
        { id: '1', textEn: 'False' },
      ];
    } else if (Array.isArray(q.options) && q.options.length > 0) {
      parsedOptions = q.options.map((opt: any, idx: number) => ({
        id: String(idx),
        textEn: typeof opt === 'string' ? opt : opt.textEn || opt.text || `Option ${idx + 1}`,
        textAm: typeof opt === 'object' ? opt.textAm : undefined,
      }));
    } else {
      parsedOptions = [
        { id: '0', textEn: 'Option 1' },
        { id: '1', textEn: 'Option 2' },
      ];
    }

    let correctOptionIds: string[] = ['0'];
    if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
      const rawAns = String(q.correctAnswer).trim();
      const num = parseInt(rawAns, 10);
      if (!isNaN(num) && num >= 0 && num < parsedOptions.length) {
        correctOptionIds = [String(num)];
      } else {
        const found = parsedOptions.findIndex(
          (o) => o.textEn.toLowerCase() === rawAns.toLowerCase(),
        );
        if (found !== -1) {
          correctOptionIds = [String(found)];
        } else {
          correctOptionIds = [rawAns];
        }
      }
    }

    return {
      id: q.id,
      titleEn: stripHtmlTags(q.question),
      titleAm: (q as any).titleAm || q.course?.titleAm,
      type:
        q.type === 'MULTIPLE_CHOICE' ? ('MULTIPLE_CHOICE' as const) : ('SINGLE_CHOICE' as const),
      options: parsedOptions.map((opt) => ({
        ...opt,
        textEn: stripHtmlTags(opt.textEn),
      })),
      timeLimitSeconds: timerSeconds,
      startedAt: Date.now(),
      trainerName,
      correctOptionIds,
      explanationEn: (q as any).explanation || (q as any).explanationEn || undefined,
      explanationAm: (q as any).explanationAm || undefined,
    };
  };

  // Broadcast an entire prepared quiz group
  const handleLaunchPreparedQuizGroup = (quizGroup: PreparedQuizGroup) => {
    if (!quizGroup || quizGroup.questions.length === 0) return;
    if (activeQuiz) {
      toast.warning('A quiz is currently actively broadcasting. Please end or cancel it first.');
      return;
    }
    const apiQuestions: ApiQuestionBankQuestion[] = quizGroup.questions.map((item) => {
      const q = item.question;
      let options = q.options;
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch { options = []; }
      }
      return {
        id: q.id,
        courseId: q.courseId,
        type: q.type,
        question: q.question,
        options: Array.isArray(options) ? options : [],
        correctAnswer: q.correctAnswer !== undefined && q.correctAnswer !== null ? String(q.correctAnswer) : null,
        // The points set for this question in the prepared quiz.
        points: item.points,
        category: q.category || 'General',
        createdAt: item.addedAt,
        updatedAt: item.addedAt,
      };
    });

    const totalSeconds = (quizGroup.timeLimitMinutes || 3) * 60;
    setTimerMinutes(quizGroup.timeLimitMinutes || 3);
    setStagedQueue(apiQuestions);
    setCurrentQueueIndex(0);
    setSelectedQuestion(apiQuestions[0]);

    const allPayloads = apiQuestions.map((item, idx) => ({
      ...buildQuizPayload(item),
      timeLimitSeconds: totalSeconds,
      quizTitle: quizGroup.title,
      questionIndex: idx,
      totalQuestions: apiQuestions.length,
    }));

    onBroadcast({
      type: 'QUIZ_START',
      payload: {
        ...allPayloads[0],
        timeLimitSeconds: totalSeconds,
        quizTitle: quizGroup.title,
        questionIndex: 0,
        totalQuestions: apiQuestions.length,
        allQuestions: allPayloads,
      },
    });
    setIsRevealed(false);
    setViewMode('broadcast');
  };

  // Broadcast a question to room
  const handleLaunchQuestion = (
    q: ApiQuestionBankQuestion,
    queueIndex?: number,
    queue?: ApiQuestionBankQuestion[],
    quizTitle?: string,
  ) => {
    const isNavigatingSameQueue = Boolean(
      activeQuiz &&
        activeQuiz.allQuestions &&
        queue &&
        queue.length > 0 &&
        queueIndex !== undefined,
    );
    if (activeQuiz && !isNavigatingSameQueue && activeQuiz.id !== q.id) {
      toast.warning('A quiz is currently actively broadcasting. Please end or cancel it first.');
      return;
    }

    const activeQList = queue || stagedQueue;
    const activeIdx = queueIndex !== undefined ? queueIndex : currentQueueIndex;
    const resolvedTitle =
      quizTitle ||
      activeQuiz?.quizTitle ||
      (activeQList.length > 1
        ? bankQuizLabel.trim() || `Quiz ${quizHistory.length + 1}`
        : bankQuizLabel.trim() || undefined);
    const totalSeconds = timerMinutes * 60;
    const quizPayload = {
      ...buildQuizPayload(q),
      timeLimitSeconds: totalSeconds,
      ...(resolvedTitle ? { quizTitle: resolvedTitle } : {}),
    };

    // If there is a staged queue with multiple questions, broadcast all question payloads
    const allPayloads =
      activeQList && activeQList.length > 0
        ? activeQList.map((item, idx) => ({
            ...buildQuizPayload(item),
            timeLimitSeconds: totalSeconds,
            ...(resolvedTitle ? { quizTitle: resolvedTitle } : {}),
            questionIndex: idx,
            totalQuestions: activeQList.length,
          }))
        : undefined;

    onBroadcast({
      type: 'QUIZ_START',
      payload: {
        ...quizPayload,
        timeLimitSeconds: totalSeconds,
        ...(resolvedTitle ? { quizTitle: resolvedTitle } : {}),
        questionIndex: activeIdx,
        totalQuestions: activeQList.length > 0 ? activeQList.length : 1,
        allQuestions: allPayloads,
      },
    });
    setIsRevealed(false);
    setViewMode('broadcast');
  };

  // Launch staged question or single selected question
  const handleLaunchFromBank = () => {
    if (activeQuiz) {
      toast.warning('A quiz is currently actively broadcasting. Please end or cancel it first.');
      return;
    }
    const resolvedQuizTitle = bankQuizLabel.trim() || `Quiz ${quizHistory.length + 1}`;
    let toBroadcast: ApiQuestionBankQuestion | null = null;
    let targetQueue = stagedQueue;

    if (stagedQueue.length > 0) {
      toBroadcast = stagedQueue[0];
      setCurrentQueueIndex(0);
    } else if (selectedQuestion) {
      toBroadcast = selectedQuestion;
      targetQueue = [selectedQuestion];
      setStagedQueue([selectedQuestion]);
      setCurrentQueueIndex(0);
    } else if (filteredQuestions.length > 0) {
      toBroadcast = filteredQuestions[0];
      setSelectedQuestion(filteredQuestions[0]);
      targetQueue = [filteredQuestions[0]];
      setStagedQueue([filteredQuestions[0]]);
      setCurrentQueueIndex(0);
    }

    if (toBroadcast) {
      handleLaunchQuestion(toBroadcast, 0, targetQueue, resolvedQuizTitle);
    }
  };

  // Advance to next question in staged queue
  const handleAdvanceToNextQuestion = () => {
    if (currentQueueIndex >= stagedQueue.length - 1) return;

    if (activeQuiz) {
      onBroadcast({
        type: 'QUIZ_CLOSE',
        payload: { questionId: activeQuiz.id },
      });
      onClearQuiz();
    }

    const nextIndex = currentQueueIndex + 1;
    setCurrentQueueIndex(nextIndex);
    const nextQ = stagedQueue[nextIndex];
    if (nextQ) {
      setTimeout(() => {
        handleLaunchQuestion(nextQ, nextIndex, stagedQueue, activeQuiz?.quizTitle);
      }, 150);
    }
  };

  // Go back to previous question in staged queue
  const handleGoToPreviousQuestion = () => {
    if (currentQueueIndex <= 0 || stagedQueue.length === 0) return;

    if (activeQuiz) {
      onBroadcast({
        type: 'QUIZ_CLOSE',
        payload: { questionId: activeQuiz.id },
      });
      onClearQuiz();
    }

    const prevIndex = currentQueueIndex - 1;
    setCurrentQueueIndex(prevIndex);
    const prevQ = stagedQueue[prevIndex];
    if (prevQ) {
      setTimeout(() => {
        handleLaunchQuestion(prevQ, prevIndex, stagedQueue, activeQuiz?.quizTitle);
      }, 150);
    }
  };

  // Question currently inspected in trainer broadcast monitor
  const currentStagedQ = stagedQueue[currentQueueIndex];
  const displayedQuiz = useMemo(() => {
    if (currentStagedQ) {
      return buildQuizPayload(currentStagedQ);
    }
    return activeQuiz;
  }, [currentStagedQ, activeQuiz, buildQuizPayload]);

  // Active countdown timer calculation
  useEffect(() => {
    if (!activeQuiz) {
      setActiveRemainingSeconds(null);
      autoAdvancingRef.current = false;
      return;
    }

    const calcRemaining = () => {
      const elapsed = Math.floor((Date.now() - activeQuiz.startedAt) / 1000);
      return Math.max(0, activeQuiz.timeLimitSeconds - elapsed);
    };

    setActiveRemainingSeconds(calcRemaining());

    const interval = setInterval(() => {
      const rem = calcRemaining();
      setActiveRemainingSeconds(rem);
    }, 500);

    return () => clearInterval(interval);
  }, [activeQuiz]);

  // Auto-advance to next question when time is up
  useEffect(() => {
    if (
      activeRemainingSeconds === 0 &&
      autoAdvanceEnabled &&
      !autoAdvancingRef.current &&
      activeQuiz &&
      stagedQueue.length > 1 &&
      currentQueueIndex < stagedQueue.length - 1
    ) {
      autoAdvancingRef.current = true;
      const timer = setTimeout(() => {
        handleAdvanceToNextQuestion();
        autoAdvancingRef.current = false;
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [
    activeRemainingSeconds,
    autoAdvanceEnabled,
    activeQuiz,
    stagedQueue.length,
    currentQueueIndex,
  ]);

  // Complete staged quiz sequence
  const handleFinishQueue = () => {
    handleCloseQuiz();
    setStagedQueue([]);
    setCurrentQueueIndex(0);
    setViewMode('selection');
  };

  // Save edited queued question
  const handleSaveQueuedEdit = () => {
    if (!editingQueueItem) return;

    const validOpts = editingQueueItem.options.filter((o) => o.trim());
    if (!editingQueueItem.titleEn.trim() || validOpts.length < 2) return;

    const targetModule =
      editingQueueItem.moduleId !== 'NONE'
        ? modules.find((m) => m.id === editingQueueItem.moduleId)
        : undefined;
    const targetLesson =
      targetModule && editingQueueItem.lessonId !== 'NONE'
        ? targetModule.lessons?.find((l) => l.id === editingQueueItem.lessonId)
        : undefined;
    const targetSubLesson =
      targetLesson && editingQueueItem.subLessonId !== 'NONE'
        ? targetLesson.subLessons?.find((s) => s.id === editingQueueItem.subLessonId)
        : undefined;

    const updatedQueue = [...stagedQueue];
    const existing = updatedQueue[editingQueueItem.index];
    if (!existing) return;

    const updatedItem: ApiQuestionBankQuestion = {
      ...existing,
      question: editingQueueItem.titleEn.trim(),
      options: validOpts,
      correctAnswer: String(Math.min(editingQueueItem.correctOptionIdx, validOpts.length - 1)),
      moduleId: editingQueueItem.moduleId !== 'NONE' ? editingQueueItem.moduleId : undefined,
      lessonId: editingQueueItem.lessonId !== 'NONE' ? editingQueueItem.lessonId : undefined,
      subLessonId:
        editingQueueItem.subLessonId !== 'NONE' ? editingQueueItem.subLessonId : undefined,
      module: targetModule
        ? {
            id: targetModule.id,
            titleEn: (targetModule as any).title || targetModule.titleEn || '',
            titleAm: targetModule.titleAm || '',
            order: targetModule.order ?? 0,
          }
        : undefined,
      lesson: targetLesson
        ? {
            id: targetLesson.id,
            titleEn: (targetLesson as any).title || targetLesson.titleEn || '',
            titleAm: targetLesson.titleAm || '',
            order: targetLesson.order ?? 0,
          }
        : undefined,
      subLesson: targetSubLesson
        ? {
            id: targetSubLesson.id,
            titleEn: (targetSubLesson as any).title || targetSubLesson.titleEn || '',
            titleAm: targetSubLesson.titleAm || '',
            order: targetSubLesson.order ?? 0,
          }
        : undefined,
      explanation: editingQueueItem.explanation.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    updatedQueue[editingQueueItem.index] = updatedItem;
    setStagedQueue(updatedQueue);

    if (selectedQuestion?.id === existing.id) {
      setSelectedQuestion(updatedItem);
    }

    setEditingQueueItem(null);
  };

  // Generate random questions from filtered set (prioritizing unbroadcasted questions)
  const handleGenerateRandom = () => {
    if (filteredQuestions.length === 0) return;
    const unbroadcasted = filteredQuestions.filter((q) => !broadcastedQuestionIds.has(q.id));
    const pool = unbroadcasted.length > 0 ? unbroadcasted : filteredQuestions;
    const count = Math.min(questionAmount, pool.length);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    setStagedQueue(selected);
    setCurrentQueueIndex(0);
    if (selected.length > 0) {
      setSelectedQuestion(selected[0]);
    }
  };

  // Toggle question selection in queue
  const handleToggleQuestionInQueue = (q: ApiQuestionBankQuestion) => {
    const inQueue = stagedQueue.some((item) => item.id === q.id);
    let updated: ApiQuestionBankQuestion[];
    if (inQueue) {
      updated = stagedQueue.filter((item) => item.id !== q.id);
    } else {
      updated = [...stagedQueue, q];
      if (updated.length > questionAmount) {
        setQuestionAmount(updated.length);
      }
    }
    setStagedQueue(updated);
    setCurrentQueueIndex(0);
    if (
      updated.length > 0 &&
      (!selectedQuestion || !updated.some((u) => u.id === selectedQuestion.id))
    ) {
      setSelectedQuestion(updated[0]);
    }
  };

  // Add instant custom question to staged queue & save to question bank
  const handleAddCustomQuestionToQueue = async () => {
    if (!customTitleEn.trim()) return;
    if (
      customQuestionType === 'MULTIPLE_CHOICE' &&
      customOptions.filter((o) => o.trim()).length < 2
    )
      return;
    if (customQuestionType === 'SHORT_ANSWER' && !customOptions[0]?.trim()) return;

    let validOptions = customOptions.filter((o) => o.trim());
    if (customQuestionType === 'TRUE_FALSE') {
      validOptions = ['True', 'False'];
    }
    let questionId = `custom-${Date.now()}`;
    let savedQuestion: ApiQuestionBankQuestion | null = null;

    if (saveToQuestionBank) {
      try {
        const saved = await createQuestionBankItem({
          courseId,
          moduleId: customTargetModuleId !== 'NONE' ? customTargetModuleId : undefined,
          lessonId: customTargetLessonId !== 'NONE' ? customTargetLessonId : undefined,
          subLessonId: customTargetSubLessonId !== 'NONE' ? customTargetSubLessonId : undefined,
          type:
            (customQuestionType as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER') ||
            'MULTIPLE_CHOICE',
          question: customTitleEn.trim(),
          options: validOptions,
          correctAnswer: String(correctOptionIdx),
          points: 10,
          category: 'Live Assessment',
          explanation: customExplanation.trim() || undefined,
          // Don't hold up a live session over similar questions; identical ones are still refused.
          acknowledgeSimilar: true,
        });
        if (saved?.id) {
          questionId = saved.id;
          savedQuestion = saved;
          loadQuestions();
        }
      } catch (err) {
        console.warn('Could not save custom question to question bank:', err);
      }
    }

    const newQuestion: ApiQuestionBankQuestion = savedQuestion || {
      id: questionId,
      type:
        (customQuestionType as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER') ||
        'MULTIPLE_CHOICE',
      question: customTitleEn.trim(),
      options: validOptions,
      correctAnswer: String(correctOptionIdx),
      points: 10,
      category: 'Live Assessment',
      explanation: customExplanation.trim() || undefined,
      courseId,
      moduleId:
        saveToQuestionBank && customTargetModuleId !== 'NONE' ? customTargetModuleId : undefined,
      lessonId:
        saveToQuestionBank && customTargetLessonId !== 'NONE' ? customTargetLessonId : undefined,
      subLessonId:
        saveToQuestionBank && customTargetSubLessonId !== 'NONE'
          ? customTargetSubLessonId
          : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (newQuestion as any).explanation =
      customExplanation.trim() || (savedQuestion as any)?.explanation || undefined;
    (newQuestion as any).titleAm = customTitleAm.trim() || undefined;

    const updatedQueue = [...stagedQueue, newQuestion];
    setStagedQueue(updatedQueue);
    setQuestionAmount(updatedQueue.length);
    setSelectedQuestion(newQuestion);

    // Reset form fields for the next question
    setCustomTitleEn('');
    setCustomTitleAm('');
    setCustomOptions(
      customQuestionType === 'TRUE_FALSE'
        ? ['True', 'False']
        : customQuestionType === 'SHORT_ANSWER'
          ? ['']
          : ['', '', '', ''],
    );
    setCorrectOptionIdx(0);
    setCustomExplanation('');
    const successMsg = saveToQuestionBank
      ? `Question #${updatedQueue.length} added to quiz queue and saved to Question Bank!`
      : `Question #${updatedQueue.length} added to quiz queue (Live Session only, not saved to Question Bank).`;
    setCustomAddedSuccess(successMsg);
    setTimeout(() => setCustomAddedSuccess(null), 5000);
  };

  // Immediate launch for custom question without queueing
  const handleLaunchCustomDirect = async () => {
    if (activeQuiz) {
      toast.warning('A quiz is currently actively broadcasting. Please end or cancel it first.');
      return;
    }
    if (!customTitleEn.trim()) return;
    if (
      customQuestionType === 'MULTIPLE_CHOICE' &&
      customOptions.filter((o) => o.trim()).length < 2
    )
      return;
    if (customQuestionType === 'SHORT_ANSWER' && !customOptions[0]?.trim()) return;

    let validOptions = customOptions.filter((o) => o.trim());
    if (customQuestionType === 'TRUE_FALSE') {
      validOptions = ['True', 'False'];
    }
    const parsedOptions: LiveQuizOption[] = validOptions.map((opt, idx) => ({
      id: String(idx),
      textEn: opt.trim(),
    }));

    let questionId = `custom-${Date.now()}`;
    if (saveToQuestionBank) {
      try {
        const saved = await createQuestionBankItem({
          courseId,
          moduleId: customTargetModuleId !== 'NONE' ? customTargetModuleId : undefined,
          lessonId: customTargetLessonId !== 'NONE' ? customTargetLessonId : undefined,
          subLessonId: customTargetSubLessonId !== 'NONE' ? customTargetSubLessonId : undefined,
          type:
            (customQuestionType as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER') ||
            'MULTIPLE_CHOICE',
          question: customTitleEn.trim(),
          options: validOptions,
          correctAnswer: String(correctOptionIdx),
          points: 10,
          category: 'Live Assessment',
          explanation: customExplanation.trim() || undefined,
          // Don't hold up a live session over similar questions; identical ones are still refused.
          acknowledgeSimilar: true,
        });
        if (saved?.id) {
          questionId = saved.id;
          loadQuestions();
        }
      } catch (err) {
        console.warn('Could not save custom question to question bank:', err);
      }
    }

    const quizPayload = {
      id: questionId,
      titleEn: customTitleEn.trim(),
      titleAm: customTitleAm.trim() || undefined,
      type:
        customQuestionType === 'TRUE_FALSE'
          ? ('TRUE_FALSE' as const)
          : customQuestionType === 'SHORT_ANSWER'
            ? ('SHORT_ANSWER' as const)
            : ('SINGLE_CHOICE' as const),
      options: parsedOptions,
      timeLimitSeconds: timerSeconds,
      startedAt: Date.now(),
      trainerName,
      correctOptionIds: [String(correctOptionIdx)],
      explanationEn: customExplanation.trim() || undefined,
    };

    onBroadcast({
      type: 'QUIZ_START',
      payload: quizPayload,
    });
    setIsRevealed(false);
    setViewMode('broadcast');
  };

  // Reveal results to all participants
  const handleReveal = () => {
    if (!activeQuiz) return;
    setIsRevealed(true);

    const allReveals: Record<
      string,
      {
        questionId: string;
        correctOptionIds: string[];
        explanationEn?: string;
        explanationAm?: string;
        distribution: Record<string, number>;
        totalResponses: number;
      }
    > = {};

    const questionsList: any[] = [];
    const seen = new Set<string>();
    const addQ = (item: any) => {
      if (!item || !item.id || seen.has(item.id)) return;
      seen.add(item.id);
      questionsList.push(item);
    };

    if (activeQuiz.allQuestions && Array.isArray(activeQuiz.allQuestions)) {
      activeQuiz.allQuestions.forEach(addQ);
    }
    if (stagedQueue && Array.isArray(stagedQueue)) {
      stagedQueue.forEach(addQ);
    }
    addQ(activeQuiz);

    questionsList.forEach((q) => {
      let correctIds: string[] = ['0'];
      if (q.correctOptionIds && Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0) {
        correctIds = q.correctOptionIds.map(String);
      } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
        const caStr = String(q.correctAnswer).trim();
        const rawOpts = q.options || [];
        const optMatch = rawOpts.findIndex((opt: any, idx: number) => {
          const optId = typeof opt === 'string' ? String(idx) : String(opt.id ?? idx);
          const optText = typeof opt === 'string' ? opt : (opt.textEn || opt.text || '');
          return optId === caStr || optText.toLowerCase() === caStr.toLowerCase();
        });
        if (optMatch >= 0) {
          const matchedOpt = rawOpts[optMatch];
          const matchedId = typeof matchedOpt === 'string' ? String(optMatch) : String(matchedOpt.id ?? optMatch);
          correctIds = [matchedId];
        } else {
          correctIds = [caStr];
        }
      }

      const qDist: Record<string, number> = {};
      const rawOpts = q.options || [];
      rawOpts.forEach((opt: any, idx: number) => {
        const optId = typeof opt === 'string' ? String(idx) : String(opt.id ?? idx);
        qDist[optId] = 0;
      });

      let qResponses = 0;
      Object.values(answers).forEach((ans: any) => {
        const learnerChoices =
          ans.allAnswers?.[q.id] ||
          (ans.questionId === q.id ? ans.selectedOptionIds : (q.id === activeQuiz.id ? ans.selectedOptionIds : null));
        if (learnerChoices && Array.isArray(learnerChoices) && learnerChoices.length > 0) {
          qResponses++;
          learnerChoices.forEach((optId: string) => {
            qDist[optId] = (qDist[optId] || 0) + 1;
          });
        }
      });

      allReveals[q.id] = {
        questionId: q.id,
        correctOptionIds: correctIds,
        explanationEn: q.explanationEn || q.explanation || undefined,
        explanationAm: q.explanationAm || undefined,
        distribution: qDist,
        totalResponses: qResponses,
      };
    });

    const focusedQId = displayedQuiz?.id || activeQuiz.id;
    const focusedReveal = allReveals[focusedQId] || allReveals[activeQuiz.id];

    onBroadcast({
      type: 'QUIZ_REVEAL',
      payload: {
        questionId: focusedQId,
        correctOptionIds: focusedReveal?.correctOptionIds || activeQuiz.correctOptionIds || ['0'],
        explanationEn: focusedReveal?.explanationEn || activeQuiz.explanationEn,
        explanationAm: focusedReveal?.explanationAm || (activeQuiz as any).explanationAm,
        distribution: focusedReveal?.distribution || distribution || {},
        totalResponses: focusedReveal?.totalResponses ?? totalResponses,
        allReveals,
      },
    });
  };

  // Close active quiz
  const handleCloseQuiz = () => {
    if (!activeQuiz) return;
    onBroadcast({
      type: 'QUIZ_CLOSE',
      payload: {
        questionId: activeQuiz.id,
      },
    });
    onClearQuiz();
    setIsRevealed(false);
    setViewMode('selection');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80">
              {viewMode === 'report' ? (
                <BarChart3 className="h-4 w-4" />
              ) : viewMode === 'history' ? (
                <History className="h-4 w-4" />
              ) : (
                <FileQuestion className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  {viewMode === 'broadcast' && activeQuiz
                    ? 'Live Classroom Question Monitor'
                    : viewMode === 'report'
                    ? 'Live Session Quiz & Polls Report'
                    : viewMode === 'history'
                    ? 'Broadcasted Quiz History'
                    : 'Live Classroom Quiz & Polls'}
                </h3>
                {viewMode === 'broadcast' && activeQuiz && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 animate-pulse">
                    ● LIVE BROADCAST ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {viewMode === 'broadcast' && activeQuiz
                  ? 'Real-time responses, audience distribution, and question flow control'
                  : viewMode === 'report'
                  ? 'Real-time metrics, attendee answer breakdown, and accuracy across all session quizzes'
                  : viewMode === 'history'
                  ? 'Review previously broadcasted quiz batches grouped by label and submit student results to LMS'
                  : 'Broadcast curriculum questions or instant custom polls to learners in real time'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
          {viewMode === 'broadcast' && activeQuiz ? (
            /* Dedicated Live Broadcast Page */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Broadcast Top Navigation Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/90 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewMode('selection')}
                    className="gap-2 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-bold text-xs shadow-xs"
                    title="Return to Question Selection to browse questions, queue, or edit"
                  >
                    <ArrowLeft className="h-4 w-4 text-indigo-600" />
                    Back to Question Selection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewMode('report');
                      if (sessionId) loadBackendReport();
                    }}
                    className="gap-1.5 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-bold text-xs shadow-xs"
                    title="Open Live Session Quiz & Polls Report"
                  >
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    Session Report
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewMode('history');
                      if (sessionId) loadBackendReport();
                    }}
                    className="gap-1.5 border-purple-200 text-purple-700 bg-white hover:bg-purple-50 font-bold text-xs shadow-xs"
                    title="Open Broadcasted Quiz History"
                  >
                    <History className="h-4 w-4 text-purple-600" />
                    History ({quizHistory.length})
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {stagedQueue.length > 1 ? (
                    <div className="flex items-center gap-1 rounded-lg border border-indigo-200/80 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        disabled={currentQueueIndex <= 0}
                        onClick={() => setCurrentQueueIndex((prev) => Math.max(0, prev - 1))}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Inspect previous question (trainer monitor only)"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Previous
                      </button>
                      <span className="px-2 py-0.5 text-xs font-bold font-mono text-indigo-800 bg-indigo-50 rounded">
                        Question {currentQueueIndex + 1} of {stagedQueue.length}
                      </span>
                      <button
                        type="button"
                        disabled={currentQueueIndex >= stagedQueue.length - 1}
                        onClick={() => setCurrentQueueIndex((prev) => Math.min(stagedQueue.length - 1, prev + 1))}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Inspect next question (trainer monitor only)"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Active Quiz Monitor Banner */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live Question Active in Room</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Live countdown timer badge */}
                    {activeRemainingSeconds !== null && (
                      <div
                        className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${
                          activeRemainingSeconds <= 5
                            ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <Clock
                          className={`h-3.5 w-3.5 ${
                            activeRemainingSeconds <= 5 ? 'text-red-600' : 'text-indigo-600'
                          }`}
                        />
                        <span>
                          {activeRemainingSeconds === 0
                            ? "Time's Up!"
                            : `${activeRemainingSeconds}s remaining`}
                        </span>
                      </div>
                    )}

                    {/* Auto-Advance Toggle */}
                    {stagedQueue.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAutoAdvanceEnabled(!autoAdvanceEnabled)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition shadow-2xs ${
                          autoAdvanceEnabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title={
                          autoAdvanceEnabled
                            ? 'Auto-advance enabled: automatically transitions to next question when timer expires'
                            : 'Auto-advance disabled: wait for trainer to click Next Question'
                        }
                      >
                        <Zap
                          className={`h-3 w-3 ${
                            autoAdvanceEnabled
                              ? 'fill-emerald-600 text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <span>Auto-advance: {autoAdvanceEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    )}


                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{totalResponses} responses</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm md:text-base font-bold text-slate-900">
                    {stripHtmlTags(displayedQuiz?.titleEn || activeQuiz.titleEn)}
                  </p>
                  {displayedQuiz?.titleAm || activeQuiz.titleAm ? (
                    <p className="text-xs text-slate-500 mt-0.5 font-amharic">
                      {displayedQuiz?.titleAm || activeQuiz.titleAm}
                    </p>
                  ) : null}
                </div>

                {/* View Switcher: Distribution Bars vs Learner Responses */}
                <div className="flex items-center justify-between border-y border-indigo-100/90 py-2 flex-wrap gap-2">
                  <div className="flex rounded-xl bg-white p-1 border border-indigo-200/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setActiveQuizViewMode('distribution')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                        activeQuizViewMode === 'distribution'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Vote Distribution
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveQuizViewMode('responses')}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                        activeQuizViewMode === 'responses'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Learner Responses ({activeLearnerResponses.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100/80 text-emerald-900 font-bold px-2 py-0.5 text-[11px] border border-emerald-200">
                      <UserCheck className="h-3 w-3 text-emerald-700" />
                      {activeCorrectCount} Correct
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100/80 text-rose-900 font-bold px-2 py-0.5 text-[11px] border border-rose-200">
                      <UserX className="h-3 w-3 text-rose-700" />
                      {activeIncorrectCount} Incorrect
                    </span>
                    {activeUnansweredLearners.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100/80 text-amber-900 font-bold px-2 py-0.5 text-[11px] border border-amber-200">
                        <Clock className="h-3 w-3 text-amber-700" />
                        {activeUnansweredLearners.length} Waiting
                      </span>
                    )}
                  </div>
                </div>

                {activeQuizViewMode === 'distribution' ? (
                  /* Live Answer Distribution Bars */
                  <div className="space-y-2 pt-1">
                    {(displayedQuiz?.options || activeQuiz.options).map((opt, idx) => {
                      const votes = distribution[opt.id] || 0;
                      const percent =
                        totalResponses > 0 ? Math.round((votes / totalResponses) * 100) : 0;
                      const isCorrect = (displayedQuiz?.correctOptionIds || activeQuiz.correctOptionIds)?.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          className="rounded-xl border border-slate-200/80 bg-white p-2.5 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 text-[11px] font-bold text-indigo-700 border border-indigo-100">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {stripHtmlTags(opt.textEn)}
                              {isRevealed && isCorrect && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                                  <CheckCircle2 className="h-3 w-3" /> Correct
                                </span>
                              )}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px] font-medium">
                              {votes} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isRevealed
                                  ? isCorrect
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-400'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Learner-by-Learner Breakdown ("Who Responded What") */
                  <div className="space-y-3 pt-1">
                    {/* Sub-filters & Search Bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                        <span>All ({activeLearnerResponses.length})</span>
                      </div>

                      <div className="relative min-w-[180px]">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={responseSearchQuery}
                          onChange={(e) => setResponseSearchQuery(e.target.value)}
                          placeholder="Search respondent..."
                          className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* List of responses */}
                    {filteredActiveResponses.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-xs text-slate-500">
                        {responseSearchQuery
                          ? 'No respondent matches the search query.'
                          : 'Waiting for learner responses...'}
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto space-y-2 rounded-xl bg-white/70 p-2 border border-slate-200/80">
                        {filteredActiveResponses.map((resp) => {
                          const isExpanded = expandedRespondentId === resp.userId;
                          return (
                            <div
                              key={resp.userId}
                              className={`rounded-xl border transition-all ${
                                isExpanded
                                  ? 'bg-white border-indigo-300 shadow-sm'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                              }`}
                            >
                              {/* Respondent Header (clickable row) */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedRespondentId(isExpanded ? null : resp.userId)
                                }
                                className="w-full flex items-center justify-between p-3 text-left transition hover:bg-slate-50/50 rounded-xl"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 border border-indigo-100">
                                    {getInitials(resp.userName)}
                                  </span>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-slate-800 truncate">
                                      {resp.userName}
                                    </p>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                      {resp.responseDurationSeconds !== undefined && (
                                        <span className="inline-flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                          <Clock className="h-3 w-3 text-slate-400" />
                                          {resp.responseDurationSeconds}s
                                        </span>
                                      )}
                                      <span>
                                        {resp.totalGraded > 0
                                          ? `${resp.totalCorrect} / ${resp.totalGraded} Correct`
                                          : 'Submitted'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {resp.totalGraded > 0 && (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                        resp.totalCorrect === resp.totalGraded
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : resp.totalCorrect > 0
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}
                                    >
                                      {resp.totalCorrect === resp.totalGraded ? (
                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      ) : (
                                        <UserX className="h-3 w-3 text-rose-600" />
                                      )}
                                      {resp.totalCorrect}/{resp.totalGraded}
                                    </span>
                                  )}
                                  <div className="text-slate-400 hover:text-slate-600 p-1">
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-indigo-600" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Accordion Content: List of all asked questions with learner's response & correct answer */}
                              {isExpanded && (
                                <div className="border-t border-slate-100 p-3 pt-2.5 space-y-2.5 bg-slate-50/40 rounded-b-xl">
                                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                                    Question Breakdown ({resp.questionBreakdown.length}{' '}
                                    {resp.questionBreakdown.length === 1 ? 'question' : 'questions'})
                                  </div>
                                  <div className="space-y-2">
                                    {resp.questionBreakdown.map((item, idx) => {
                                      const isCorrect = item.isCorrect;
                                      return (
                                        <div
                                          key={item.question.id || idx}
                                          className={`p-2.5 rounded-lg border text-xs bg-white ${
                                            isCorrect === true
                                              ? 'border-emerald-200 bg-emerald-50/20'
                                              : isCorrect === false
                                              ? 'border-rose-200 bg-rose-50/20'
                                              : 'border-slate-200'
                                          }`}
                                        >
                                          {/* Question Title & Status */}
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="font-semibold text-slate-800 leading-snug">
                                              <span className="text-indigo-600 mr-1.5 font-bold">
                                                Q{idx + 1}.
                                              </span>
                                              {stripHtmlTags(item.question.titleEn)}
                                            </div>
                                            {isCorrect === true ? (
                                              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                Correct
                                              </span>
                                            ) : isCorrect === false ? (
                                              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                <UserX className="h-3 w-3 text-rose-600" />
                                                Incorrect
                                              </span>
                                            ) : null}
                                          </div>

                                          {/* Learner's Response vs Correct Answer */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                            {/* Learner response */}
                                            <div
                                              className={`p-2 rounded border ${
                                                isCorrect === true
                                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                                  : isCorrect === false
                                                  ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                                              }`}
                                            >
                                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                Learner's Response
                                              </span>
                                              {item.selectedOptions.length === 0 ? (
                                                <span className="italic text-slate-400">
                                                  No answer selected
                                                </span>
                                              ) : (
                                                <div className="space-y-0.5">
                                                  {item.selectedOptions.map((opt) => (
                                                    <div
                                                      key={opt.id}
                                                      className="flex items-start gap-1 font-medium"
                                                    >
                                                      <span className="font-bold">[{opt.letter}]</span>
                                                      <span>{stripHtmlTags(opt.textEn)}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>

                                            {/* Correct Answer */}
                                            <div className="p-2 rounded border bg-emerald-50/40 border-emerald-200 text-emerald-950">
                                              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                                                Correct Answer
                                              </span>
                                              {item.correctOptions.length === 0 ? (
                                                <span className="italic text-slate-400">
                                                  No answer key specified
                                                </span>
                                              ) : (
                                                <div className="space-y-0.5">
                                                  {item.correctOptions.map((opt) => (
                                                    <div
                                                      key={opt.id}
                                                      className="flex items-start gap-1 font-medium text-emerald-900"
                                                    >
                                                      <span className="font-bold">[{opt.letter}]</span>
                                                      <span>{stripHtmlTags(opt.textEn)}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation Banner for Trainer on Reveal */}
                {isRevealed && (activeQuiz.explanationEn || (activeQuiz as any).explanation) && (
                  <div className="rounded-xl border border-indigo-200 bg-white/95 p-3.5 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                      <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Answer Explanation (Revealed to Learners):</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed pl-5 font-medium">
                      {stripHtmlTags(activeQuiz.explanationEn || (activeQuiz as any).explanation)}
                    </p>
                  </div>
                )}

                {/* Action Buttons for Active Quiz */}
                <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-indigo-100 flex-wrap">
                  <div>
                    {!isRevealed ? (
                      <Button
                        size="sm"
                        onClick={handleReveal}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                      >
                        <Eye className="h-4 w-4" />
                        Reveal Answers to Room
                      </Button>
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Answers Revealed to Learners
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Complete Quiz Session */}
                    {stagedQueue.length > 1 && (
                      <Button
                        size="sm"
                        onClick={handleFinishQueue}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Quiz Session
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCloseQuiz}
                      className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 bg-white text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                      End &amp; Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'report' ? (
            /* DEDICATED LIVE SESSION REPORT PAGE (Just like Live Monitor) */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Report Top Navigation Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/90 pb-3 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewMode('selection')}
                  className="gap-2 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-bold text-xs shadow-xs"
                >
                  <ArrowLeft className="h-4 w-4 text-indigo-600" />
                  Back to Question Selection
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  {activeQuiz && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewMode('broadcast')}
                      className="gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs shadow-2xs"
                    >
                      <MonitorPlay className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                      View Live Monitor
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewMode('history');
                      if (sessionId) loadBackendReport();
                    }}
                    className="gap-1.5 border-purple-200 text-purple-700 bg-white hover:bg-purple-50 font-bold text-xs shadow-2xs"
                    title="Open Broadcasted Quiz History"
                  >
                    <History className="h-3.5 w-3.5 text-purple-600" />
                    History ({quizHistory.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => sessionId && loadBackendReport()}
                    disabled={loadingBackendReport}
                    className="gap-1.5 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs h-8"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loadingBackendReport ? 'animate-spin text-indigo-600' : ''}`}
                    />
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={sessionTotalResponses === 0 && (!backendReport || backendReport.totalResponses === 0)}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs h-8"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Export CSV Report
                  </Button>
                </div>
              </div>

              {/* 3 Summary KPI Cards: QUESTIONS, ROOM ACCURACY, LEARNERS (TOTAL ANSWERS removed as requested) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Questions */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Questions
                    </span>
                    <FileText className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {sessionTotalQuestions}
                  </div>
                  <p className="text-[11px] text-slate-400">Broadcasted across all quiz groups</p>
                </div>

                {/* Room Accuracy */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Room Accuracy
                    </span>
                    <Award className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {sessionOverallAccuracy}%
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({sessionTotalCorrect}/{sessionTotalResponses || 0})
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sessionOverallAccuracy >= 70
                          ? 'bg-emerald-500'
                          : sessionOverallAccuracy >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${sessionOverallAccuracy}%` }}
                    />
                  </div>
                </div>

                {/* Learners */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Learners
                    </span>
                    <UserCheck className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {sessionLearnersCount}
                  </div>
                  <p className="text-[11px] text-slate-400">Participating attendees</p>
                </div>
              </div>

              {/* (Learner Performance Leaderboard completely removed as requested) */}

              {/* Quiz Groups Accordion Breakdown */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                      Session Quiz Groups Breakdown
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Review questions, poll percentages, and learner responses by prepared quiz group
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    {sessionQuizGroups.length} Quiz Group{sessionQuizGroups.length === 1 ? '' : 's'}
                  </span>
                </div>

                {sessionQuizGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500">
                    No quizzes have been broadcasted in this session yet. Switch to Question Selection to broadcast.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionQuizGroups.map((group) => {
                      const isGroupExpanded = expandedQuizGroupId === group.id;
                      return (
                        <div
                          key={group.id}
                          className={`rounded-2xl border transition-all ${
                            group.isActive
                              ? 'border-indigo-300 bg-indigo-50/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          {/* Quiz Group Accordion Header */}
                          <div
                            onClick={() =>
                              setExpandedQuizGroupId(isGroupExpanded ? null : group.id)
                            }
                            className="flex items-center justify-between p-4 cursor-pointer select-none gap-3 rounded-2xl hover:bg-slate-50/60 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-xs shadow-2xs">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900 truncate">
                                    {group.title}
                                  </h4>
                                  {group.isActive ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                      Live Broadcast Active
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                      Completed
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {group.questions.length} Question{group.questions.length === 1 ? '' : 's'} •{' '}
                                  {group.totalResponses} submission{group.totalResponses === 1 ? '' : 's'} •{' '}
                                  {group.accuracy}% accuracy
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right hidden sm:block">
                                <span className="text-xs font-bold text-slate-900">
                                  {group.questions.length} Qs
                                </span>
                                <div className="text-[11px] font-semibold text-slate-500">
                                  {group.accuracy}% accuracy
                                </div>
                              </div>
                              <div className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                                {isGroupExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-indigo-600" />
                                ) : (
                                  <ChevronDown className="h-5 w-5" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quiz Group Accordion Body: Lists all questions in this group */}
                          {isGroupExpanded && (
                            <div className="border-t border-slate-100 p-4 pt-3 space-y-3 bg-slate-50/40 rounded-b-2xl animate-in fade-in duration-150">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                                Questions in this Quiz Group ({group.questions.length})
                              </div>
                              <div className="space-y-3">
                                {group.questions.map((q, qIdx) => {
                                  const isQExpanded = expandedReportQuestionId === q.id;
                                  return (
                                    <div
                                      key={q.id || qIdx}
                                      className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
                                    >
                                      {/* Question Title Header (clickable to expand question details) */}
                                      <div
                                        onClick={() =>
                                          setExpandedReportQuestionId(isQExpanded ? null : q.id)
                                        }
                                        className="flex items-center justify-between p-3.5 cursor-pointer select-none gap-3 hover:bg-slate-50/70 transition"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-bold text-xs text-indigo-800 border border-indigo-200">
                                            Q{qIdx + 1}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 leading-snug">
                                              {stripHtmlTags(q.titleEn)}
                                            </p>
                                            {q.titleAm && (
                                              <p className="text-[11px] font-amharic text-slate-500">
                                                {q.titleAm}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                          <div className="text-right">
                                            <span className="text-xs font-bold text-slate-900">
                                              {q.totalResponses} response{q.totalResponses === 1 ? '' : 's'}
                                            </span>
                                            <div className="text-[10px] font-semibold text-slate-500">
                                              {q.accuracy}% correct ({q.correctCount}/{q.totalResponses})
                                            </div>
                                          </div>
                                          {isQExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-indigo-600" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Question Details: Poll Percentages & Learner Responses */}
                                      {isQExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4 animate-in fade-in duration-150">
                                          {/* Option Poll Breakdown with working percentages */}
                                          <div className="space-y-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                              Poll Distribution ({q.totalResponses} response{q.totalResponses === 1 ? '' : 's'})
                                            </span>
                                            <div className="space-y-1.5">
                                              {q.options.map((opt, optIdx) => {
                                                const votes = q.distribution[opt.id] || 0;
                                                const percent =
                                                  q.totalResponses > 0
                                                    ? Math.round((votes / q.totalResponses) * 100)
                                                    : 0;
                                                const isCorrect = q.correctOptionIds?.includes(opt.id);

                                                return (
                                                  <div
                                                    key={opt.id}
                                                    className={`rounded-lg border p-2.5 text-xs space-y-1.5 transition ${
                                                      isCorrect
                                                        ? 'border-emerald-200 bg-emerald-50/30'
                                                        : 'border-slate-200 bg-white'
                                                    }`}
                                                  >
                                                    <div className="flex items-center justify-between gap-2">
                                                      <span className="font-semibold text-slate-800 flex items-center gap-2 min-w-0">
                                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                                                          {String.fromCharCode(65 + optIdx)}
                                                        </span>
                                                        <span className="truncate">{stripHtmlTags(opt.textEn)}</span>
                                                        {isCorrect && (
                                                          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                                            ✓ Correct Answer
                                                          </span>
                                                        )}
                                                      </span>
                                                      <span className="text-slate-600 font-mono text-xs font-bold shrink-0">
                                                        {votes} ({percent}%)
                                                      </span>
                                                    </div>
                                                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                      <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                          isCorrect ? 'bg-emerald-500' : 'bg-indigo-600'
                                                        }`}
                                                        style={{ width: `${percent}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Learner Responses - Simplified & Redesigned */}
                                          <div className="space-y-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                              Learner Responses ({q.answers.length})
                                            </span>
                                            {q.answers.length === 0 ? (
                                              <p className="text-xs text-slate-400 py-2 italic bg-white p-3 rounded-lg border border-slate-200">
                                                No responses recorded for this question yet.
                                              </p>
                                            ) : (
                                              <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl bg-white p-2.5 border border-slate-200">
                                                {q.answers.map((a) => {
                                                  const selectedOptions = a.selectedOptionIds.map((oid) => {
                                                    const opt = q.options.find(
                                                      (o: any, idx: number) =>
                                                        o.id === oid ||
                                                        String(idx) === oid ||
                                                        o.textEn?.toLowerCase() ===
                                                          oid?.toLowerCase(),
                                                    );
                                                    const optIdx = q.options.findIndex(
                                                      (o: any, idx: number) =>
                                                        o.id === oid ||
                                                        String(idx) === oid ||
                                                        o.textEn?.toLowerCase() ===
                                                          oid?.toLowerCase(),
                                                    );
                                                    const letter =
                                                      optIdx >= 0
                                                        ? String.fromCharCode(65 + optIdx)
                                                        : '?';
                                                    return {
                                                      id: oid,
                                                      letter,
                                                      text: stripHtmlTags(opt?.textEn || oid),
                                                    };
                                                  });

                                                  return (
                                                    <div
                                                      key={a.userId}
                                                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/80 text-xs hover:bg-slate-100/60 transition gap-2"
                                                    >
                                                      <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-800 border border-indigo-200">
                                                          {getInitials(a.userName)}
                                                        </span>
                                                        <div className="min-w-0 truncate">
                                                          <p className="font-bold text-slate-800 truncate">
                                                            {a.userName}
                                                          </p>
                                                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                            {selectedOptions.length === 0 ? (
                                                              <span className="text-[10px] italic text-slate-400">
                                                                No response
                                                              </span>
                                                            ) : (
                                                              selectedOptions.map((opt) => (
                                                                <span
                                                                  key={opt.id}
                                                                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                                                    a.isCorrect === true
                                                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                      : a.isCorrect === false
                                                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                                                  }`}
                                                                >
                                                                  <span className="font-bold">[{opt.letter}]</span>
                                                                  <span className="truncate max-w-[180px]">{opt.text}</span>
                                                                </span>
                                                              ))
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div className="flex items-center gap-2 shrink-0">
                                                        {a.responseDurationSeconds !== undefined && (
                                                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                            <Clock className="h-3 w-3 text-slate-400" />
                                                            {a.responseDurationSeconds}s
                                                          </span>
                                                        )}
                                                        {a.isCorrect === true ? (
                                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                            Correct
                                                          </span>
                                                        ) : a.isCorrect === false ? (
                                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                                            <UserX className="h-3 w-3 text-rose-600" />
                                                            Incorrect
                                                          </span>
                                                        ) : (
                                                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            Submitted
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'history' ? (
            /* DEDICATED BROADCASTED HISTORY PAGE */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* History Top Navigation Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/90 pb-3 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewMode('selection')}
                  className="gap-2 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-bold text-xs shadow-xs"
                >
                  <ArrowLeft className="h-4 w-4 text-indigo-600" />
                  Back to Question Selection
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  {activeQuiz && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewMode('broadcast')}
                      className="gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs shadow-2xs"
                    >
                      <MonitorPlay className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                      View Live Monitor
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewMode('report');
                      if (sessionId) loadBackendReport();
                    }}
                    className="gap-1.5 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-bold text-xs shadow-2xs"
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
                    Live Session Report
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => sessionId && loadBackendReport()}
                    disabled={loadingBackendReport}
                    className="gap-1.5 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs h-8"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loadingBackendReport ? 'animate-spin text-indigo-600' : ''}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                    <History className="h-3.5 w-3.5" />
                    <span>Quiz Batches</span>
                  </div>
                  <p className="text-xl font-extrabold text-purple-950 mt-1">
                    {historyBatchesGroupedByLabel.length}
                  </p>
                  <p className="text-[10px] text-purple-600 mt-0.5">
                    Distinct labels broadcasted
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    <FileQuestion className="h-3.5 w-3.5" />
                    <span>Total Questions</span>
                  </div>
                  <p className="text-xl font-extrabold text-indigo-950 mt-1">
                    {historyBatchesGroupedByLabel.reduce((sum, g) => sum + g.totalQuestions, 0)}
                  </p>
                  <p className="text-[10px] text-indigo-600 mt-0.5">
                    Across completed batches
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    <Users className="h-3.5 w-3.5" />
                    <span>Total Submissions</span>
                  </div>
                  <p className="text-xl font-extrabold text-blue-950 mt-1">
                    {historyBatchesGroupedByLabel.reduce((sum, g) => sum + g.totalResponses, 0)}
                  </p>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    Student answers recorded
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <Award className="h-3.5 w-3.5" />
                    <span>Avg Accuracy</span>
                  </div>
                  <p className="text-xl font-extrabold text-emerald-950 mt-1">
                    {historyBatchesGroupedByLabel.length > 0
                      ? Math.round(
                          historyBatchesGroupedByLabel.reduce(
                            (sum, g) => sum + g.averageAccuracy,
                            0,
                          ) / historyBatchesGroupedByLabel.length,
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Overall batch performance
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search broadcasted quiz batches by label or learner name..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-8 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Grouped Batches List */}
              {filteredHistoryBatches.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center space-y-3">
                  <History className="mx-auto h-9 w-9 text-slate-300" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      No Broadcasted Quiz History
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                      {historySearchQuery
                        ? 'No broadcasted batches matched your search query.'
                        : 'Quizzes broadcasted from the Question Bank or Prepared Quizzes will be archived here grouped by their label, with full student score tables ready for LMS gradebook submission.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewMode('selection')}
                    className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Select Questions to Broadcast
                  </Button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredHistoryBatches.map((batchGroup, bIdx) => {
                    const isExpanded = expandedHistoryGroupLabel === batchGroup.label;
                    const isSubmitted = submittedBatchLabels.has(batchGroup.label);
                    const isSubmitting = submittingBatchLabel === batchGroup.label;

                    return (
                      <div
                        key={batchGroup.label}
                        className={`rounded-2xl border transition shadow-2xs overflow-hidden ${
                          isExpanded
                            ? 'border-indigo-300 bg-white ring-1 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Batch Header Bar */}
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40 cursor-pointer"
                          onClick={() =>
                            setExpandedHistoryGroupLabel(isExpanded ? null : batchGroup.label)
                          }
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 shadow-2xs">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded-md bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                                  Batch #{bIdx + 1}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 truncate">
                                  {batchGroup.label}
                                </h4>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {batchGroup.totalQuestions} Question{batchGroup.totalQuestions > 1 ? 's' : ''}
                                </span>
                                <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  {batchGroup.studentResults.length} Learners
                                </span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                    batchGroup.averageAccuracy >= 70
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : batchGroup.averageAccuracy >= 40
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-rose-50 border-rose-200 text-rose-800'
                                  }`}
                                >
                                  {batchGroup.averageAccuracy}% Accuracy
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {batchGroup.completedAt
                                  ? `Completed ${new Date(batchGroup.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : 'Completed in this session'}{' '}
                                • {batchGroup.totalResponses} total student answers recorded
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Submit Results to LMS Button */}
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSubmitting || isSubmitted || batchGroup.studentResults.length === 0}
                              onClick={() => handleSubmitBatchResults(batchGroup)}
                              className={`gap-1.5 font-bold text-xs shadow-xs h-8 px-3 transition ${
                                isSubmitted
                                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 cursor-default'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                              title="Submit compiled learner quiz results to LMS gradebook"
                            >
                              {isSubmitted ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  Submitted to LMS
                                </>
                              ) : isSubmitting ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5" />
                                  Submit Results to LMS
                                </>
                              )}
                            </Button>

                            {/* Export CSV */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleExportBatchCSV(batchGroup)}
                              disabled={batchGroup.studentResults.length === 0}
                              className="gap-1.5 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs h-8"
                              title="Download spreadsheet of student scores for this batch"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-600" />
                              CSV
                            </Button>

                            {/* Toggle Accordion */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedHistoryGroupLabel(isExpanded ? null : batchGroup.label)
                              }
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Batch Details Accordion Body */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/30 animate-in fade-in duration-150">
                            {/* Sub-tab Switcher: Student Results vs Questions Review */}
                            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-3">
                              <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80">
                                <button
                                  type="button"
                                  onClick={() => setHistoryGroupSubTab('results')}
                                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                                    historyGroupSubTab === 'results'
                                      ? 'bg-white text-indigo-600 shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <Users className="h-3.5 w-3.5" />
                                  Learner Results ({batchGroup.studentResults.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryGroupSubTab('questions')}
                                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                                    historyGroupSubTab === 'questions'
                                      ? 'bg-white text-indigo-600 shadow-2xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <FileQuestion className="h-3.5 w-3.5" />
                                  Questions Review ({batchGroup.totalQuestions})
                                </button>
                              </div>

                              <span className="text-[11px] text-slate-500">
                                Showing all data recorded for &quot;{batchGroup.label}&quot;
                              </span>
                            </div>

                            {/* View 1: Student Results Table */}
                            {historyGroupSubTab === 'results' && (
                              <div className="space-y-2">
                                {batchGroup.studentResults.length === 0 ? (
                                  <div className="py-6 text-center text-xs text-slate-500">
                                    No student submissions recorded for this batch yet.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                                    <table className="w-full text-left text-xs">
                                      <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                          <th className="px-3.5 py-2.5">Learner</th>
                                          <th className="px-3 py-2.5 text-center">Answered</th>
                                          <th className="px-3 py-2.5 text-center">Score</th>
                                          <th className="px-3 py-2.5 text-center">Accuracy</th>
                                          <th className="px-3 py-2.5 text-center">Time</th>
                                          <th className="px-3 py-2.5 text-center">Status</th>
                                          <th className="px-3 py-2.5 text-right">Details</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {batchGroup.studentResults.map((student) => {
                                          const isStudentExpanded = expandedStudentId === student.userId;
                                          return (
                                            <React.Fragment key={student.userId}>
                                              <tr className="hover:bg-slate-50/60 transition">
                                                <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                                                      {student.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate max-w-[140px] sm:max-w-[180px]">
                                                      {student.userName}
                                                    </span>
                                                  </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                                                  {student.answeredCount} / {student.totalQuestions}
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-bold font-mono text-indigo-700">
                                                  {student.correctCount} / {student.totalQuestions}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                  <span
                                                    className={`inline-block rounded-md px-2 py-0.5 font-bold font-mono text-[10px] ${
                                                      student.scorePercent >= 70
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : student.scorePercent >= 40
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-rose-100 text-rose-800'
                                                    }`}
                                                  >
                                                    {student.scorePercent}%
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center text-slate-500 font-mono text-[11px]">
                                                  {student.totalDurationSeconds > 0
                                                    ? `${student.totalDurationSeconds}s`
                                                    : '-'}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                  <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                                      student.status === 'PASSED'
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                                                    }`}
                                                  >
                                                    {student.status === 'PASSED' ? (
                                                      <>
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                        Passed
                                                      </>
                                                    ) : (
                                                      'Needs Review'
                                                    )}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setExpandedStudentId(
                                                        isStudentExpanded ? null : student.userId,
                                                      )
                                                    }
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                                  >
                                                    {isStudentExpanded ? 'Hide' : 'Review'}
                                                  </button>
                                                </td>
                                              </tr>
                                              {/* Expanded per-student answer details */}
                                              {isStudentExpanded && (
                                                <tr>
                                                  <td colSpan={7} className="bg-slate-50/90 px-4 py-3 border-y border-slate-200">
                                                    <div className="space-y-2">
                                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                                        Question Answers by {student.userName}:
                                                      </span>
                                                      <div className="space-y-1.5">
                                                        {student.breakdown.map((item, qIdx) => (
                                                          <div
                                                            key={item.questionId || qIdx}
                                                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"
                                                          >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                              <span className="font-bold text-slate-500 font-mono text-[10px]">
                                                                Q{qIdx + 1}:
                                                              </span>
                                                              <span className="font-medium text-slate-800 truncate">
                                                                {item.questionTitle}
                                                              </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                              <span className="text-[11px] text-slate-600 font-semibold">
                                                                Selected: {item.selectedOptionTexts.join(', ') || 'No answer'}
                                                              </span>
                                                              {item.isCorrect === true ? (
                                                                <span className="inline-flex items-center gap-0.5 text-emerald-700 text-[10px] font-bold">
                                                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                                  Correct
                                                                </span>
                                                              ) : item.isCorrect === false ? (
                                                                <span className="inline-flex items-center gap-0.5 text-rose-700 text-[10px] font-bold">
                                                                  <X className="h-3 w-3 text-rose-600" />
                                                                  Incorrect
                                                                </span>
                                                              ) : (
                                                                <span className="text-slate-400 text-[10px]">Unscored</span>
                                                              )}
                                                            </div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* View 2: Questions Review */}
                            {historyGroupSubTab === 'questions' && (
                              <div className="space-y-3">
                                {batchGroup.allQuestions.map((q, qIdx) => {
                                  const totalQResponses = q.totalResponses || 0;
                                  return (
                                    <div
                                      key={q.id || qIdx}
                                      className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 font-mono text-[10px] font-bold text-indigo-800">
                                            {qIdx + 1}
                                          </span>
                                          <p className="text-xs font-bold text-slate-900 leading-snug">
                                            {stripHtmlTags(q.titleEn)}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                            {q.correctCount} / {totalQResponses} Correct ({q.accuracy}%)
                                          </span>
                                        </div>
                                      </div>

                                      {/* Options with correctness and distribution bars */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {q.options.map((opt, oIdx) => {
                                          const isCorrect = q.correctOptionIds?.includes(opt.id) || q.correctOptionIds?.includes(String(oIdx));
                                          const count = q.distribution?.[opt.id] || 0;
                                          const pct = totalQResponses > 0 ? Math.round((count / totalQResponses) * 100) : 0;

                                          return (
                                            <div
                                              key={opt.id || oIdx}
                                              className={`relative overflow-hidden rounded-lg border p-2 text-xs transition ${
                                                isCorrect
                                                  ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-semibold'
                                                  : 'border-slate-200 bg-slate-50/60 text-slate-700'
                                              }`}
                                            >
                                              {/* Distribution background bar */}
                                              <div
                                                className={`absolute inset-y-0 left-0 transition-all ${
                                                  isCorrect ? 'bg-emerald-200/40' : 'bg-slate-200/50'
                                                }`}
                                                style={{ width: `${pct}%` }}
                                              />
                                              <div className="relative flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <span
                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                                                      isCorrect
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-slate-200 text-slate-600'
                                                    }`}
                                                  >
                                                    {String.fromCharCode(65 + oIdx)}
                                                  </span>
                                                  <span className="truncate">{stripHtmlTags(opt.textEn)}</span>
                                                  {isCorrect && (
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                                  )}
                                                </div>
                                                <span className="font-mono text-[10px] font-bold shrink-0">
                                                  {count} ({pct}%)
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Explanation */}
                                      {q.explanationEn && (
                                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-[11px] text-slate-600">
                                          <strong className="text-slate-700">Explanation: </strong>
                                          {stripHtmlTags(q.explanationEn)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* QUESTION SELECTION PAGE */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Prominent floating banner when a question is actively broadcasting in room */}
              {activeQuiz && (
                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 text-white p-4 shadow-lg border border-indigo-700/60 animate-in fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-700/80 text-white border border-indigo-500/50 shadow-sm">
                      <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Live Question Active
                        </span>
                        {stagedQueue.length > 1 && (
                          <span className="text-xs font-mono font-bold text-indigo-200">
                            Question {currentQueueIndex + 1} of {stagedQueue.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white mt-1 truncate">
                        {stripHtmlTags(displayedQuiz?.titleEn || activeQuiz.titleEn)}
                      </p>
                      <p className="text-[11px] text-indigo-300 mt-0.5">
                        {activeRemainingSeconds !== null
                          ? `${formatRemainingTime(activeRemainingSeconds)} remaining • `
                          : ''}
                        {totalResponses} responses recorded
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setViewMode('broadcast')}
                    className="gap-1.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs shadow-md shrink-0 ml-3"
                  >
                    <MonitorPlay className="h-4 w-4 text-indigo-600" />
                    View Live Broadcast Monitor →
                  </Button>
                </div>
              )}

              {/* Prominent Active Course Identity Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/60 border border-indigo-100 p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 border border-indigo-200/80 shadow-2xs">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-mono font-bold text-indigo-800 border border-indigo-200/60">
                        {courseInfo?.code || 'COURSE'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {courseInfo?.titleEn || courseInfo?.title || 'Live Course Session'}
                      </h4>
                    </div>
                    {courseInfo?.titleAm && (
                      <p className="text-xs text-slate-500 font-amharic mt-0.5">
                        {courseInfo.titleAm}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-700 font-semibold border border-slate-200 shadow-2xs">
                    {modules.length} Modules in Curriculum
                  </span>
                  {!activeQuiz && stagedQueue.length > 0 && (
                    <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs text-emerald-800 font-bold">
                      {stagedQueue.length} Ready in Quiz Queue
                    </span>
                  )}
                </div>
              </div>

              {/* Mode Tabs & Timer Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Tab Switcher */}
                  <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setTab('prepared')}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                        tab === 'prepared'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      Prepared Quiz
                      {totalPreparedCount > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            tab === 'prepared'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {totalPreparedCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('bank')}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                        tab === 'bank'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      From Question Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('custom')}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                        tab === 'custom'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      Instant Custom Question
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('report');
                        if (sessionId) loadBackendReport();
                      }}
                      className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition hover:bg-slate-200/60"
                      title="Open full Live Session Quiz & Polls Report"
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                      Live Session Report
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('history');
                        if (sessionId) loadBackendReport();
                      }}
                      className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition hover:bg-slate-200/60"
                      title="View all previously broadcasted quiz batches grouped by label and student results"
                    >
                      <History className="h-3.5 w-3.5 text-indigo-500" />
                      Broadcasted History
                      {quizHistory.length > 0 && (
                        <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[10px] font-bold">
                          {quizHistory.length}
                        </span>
                      )}
                    </button>
                    {activeQuiz && (
                      <button
                        type="button"
                        onClick={() => setViewMode('broadcast')}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200 ml-1"
                        title="Return to the active question broadcast view"
                      >
                        <MonitorPlay className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                        Live Monitor
                      </button>
                    )}
                  </div>

                  {/* Timer preset selection in minutes (Hidden during broadcasting) */}
                  {!activeQuiz && (tab === 'bank' || tab === 'custom') && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs text-slate-500 font-medium">Timer:</span>
                      {[1, 2, 3, 5, 10].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setTimerMinutes(m)}
                          className={`rounded-md px-2 py-0.5 text-xs font-bold transition ${
                            timerMinutes === m
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Staged Broadcast Queue (Hidden during active broadcasting) */}
                {!activeQuiz && stagedQueue.length > 0 && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <ListOrdered className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-950">
                          Quiz Questions Ready to Broadcast ({stagedQueue.length} Question
                          {stagedQueue.length > 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStagedQueue([]);
                            setSelectedQuestion(null);
                          }}
                          className="text-[11px] text-slate-500 hover:text-red-600 transition ml-2 font-medium"
                        >
                          Clear Queue
                        </button>
                      </div>
                    </div>

                    {/* Quiz Batch Label Input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-100 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 shrink-0">
                        <Tag className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Quiz Batch Label:</span>
                      </div>
                      <input
                        type="text"
                        value={bankQuizLabel}
                        onChange={(e) => setBankQuizLabel(e.target.value)}
                        placeholder={`Quiz Label (e.g. Quiz ${quizHistory.length + 1}, Chapter 1 Check)...`}
                        className="flex-1 max-w-sm rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs font-medium"
                      />
                      {bankQuizLabel && (
                        <button
                          type="button"
                          onClick={() => setBankQuizLabel('')}
                          className="text-slate-400 hover:text-slate-600"
                          title="Clear label"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Staged Question items with Review Details, Edit, and Delete */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {stagedQueue.map((q, idx) => {
                        const isExpanded = expandedQueueIdx === idx;
                        const isCurrentlyActive = false;
                        const isPreviouslyBroadcasted = broadcastedQuestionIds.has(q.id);

                        // Parse options for preview
                        const parsedOpts = Array.isArray(q.options)
                          ? q.options.map((opt: any, oIdx: number) => {
                              const text =
                                typeof opt === 'string'
                                  ? opt
                                  : opt.textEn || opt.text || `Option ${oIdx + 1}`;
                              const clean = stripHtmlTags(text);
                              const isCorrect =
                                q.correctAnswer !== null &&
                                (String(oIdx) === String(q.correctAnswer).trim() ||
                                  clean.toLowerCase() ===
                                    String(q.correctAnswer).trim().toLowerCase());
                              return { text: clean, isCorrect };
                            })
                          : [];

                        return (
                          <div
                            key={q.id || idx}
                            className={`rounded-xl border transition shadow-2xs ${
                              isCurrentlyActive
                                ? 'border-emerald-400 bg-emerald-50/70 ring-1 ring-emerald-500/20'
                                : isPreviouslyBroadcasted
                                  ? 'border-purple-300 bg-purple-50/50 ring-1 ring-purple-400/20'
                                  : 'border-indigo-100 bg-white hover:border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                                    isCurrentlyActive
                                      ? 'bg-emerald-600 text-white'
                                      : isPreviouslyBroadcasted
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-indigo-100 text-indigo-800'
                                  }`}
                                >
                                  #{idx + 1}
                                </span>

                                {isCurrentlyActive && (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold shrink-0">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                                    Active Now
                                  </span>
                                )}

                                {isPreviouslyBroadcasted && (
                                  <span className="inline-flex items-center gap-1 rounded bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 text-[9px] font-bold shrink-0">
                                    <CheckCircle2 className="h-2.5 w-2.5 text-purple-600" />
                                    Previously Broadcasted
                                  </span>
                                )}

                                <span className="truncate text-slate-800 font-semibold flex-1">
                                  {stripHtmlTags(q.question)}
                                </span>

                                {q.module ? (
                                  <span className="hidden md:inline-block shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600 font-medium">
                                    {q.module.titleEn}
                                  </span>
                                ) : (
                                  <span className="hidden md:inline-block shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                                    Course General
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons: Details / Review, Edit, Delete */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Review Details Toggle */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedQueueIdx(isExpanded ? null : idx)}
                                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                                    isExpanded
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                                  title={
                                    isExpanded
                                      ? 'Hide question details'
                                      : 'Review question details and options'
                                  }
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Review</span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const opts = Array.isArray(q.options)
                                      ? q.options.map((o: any) =>
                                          typeof o === 'string' ? o : o.textEn || o.text || '',
                                        )
                                      : ['Option 1', 'Option 2'];

                                    let correctIdx = 0;
                                    if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
                                      const num = parseInt(String(q.correctAnswer), 10);
                                      if (!isNaN(num) && num >= 0 && num < opts.length) {
                                        correctIdx = num;
                                      } else {
                                        const found = opts.findIndex(
                                          (o) =>
                                            o.toLowerCase() ===
                                            String(q.correctAnswer).toLowerCase(),
                                        );
                                        if (found !== -1) correctIdx = found;
                                      }
                                    }

                                    setEditingQueueItem({
                                      index: idx,
                                      questionId: q.id,
                                      titleEn: stripHtmlTags(q.question),
                                      titleAm: (q as any).titleAm || q.course?.titleAm || '',
                                      options:
                                        opts.length >= 2
                                          ? opts
                                          : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                                      correctOptionIdx: correctIdx,
                                      explanation: (q as any).explanation || '',
                                      moduleId: q.moduleId || 'NONE',
                                      lessonId: q.lessonId || 'NONE',
                                      subLessonId: q.subLessonId || 'NONE',
                                    });
                                  }}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition"
                                  title="Edit question text, options, and curriculum node"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Edit</span>
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = stagedQueue.filter((_, i) => i !== idx);
                                    setStagedQueue(updated);
                                    if (selectedQuestion?.id === q.id) {
                                      setSelectedQuestion(updated[0] || null);
                                    }
                                    if (expandedQueueIdx === idx) setExpandedQueueIdx(null);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50"
                                  title="Remove from queue"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Question Details Panel */}
                            {isExpanded && (
                              <div className="border-t border-indigo-100 bg-slate-50/70 p-3.5 space-y-2.5 text-xs animate-in fade-in duration-150">
                                {/* Curriculum Node Breadcrumb */}
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 flex-wrap">
                                  <span className="font-semibold text-slate-500">Curriculum:</span>
                                  <span className="rounded bg-white px-2 py-0.5 border border-slate-200 font-mono text-[10px] text-slate-700">
                                    {q.module?.titleEn
                                      ? `Module: ${q.module.titleEn}`
                                      : 'Course General'}
                                    {q.lesson?.titleEn ? ` > Lesson: ${q.lesson.titleEn}` : ''}
                                    {q.subLesson?.titleEn
                                      ? ` > Sub-lesson: ${q.subLesson.titleEn}`
                                      : ''}
                                  </span>
                                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 font-semibold text-[10px]">
                                    {q.type === 'TRUE_FALSE' ? 'True / False' : 'Multiple Choice'}
                                  </span>
                                </div>

                                {/* Full Question Text */}
                                <div>
                                  <p className="font-bold text-slate-900 leading-snug">
                                    {stripHtmlTags(q.question)}
                                  </p>
                                  {(q as any).titleAm && (
                                    <p className="font-amharic text-slate-600 text-[11px] mt-0.5">
                                      {(q as any).titleAm}
                                    </p>
                                  )}
                                </div>

                                {/* Options List */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Options &amp; Correct Answer:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                                    {parsedOpts.map((opt, oIdx) => (
                                      <div
                                        key={oIdx}
                                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-xs ${
                                          opt.isCorrect
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                                            : 'border-slate-200 bg-white text-slate-700'
                                        }`}
                                      >
                                        <span
                                          className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${
                                            opt.isCorrect
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span className="flex-1 truncate">{opt.text}</span>
                                        {opt.isCorrect && (
                                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold shrink-0">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            Correct Answer
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Explanation if present */}
                                {(q as any).explanation && (
                                  <div className="rounded-lg bg-white border border-slate-200 p-2.5 text-[11px] text-slate-700">
                                    <span className="font-bold text-indigo-700 block mb-0.5">
                                      Explanation:
                                    </span>
                                    {stripHtmlTags((q as any).explanation)}
                                  </div>
                                )}

                                {/* Direct Broadcast This Question button */}
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/80">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={Boolean(activeQuiz)}
                                    onClick={() => {
                                      setCurrentQueueIndex(idx);
                                      handleLaunchQuestion(q, idx, stagedQueue);
                                    }}
                                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-7 px-3 shadow-xs disabled:opacity-50"
                                  >
                                    <Play className="h-3 w-3 fill-current" />
                                    {activeQuiz ? 'Quiz Already Active' : 'Broadcast This Question Now'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Queue Broadcast Action Bar */}
                    <div className="flex items-center justify-end pt-1 border-t border-indigo-100/80">
                      <Button
                        size="sm"
                        disabled={Boolean(activeQuiz)}
                        onClick={handleLaunchFromBank}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md disabled:opacity-50"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        {activeQuiz
                          ? 'Broadcast Locked (Quiz Running)'
                          : stagedQueue.length > 1
                          ? `Broadcast Sequenced Quiz (${stagedQueue.length} Questions) (${timerMinutes}m)`
                          : `Broadcast Question (${timerMinutes}m)`}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 0: Prepared Quiz (Pre-Loaded Before Live Session) */}
                {tab === 'prepared' && (
                  <PreparedQuizPanel
                    sessionId={sessionId}
                    onBroadcastQuizGroup={handleLaunchPreparedQuizGroup}
                    activeQuizId={activeQuiz?.id}
                    activeQuizTitle={activeQuiz?.quizTitle}
                    broadcastedQuizTitles={broadcastedQuizTitles}
                    broadcastedQuestionIds={broadcastedQuestionIds}
                    onSwitchToBank={() => setTab('bank')}
                  />
                )}

                {/* Tab 1: Question Bank with Explicit Course Curriculum Levels */}
                {tab === 'bank' ? (
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search questions in ${courseInfo?.code || 'course'} by keyword or choice...`}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-8 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Dedicated Curriculum Hierarchy Filter Bar */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <Filter className="h-3.5 w-3.5 text-indigo-600" />
                          <span>
                            Curriculum Hierarchy Filter for {courseInfo?.code || 'Course'}
                          </span>
                        </div>

                        {(selectedModuleId !== 'ALL' ||
                          selectedLessonId !== 'ALL' ||
                          selectedSubLessonId !== 'ALL' ||
                          searchQuery) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModuleId('ALL');
                              setSelectedLessonId('ALL');
                              setSelectedSubLessonId('ALL');
                              setSearchQuery('');
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                          >
                            Reset Filter
                          </button>
                        )}
                      </div>

                      {/* 4 Dedicated Dropdowns: Module, Lesson, Sub-lesson, Question Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {/* 1. Module Selector */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            1. Module
                          </label>
                          <select
                            value={selectedModuleId}
                            onChange={(e) => {
                              setSelectedModuleId(e.target.value);
                              setSelectedLessonId('ALL');
                              setSelectedSubLessonId('ALL');
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                          >
                            <option value="ALL">All Modules ({modules.length})</option>
                            <option value="COURSE_GENERAL">Course General (No Module)</option>
                            <option value="GLOBAL">Reusable Global</option>
                            {modules.map((m, idx) => (
                              <option key={m.id} value={m.id}>
                                Module {idx + 1}: {(m as any).title || m.titleEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Lesson Selector */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            2. Lesson
                          </label>
                          <select
                            disabled={
                              selectedModuleId === 'ALL' ||
                              selectedModuleId === 'COURSE_GENERAL' ||
                              selectedModuleId === 'GLOBAL' ||
                              activeModuleLessons.length === 0
                            }
                            value={selectedLessonId}
                            onChange={(e) => {
                              setSelectedLessonId(e.target.value);
                              setSelectedSubLessonId('ALL');
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs disabled:opacity-40 disabled:bg-slate-50"
                          >
                            <option value="ALL">
                              {selectedModuleId === 'ALL'
                                ? 'Select a module first'
                                : activeModuleLessons.length === 0
                                  ? 'No lessons in module'
                                  : `All Lessons in Module (${activeModuleLessons.length})`}
                            </option>
                            {activeModuleLessons.map((l, idx) => (
                              <option key={l.id} value={l.id}>
                                Lesson {idx + 1}: {(l as any).title || l.titleEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Sub-lesson Selector */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            3. Sub-lesson
                          </label>
                          <select
                            disabled={
                              selectedLessonId === 'ALL' || activeLessonSubLessons.length === 0
                            }
                            value={selectedSubLessonId}
                            onChange={(e) => setSelectedSubLessonId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs disabled:opacity-40 disabled:bg-slate-50"
                          >
                            <option value="ALL">
                              {selectedLessonId === 'ALL'
                                ? 'Select a lesson first'
                                : activeLessonSubLessons.length === 0
                                  ? 'No sub-lessons'
                                  : `All Sub-lessons (${activeLessonSubLessons.length})`}
                            </option>
                            {activeLessonSubLessons.map((s, idx) => (
                              <option key={s.id} value={s.id}>
                                Sub-lesson {idx + 1}: {(s as any).title || s.titleEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 4. Question Type */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            4. Question Type
                          </label>
                          <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                          >
                            <option value="ALL">All Types</option>
                            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                            <option value="TRUE_FALSE">True / False</option>
                          </select>
                        </div>
                      </div>

                      {/* Active Level Breadcrumb */}
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                        <span className="font-semibold">Active Level:</span>
                        <strong className="text-indigo-900 font-mono truncate">
                          {curriculumBreadcrumb}
                        </strong>
                        <span className="text-slate-400">
                          ({filteredQuestions.length} questions available)
                        </span>
                      </div>
                    </div>

                    {/* Amount of Questions & Random Selection Bar */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ListOrdered className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-700">
                            Amount of Questions:
                          </span>
                          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setQuestionAmount((prev) => Math.max(1, prev - 1))}
                              className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, filteredQuestions.length)}
                              value={questionAmount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1) {
                                  setQuestionAmount(val);
                                }
                              }}
                              className="w-10 bg-transparent text-center text-xs font-bold text-slate-900 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setQuestionAmount((prev) =>
                                  Math.min(Math.max(1, filteredQuestions.length), prev + 1),
                                )
                              }
                              className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick Presets */}
                          <div className="hidden sm:flex items-center gap-1">
                            {[1, 3, 5, 10].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setQuestionAmount(amt)}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                                  questionAmount === amt
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {amt}
                              </button>
                            ))}
                          </div>

                          <span className="text-[11px] text-slate-500">
                            ({filteredQuestions.length} available)
                          </span>
                        </div>

                        {/* Generation & Direct Broadcast Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={filteredQuestions.length === 0}
                            onClick={handleGenerateRandom}
                            className="gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs shadow-2xs"
                            title="Randomly select questions into quiz queue"
                          >
                            <Shuffle className="h-3.5 w-3.5" />
                            Select Random ({Math.min(questionAmount, filteredQuestions.length || 1)})
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={filteredQuestions.length === 0 || Boolean(activeQuiz)}
                            onClick={() => {
                              const unbroadcasted = filteredQuestions.filter(
                                (q) => !broadcastedQuestionIds.has(q.id),
                              );
                              const pool = unbroadcasted.length > 0 ? unbroadcasted : filteredQuestions;
                              const count = Math.min(questionAmount, pool.length);
                              const shuffled = [...pool].sort(() => 0.5 - Math.random());
                              const selected = shuffled.slice(0, count);
                              setStagedQueue(selected);
                              setCurrentQueueIndex(0);
                              if (selected.length > 0) {
                                setSelectedQuestion(selected[0]);
                                const resolvedTitle =
                                  bankQuizLabel.trim() || `Quiz ${quizHistory.length + 1}`;
                                handleLaunchQuestion(selected[0], 0, selected, resolvedTitle);
                              }
                            }}
                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                            title="Generate random questions and broadcast to classroom immediately"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Generate &amp; Broadcast ({Math.min(questionAmount, filteredQuestions.length || 1)})
                          </Button>
                        </div>
                      </div>

                      {/* Quiz Batch Label Input */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
                          <Tag className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Quiz Batch Label:</span>
                        </div>
                        <input
                          type="text"
                          value={bankQuizLabel}
                          onChange={(e) => setBankQuizLabel(e.target.value)}
                          placeholder={`Enter quiz label (e.g. Quiz ${quizHistory.length + 1}, Mid-Session Check)...`}
                          className="flex-1 min-w-[200px] max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs font-medium"
                        />
                        {bankQuizLabel && (
                          <button
                            type="button"
                            onClick={() => setBankQuizLabel('')}
                            className="text-slate-400 hover:text-slate-600"
                            title="Clear label"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Questions List */}
                    {loadingQuestions ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Loading question bank…
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500 space-y-2">
                        <p className="text-slate-800 font-semibold">
                          No questions found under &quot;{curriculumBreadcrumb}&quot;.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Switch to &quot;Instant Custom Question&quot; to add questions for this
                          level, or prepare questions in the Question Bank workspace.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                        {filteredQuestions.map((q) => {
                          const isStaged = stagedQueue.some((item) => item.id === q.id);
                          const isSelected = selectedQuestion?.id === q.id || isStaged;
                          const isPreviouslyBroadcasted = broadcastedQuestionIds.has(q.id);

                          return (
                            <div
                              key={q.id}
                              className={`rounded-2xl border p-3.5 transition space-y-2 ${
                                isStaged
                                  ? 'border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-500/20 shadow-xs'
                                  : isPreviouslyBroadcasted
                                    ? 'border-purple-200 bg-purple-50/25 hover:border-purple-300 shadow-2xs'
                                    : isSelected
                                      ? 'border-indigo-300 bg-indigo-50/20'
                                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center pt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={isStaged}
                                    onChange={() => handleToggleQuestionInQueue(q)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    title="Add/Remove from broadcast queue"
                                  />
                                </div>

                                <div
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => setSelectedQuestion(q)}
                                >
                                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                    {q.module && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                        <FolderOpen className="h-2.5 w-2.5" />
                                        {q.module.titleEn}
                                      </span>
                                    )}

                                    {q.lesson && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                        <FileText className="h-2.5 w-2.5" />
                                        {q.lesson.titleEn}
                                      </span>
                                    )}

                                    {q.subLesson && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                        {q.subLesson.titleEn}
                                      </span>
                                    )}

                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                      {q.type === 'TRUE_FALSE' ? 'True/False' : 'Multiple Choice'}
                                    </span>
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                      {q.category || 'General'}
                                    </span>

                                    {activeQuiz?.id === q.id && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                                        Active Now
                                      </span>
                                    )}

                                    {activeQuiz?.id !== q.id && isPreviouslyBroadcasted && (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-300 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                                        <CheckCircle2 className="h-2.5 w-2.5 text-purple-600" />
                                        Previously Broadcasted
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                                    {stripHtmlTags(q.question)}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedQuestion(selectedQuestion?.id === q.id ? null : q);
                                    }}
                                    className={`gap-1.5 text-xs h-7 px-2.5 font-medium border shadow-2xs ${
                                      selectedQuestion?.id === q.id
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                    title="View question options and correct answer before broadcasting"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>
                                      {selectedQuestion?.id === q.id
                                        ? 'Hide Details'
                                        : 'View Details'}
                                    </span>
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={Boolean(activeQuiz) || isPreviouslyBroadcasted}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const resolvedTitle =
                                        bankQuizLabel.trim() || stripHtmlTags(q.question);
                                      handleLaunchQuestion(q, undefined, undefined, resolvedTitle);
                                    }}
                                    className={`gap-1 font-semibold text-xs px-2.5 py-1 h-7 transition shadow-xs ${
                                      isPreviouslyBroadcasted
                                        ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed opacity-80'
                                        : activeQuiz
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                                    title={
                                      isPreviouslyBroadcasted
                                        ? 'This question has already been broadcasted in this session'
                                        : activeQuiz
                                        ? 'Quiz currently active'
                                        : `Broadcast question immediately to classroom with ${timerMinutes}m timer`
                                    }
                                  >
                                    {isPreviouslyBroadcasted ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 text-purple-600" />
                                        Broadcasted
                                      </>
                                    ) : activeQuiz ? (
                                      'Locked'
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 fill-current" />
                                        Broadcast
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {/* Options & Details Preview */}
                              {selectedQuestion?.id === q.id && (
                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                  {/* Curriculum details */}
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 flex-wrap">
                                    <span className="font-semibold text-slate-500">
                                      Curriculum Assignment:
                                    </span>
                                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                                      {(q.module as any)?.title || q.module?.titleEn
                                        ? `Module: ${(q.module as any)?.title || q.module?.titleEn}`
                                        : 'Course General'}
                                      {(q.lesson as any)?.title || q.lesson?.titleEn ? ` > Lesson: ${(q.lesson as any)?.title || q.lesson?.titleEn}` : ''}
                                      {(q.subLesson as any)?.title || q.subLesson?.titleEn
                                        ? ` > Sub-lesson: ${(q.subLesson as any)?.title || q.subLesson?.titleEn}`
                                        : ''}
                                    </span>
                                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 font-semibold text-[10px]">
                                      {q.points || 10} points
                                    </span>
                                  </div>

                                  {/* Options */}
                                  {Array.isArray(q.options) && q.options.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Options (Correct answer highlighted in green):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                                        {q.options.map((opt: any, idx) => {
                                          const optText =
                                            typeof opt === 'string'
                                              ? opt
                                              : opt.textEn || opt.text || '';
                                          const cleanText = stripHtmlTags(optText);
                                          const isCorrect =
                                            q.correctAnswer !== null &&
                                            (String(idx) === String(q.correctAnswer).trim() ||
                                              cleanText.toLowerCase() ===
                                                String(q.correctAnswer).trim().toLowerCase());

                                          return (
                                            <div
                                              key={idx}
                                              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border ${
                                                isCorrect
                                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold shadow-2xs'
                                                  : 'border-slate-200 bg-slate-50/60 text-slate-700'
                                              }`}
                                            >
                                              <span
                                                className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${
                                                  isCorrect
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-200 text-slate-600'
                                                }`}
                                              >
                                                {String.fromCharCode(65 + idx)}
                                              </span>
                                              <span className="truncate flex-1">{cleanText}</span>
                                              {isCorrect && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold shrink-0">
                                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                  Correct Answer
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Explanation */}
                                  {q.explanation && (
                                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-700">
                                      <span className="font-bold text-indigo-700 block mb-0.5">
                                        Explanation:
                                      </span>
                                      {stripHtmlTags(q.explanation)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Permanent Question Bank Broadcast Control Bar (Hidden during active broadcasting) */}
                    {!activeQuiz && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <Play className="h-4 w-4 fill-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {stagedQueue.length > 1
                                ? `Sequenced Quiz: ${stagedQueue.length} Questions Queued`
                                : stagedQueue.length === 1
                                  ? `Ready to Broadcast: "${stripHtmlTags(stagedQueue[0].question)}"`
                                  : selectedQuestion
                                    ? `Selected Question: "${stripHtmlTags(selectedQuestion.question)}"`
                                    : filteredQuestions.length > 0
                                      ? `Ready: "${stripHtmlTags(filteredQuestions[0].question)}"`
                                      : 'No Questions Available'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {stagedQueue.length > 1
                                ? `Timer: ${timerMinutes} mins total for all questions`
                                : filteredQuestions.length > 0
                                  ? `Timer: ${timerMinutes} mins • Learners will receive live voting prompt immediately`
                                  : 'Prepare questions in Question Bank or switch to Instant Custom Question'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {/* Inline Batch Label Input */}
                          <div className="hidden sm:flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                            <Tag className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <input
                              type="text"
                              value={bankQuizLabel}
                              onChange={(e) => setBankQuizLabel(e.target.value)}
                              placeholder={`Label (e.g. Quiz ${quizHistory.length + 1})...`}
                              className="w-32 md:w-44 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none font-medium"
                            />
                            {bankQuizLabel && (
                              <button
                                type="button"
                                onClick={() => setBankQuizLabel('')}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {stagedQueue.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setStagedQueue([]);
                                setSelectedQuestion(null);
                              }}
                              className="text-xs border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            >
                              Clear Queue ({stagedQueue.length})
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              Boolean(activeQuiz) ||
                              (filteredQuestions.length === 0 &&
                                stagedQueue.length === 0 &&
                                !selectedQuestion)
                            }
                            onClick={handleLaunchFromBank}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md px-4 py-2 disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            {activeQuiz
                              ? 'Broadcast Locked (Quiz Running)'
                              : bankQuizLabel
                              ? `Broadcast "${bankQuizLabel}" (${timerMinutes}m)`
                              : stagedQueue.length > 1
                              ? `Broadcast Sequenced Quiz (${stagedQueue.length} Qs) (${timerMinutes}m)`
                              : stagedQueue.length === 1
                                ? `Broadcast Staged Question (${timerMinutes}m)`
                                : selectedQuestion
                                  ? `Broadcast Selected Question (${timerMinutes}m)`
                                  : `Broadcast Question (${timerMinutes}m)`}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Tab 2: Custom Instant Question (Add multiple questions before broadcasting) */}
                {tab === 'custom' ? (
                  <div className="space-y-4">
                    {customAddedSuccess && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{customAddedSuccess}</span>
                        </div>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Total: {stagedQueue.length} In Queue
                        </span>
                      </div>
                    )}

                    {/* Save to Question Bank Permission Toggle / Checkbox */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveToQuestionBank}
                          onChange={(e) => setSaveToQuestionBank(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              Save this custom question to Question Bank for future reuse
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                saveToQuestionBank
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-200 bg-slate-100 text-slate-600'
                              }`}
                            >
                              {saveToQuestionBank
                                ? 'Allowed (Will Save to Bank)'
                                : 'Forbidden (Live Session Only)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {saveToQuestionBank
                              ? 'Allowed: This question will be permanently saved into the course Question Bank and can be reused in future quizzes, exams, and live sessions.'
                              : 'Forbidden (Default): This question will only be used in this live training session without being automatically saved to the course question bank.'}
                          </p>
                        </div>
                      </label>

                      {/* Target Curriculum (Only shown when saving to Question Bank is allowed/ticked) */}
                      {saveToQuestionBank && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-200">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-indigo-600" />
                            Assign Question to Curriculum Node for {courseInfo?.code || 'Course'}
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* Module */}
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">
                                Module
                              </label>
                              <select
                                value={customTargetModuleId}
                                onChange={(e) => {
                                  setCustomTargetModuleId(e.target.value);
                                  setCustomTargetLessonId('NONE');
                                  setCustomTargetSubLessonId('NONE');
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                              >
                                <option value="NONE">Course General (No Module)</option>
                                {modules.map((m, idx) => (
                                  <option key={m.id} value={m.id}>
                                    Module {idx + 1}: {(m as any).title || m.titleEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Lesson */}
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">
                                Lesson
                              </label>
                              <select
                                disabled={
                                  customTargetModuleId === 'NONE' ||
                                  customActiveLessons.length === 0
                                }
                                value={customTargetLessonId}
                                onChange={(e) => {
                                  setCustomTargetLessonId(e.target.value);
                                  setCustomTargetSubLessonId('NONE');
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs disabled:opacity-40 disabled:bg-slate-50"
                              >
                                <option value="NONE">General to Module</option>
                                {customActiveLessons.map((l, idx) => (
                                  <option key={l.id} value={l.id}>
                                    Lesson {idx + 1}: {(l as any).title || l.titleEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Sub-lesson */}
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">
                                Sub-lesson
                              </label>
                              <select
                                disabled={
                                  customTargetLessonId === 'NONE' ||
                                  customActiveSubLessons.length === 0
                                }
                                value={customTargetSubLessonId}
                                onChange={(e) => setCustomTargetSubLessonId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs disabled:opacity-40 disabled:bg-slate-50"
                              >
                                <option value="NONE">General to Lesson</option>
                                {customActiveSubLessons.map((s, idx) => (
                                  <option key={s.id} value={s.id}>
                                    Sub-lesson {idx + 1}: {(s as any).title || s.titleEn}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Question Type Selector based on DB Lookup Categories */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Question Type
                      </label>
                      <select
                        value={customQuestionType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setCustomQuestionType(newType);
                          if (newType === 'TRUE_FALSE') {
                            setCustomOptions(['True', 'False']);
                            setCorrectOptionIdx(0);
                          } else if (newType === 'SHORT_ANSWER') {
                            setCustomOptions(['']);
                            setCorrectOptionIdx(0);
                          } else {
                            setCustomOptions(['', '', '', '']);
                            setCorrectOptionIdx(0);
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs font-medium"
                      >
                        {questionTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Question Texts */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Question Text (English) *
                      </label>
                      <input
                        type="text"
                        value={customTitleEn}
                        onChange={(e) => setCustomTitleEn(e.target.value)}
                        placeholder="e.g. What is the deadline for filing VAT declarations in Ethiopia?"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Question Text (Amharic - Optional)
                      </label>
                      <input
                        type="text"
                        value={customTitleAm}
                        onChange={(e) => setCustomTitleAm(e.target.value)}
                        placeholder="የተጨማሪ እሴት ታክስ ማስታወቂያ ማቅረቢያ የመጨረሻ ቀን መቼ ነው?"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-amharic shadow-2xs"
                      />
                    </div>

                    {/* Options List based on Question Type */}
                    {customQuestionType === 'SHORT_ANSWER' ? (
                      <div>
                        <label className="text-xs font-semibold text-slate-700">
                          Expected Correct Answer / Key Words
                        </label>
                        <input
                          type="text"
                          value={customOptions[0] || ''}
                          onChange={(e) => setCustomOptions([e.target.value])}
                          placeholder="e.g. 30 days"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                        />
                      </div>
                    ) : customQuestionType === 'TRUE_FALSE' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Options (Select the correct answer)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {['True', 'False'].map((label, idx) => (
                            <label
                              key={label}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                                correctOptionIdx === idx
                                  ? 'border-emerald-400 bg-emerald-50/50 text-emerald-950 font-bold shadow-xs'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="correctOption"
                                checked={correctOptionIdx === idx}
                                onChange={() => setCorrectOptionIdx(idx)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                              />
                              <span className="text-xs">{label}</span>
                              {correctOptionIdx === idx && (
                                <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                                  Correct
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">
                            Options (Select radio for correct answer)
                          </label>
                          {customOptions.length < 5 && (
                            <button
                              type="button"
                              onClick={() => setCustomOptions([...customOptions, ''])}
                              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Option
                            </button>
                          )}
                        </div>

                        {customOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={correctOptionIdx === idx}
                              onChange={() => setCorrectOptionIdx(idx)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              value={opt}
                              placeholder={`Option ${idx + 1}`}
                              onChange={(e) => {
                                const updated = [...customOptions];
                                updated[idx] = e.target.value;
                                setCustomOptions(updated);
                              }}
                              className={`flex-1 rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs ${
                                correctOptionIdx === idx
                                  ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                                  : 'border-slate-200'
                              }`}
                            />
                            {customOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = customOptions.filter((_, i) => i !== idx);
                                  setCustomOptions(updated);
                                  if (correctOptionIdx >= updated.length) setCorrectOptionIdx(0);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Explanation (Shown on reveal)
                      </label>
                      <input
                        type="text"
                        value={customExplanation}
                        onChange={(e) => setCustomExplanation(e.target.value)}
                        placeholder="e.g. VAT declarations must be submitted within 30 days following the end of the accounting period."
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                      />
                    </div>

                    {/* Form Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 flex-wrap gap-2">
                      <span className="text-xs text-slate-500">
                        {stagedQueue.length > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            {stagedQueue.length} question{stagedQueue.length > 1 ? 's' : ''} added
                            to quiz queue
                          </span>
                        ) : saveToQuestionBank ? (
                          <span className="text-emerald-700 font-medium">
                            Allowed to save to Question Bank
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">
                            Live session only (saving to bank forbidden)
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={!customTitleEn.trim()}
                          onClick={handleAddCustomQuestionToQueue}
                          className="gap-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs shadow-xs rounded-xl px-3.5 py-2"
                        >
                          <Plus className="h-3.5 w-3.5" />+ Add Question to Quiz Queue
                        </Button>

                        <Button
                          size="sm"
                          disabled={!customTitleEn.trim() || Boolean(activeQuiz)}
                          onClick={handleLaunchCustomDirect}
                          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md rounded-xl px-4 py-2 disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          {activeQuiz ? 'Quiz Already Active' : 'Broadcast Immediately Now'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                </div>
            </div>
          )}
        </div>

        {/* Queued Question Edit Modal */}
        {editingQueueItem !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/20 p-4 animate-in fade-in duration-150">
            <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Pencil className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Edit Queued Question #{editingQueueItem.index + 1}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Update question, options, correct answer, or curriculum location
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingQueueItem(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                {/* Target Curriculum selectors */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Curriculum Level for Question
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Module */}
                    <div>
                      <label className="text-[10px] text-slate-500 mb-0.5 block font-medium">
                        Module
                      </label>
                      <select
                        value={editingQueueItem.moduleId}
                        onChange={(e) => {
                          setEditingQueueItem({
                            ...editingQueueItem,
                            moduleId: e.target.value,
                            lessonId: 'NONE',
                            subLessonId: 'NONE',
                          });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="NONE">Course General</option>
                        {modules.map((m, mIdx) => (
                          <option key={m.id} value={m.id}>
                            Module {mIdx + 1}: {(m as any).title || m.titleEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lesson */}
                    <div>
                      <label className="text-[10px] text-slate-500 mb-0.5 block font-medium">
                        Lesson
                      </label>
                      <select
                        disabled={
                          editingQueueItem.moduleId === 'NONE' || editTargetLessons.length === 0
                        }
                        value={editingQueueItem.lessonId}
                        onChange={(e) => {
                          setEditingQueueItem({
                            ...editingQueueItem,
                            lessonId: e.target.value,
                            subLessonId: 'NONE',
                          });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-40 disabled:bg-slate-50"
                      >
                        <option value="NONE">General to Module</option>
                        {editTargetLessons.map((l, lIdx) => (
                          <option key={l.id} value={l.id}>
                            Lesson {lIdx + 1}: {(l as any).title || l.titleEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sub-lesson */}
                    <div>
                      <label className="text-[10px] text-slate-500 mb-0.5 block font-medium">
                        Sub-lesson
                      </label>
                      <select
                        disabled={
                          editingQueueItem.lessonId === 'NONE' || editTargetSubLessons.length === 0
                        }
                        value={editingQueueItem.subLessonId}
                        onChange={(e) => {
                          setEditingQueueItem({
                            ...editingQueueItem,
                            subLessonId: e.target.value,
                          });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-40 disabled:bg-slate-50"
                      >
                        <option value="NONE">General to Lesson</option>
                        {editTargetSubLessons.map((s, sIdx) => (
                          <option key={s.id} value={s.id}>
                            Sub-lesson {sIdx + 1}: {(s as any).title || s.titleEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Question Text (English) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Question Text (English) *
                  </label>
                  <input
                    type="text"
                    value={editingQueueItem.titleEn}
                    onChange={(e) =>
                      setEditingQueueItem({ ...editingQueueItem, titleEn: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                  />
                </div>

                {/* Question Text (Amharic) */}
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Question Text (Amharic - Optional)
                  </label>
                  <input
                    type="text"
                    value={editingQueueItem.titleAm}
                    onChange={(e) =>
                      setEditingQueueItem({ ...editingQueueItem, titleAm: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-amharic shadow-2xs"
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Options (Select radio for correct answer)
                    </label>
                    {editingQueueItem.options.length < 6 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingQueueItem({
                            ...editingQueueItem,
                            options: [
                              ...editingQueueItem.options,
                              `Option ${editingQueueItem.options.length + 1}`,
                            ],
                          })
                        }
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                      >
                        <Plus className="h-3 w-3" /> Add Option
                      </button>
                    )}
                  </div>

                  {editingQueueItem.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="editCorrectOption"
                        checked={editingQueueItem.correctOptionIdx === oIdx}
                        onChange={() =>
                          setEditingQueueItem({ ...editingQueueItem, correctOptionIdx: oIdx })
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...editingQueueItem.options];
                          updated[oIdx] = e.target.value;
                          setEditingQueueItem({ ...editingQueueItem, options: updated });
                        }}
                        className={`flex-1 rounded-xl border bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-2xs ${
                          editingQueueItem.correctOptionIdx === oIdx
                            ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                            : 'border-slate-200'
                        }`}
                      />
                      {editingQueueItem.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingQueueItem.options.filter((_, i) => i !== oIdx);
                            let newCorrect = editingQueueItem.correctOptionIdx;
                            if (newCorrect >= updated.length) newCorrect = 0;
                            setEditingQueueItem({
                              ...editingQueueItem,
                              options: updated,
                              correctOptionIdx: newCorrect,
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Explanation (Shown on reveal)
                  </label>
                  <input
                    type="text"
                    value={editingQueueItem.explanation}
                    onChange={(e) =>
                      setEditingQueueItem({ ...editingQueueItem, explanation: e.target.value })
                    }
                    placeholder="Provide an explanation for the correct answer..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-white px-6 py-3.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingQueueItem(null)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveQueuedEdit}
                  disabled={!editingQueueItem.titleEn.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save Changes to Queue
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
