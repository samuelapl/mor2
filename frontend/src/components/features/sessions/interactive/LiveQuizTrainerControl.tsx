"use client";

import React, { useEffect, useState } from "react";
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
  Sparkles,
  Users,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Globe,
  Filter,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  fetchQuestionBank,
  createQuestionBankItem,
  type ApiQuestionBankQuestion,
} from "@/lib/api/quiz";
import type {
  LiveKitDataEvent,
  LiveQuizOption,
} from "@/types/livekit-events";

interface LiveQuizTrainerControlProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  trainerName?: string;
  onBroadcast: (event: LiveKitDataEvent) => void;
  activeQuiz: {
    id: string;
    titleEn: string;
    titleAm?: string;
    type?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
    options: LiveQuizOption[];
    timeLimitSeconds: number;
    startedAt: number;
    correctOptionIds?: string[];
    explanationEn?: string;
  } | null;
  answers: Record<string, { userId: string; userName: string; selectedOptionIds: string[] }>;
  onClearQuiz: () => void;
}

export function LiveQuizTrainerControl({
  open,
  onClose,
  courseId,
  trainerName,
  onBroadcast,
  activeQuiz,
  answers,
  onClearQuiz,
}: LiveQuizTrainerControlProps) {
  const [tab, setTab] = useState<"bank" | "custom">("bank");
  const [questions, setQuestions] = useState<ApiQuestionBankQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<ApiQuestionBankQuestion | null>(null);

  // Filters for question bank
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "COURSE" | "GLOBAL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Custom question form state
  const [customTitleEn, setCustomTitleEn] = useState("");
  const [customTitleAm, setCustomTitleAm] = useState("");
  const [customOptions, setCustomOptions] = useState<string[]>([
    "Yes / Agree",
    "No / Disagree",
  ]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);
  const [customExplanation, setCustomExplanation] = useState("");
  const [saveToBank, setSaveToBank] = useState(true);

  // Timer settings
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isRevealed, setIsRevealed] = useState(false);

  // Load question bank for course
  const loadQuestions = () => {
    setLoadingQuestions(true);
    fetchQuestionBank({ courseId, includeGlobal: true })
      .then((data) => setQuestions(data || []))
      .catch((err) => console.error("Failed to load question bank:", err))
      .finally(() => setLoadingQuestions(false));
  };

  useEffect(() => {
    if (!open) return;
    loadQuestions();
  }, [open, courseId]);

  if (!open) return null;

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

  // Handle launch from question bank
  const handleLaunchFromBank = () => {
    if (!selectedQuestion) return;

    let parsedOptions: LiveQuizOption[] = [];
    if (selectedQuestion.type === "TRUE_FALSE") {
      parsedOptions = [
        { id: "0", textEn: "True" },
        { id: "1", textEn: "False" },
      ];
    } else if (Array.isArray(selectedQuestion.options) && selectedQuestion.options.length > 0) {
      parsedOptions = selectedQuestion.options.map((opt: any, idx: number) => ({
        id: String(idx),
        textEn: typeof opt === "string" ? opt : opt.textEn || opt.text || `Option ${idx + 1}`,
        textAm: typeof opt === "object" ? opt.textAm : undefined,
      }));
    } else {
      parsedOptions = [
        { id: "0", textEn: "Option 1" },
        { id: "1", textEn: "Option 2" },
      ];
    }

    let correctOptionIds: string[] = ["0"];
    if (selectedQuestion.correctAnswer !== null && selectedQuestion.correctAnswer !== undefined) {
      const rawAns = String(selectedQuestion.correctAnswer).trim();
      const num = parseInt(rawAns, 10);
      if (!isNaN(num) && num >= 0 && num < parsedOptions.length) {
        correctOptionIds = [String(num)];
      } else {
        const found = parsedOptions.findIndex(
          (o) => o.textEn.toLowerCase() === rawAns.toLowerCase()
        );
        if (found !== -1) {
          correctOptionIds = [String(found)];
        } else {
          correctOptionIds = [rawAns];
        }
      }
    }

    const quizPayload = {
      id: selectedQuestion.id,
      titleEn: selectedQuestion.question,
      titleAm: selectedQuestion.course?.titleAm,
      type: selectedQuestion.type === "MULTIPLE_CHOICE" ? ("MULTIPLE_CHOICE" as const) : ("SINGLE_CHOICE" as const),
      options: parsedOptions,
      timeLimitSeconds: timerSeconds,
      startedAt: Date.now(),
      trainerName,
      correctOptionIds,
      explanationEn: (selectedQuestion as any).explanation || undefined,
    };

    onBroadcast({
      type: "QUIZ_START",
      payload: quizPayload,
    });
    setIsRevealed(false);
  };

  // Handle launch custom question
  const handleLaunchCustom = async () => {
    if (!customTitleEn.trim() || customOptions.filter((o) => o.trim()).length < 2) return;

    const validOptions = customOptions.filter((o) => o.trim());
    const parsedOptions: LiveQuizOption[] = validOptions.map((opt, idx) => ({
      id: String(idx),
      textEn: opt.trim(),
    }));

    let questionId = `custom-${Date.now()}`;

    // Optionally save to Course Question Bank so it persists for future sessions
    if (saveToBank) {
      try {
        const saved = await createQuestionBankItem({
          courseId,
          type: "MULTIPLE_CHOICE",
          question: customTitleEn.trim(),
          options: validOptions,
          correctAnswer: String(correctOptionIdx),
          points: 10,
          category: "Live Assessment",
        });
        if (saved?.id) {
          questionId = saved.id;
          loadQuestions();
        }
      } catch (err) {
        console.warn("Could not save custom question to question bank:", err);
      }
    }

    const quizPayload = {
      id: questionId,
      titleEn: customTitleEn.trim(),
      titleAm: customTitleAm.trim() || undefined,
      type: "SINGLE_CHOICE" as const,
      options: parsedOptions,
      timeLimitSeconds: timerSeconds,
      startedAt: Date.now(),
      trainerName,
      correctOptionIds: [String(correctOptionIdx)],
      explanationEn: customExplanation.trim() || undefined,
    };

    onBroadcast({
      type: "QUIZ_START",
      payload: quizPayload,
    });
    setIsRevealed(false);
  };

  // Reveal results to all participants
  const handleReveal = () => {
    if (!activeQuiz) return;
    setIsRevealed(true);
    onBroadcast({
      type: "QUIZ_REVEAL",
      payload: {
        questionId: activeQuiz.id,
        correctOptionIds: activeQuiz.correctOptionIds || ["0"],
        explanationEn: activeQuiz.explanationEn,
        distribution,
        totalResponses,
      },
    });
  };

  // Close active quiz
  const handleCloseQuiz = () => {
    if (!activeQuiz) return;
    onBroadcast({
      type: "QUIZ_CLOSE",
      payload: {
        questionId: activeQuiz.id,
      },
    });
    onClearQuiz();
    setIsRevealed(false);
  };

  // Filter bank questions by Course scope, search, and type
  const courseSpecificCount = questions.filter((q) => q.courseId === courseId).length;
  const globalCount = questions.filter((q) => !q.courseId).length;

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (q.question || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(q.options) &&
        q.options.some((opt: any) =>
          (typeof opt === "string" ? opt : opt.textEn || "").toLowerCase().includes(searchQuery.toLowerCase())
        ));

    const matchesScope =
      scopeFilter === "ALL" ||
      (scopeFilter === "COURSE" && q.courseId === courseId) ||
      (scopeFilter === "GLOBAL" && !q.courseId);

    const matchesType = typeFilter === "ALL" || q.type === typeFilter;

    return matchesSearch && matchesScope && matchesType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Live Classroom Quiz & Polls</h3>
              <p className="text-xs text-slate-400">
                Broadcast real-time questions directly onto learners&apos; screens via WebRTC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Quiz Monitor Banner */}
          {activeQuiz ? (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Live Question Active in Room</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{totalResponses} responses</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-white">{activeQuiz.titleEn}</p>
                {activeQuiz.titleAm ? (
                  <p className="text-xs text-slate-400 mt-0.5 font-amharic">{activeQuiz.titleAm}</p>
                ) : null}
              </div>

              {/* Live Answer Distribution Bars */}
              <div className="space-y-2.5 pt-1">
                {activeQuiz.options.map((opt, idx) => {
                  const votes = distribution[opt.id] || 0;
                  const percent = totalResponses > 0 ? Math.round((votes / totalResponses) * 100) : 0;
                  const isCorrect = activeQuiz.correctOptionIds?.includes(opt.id);

                  return (
                    <div key={opt.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-indigo-300">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt.textEn}
                          {isRevealed && isCorrect && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline ml-1" />
                          )}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {votes} ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isRevealed
                              ? isCorrect
                                ? "bg-emerald-500"
                                : "bg-slate-600"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons for Active Quiz */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-indigo-500/20">
                {!isRevealed ? (
                  <Button
                    size="sm"
                    onClick={handleReveal}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <Eye className="h-4 w-4" />
                    Reveal Answers to Room
                  </Button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Answers Revealed to Learners
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCloseQuiz}
                  className="gap-1.5 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                  End & Dismiss
                </Button>
              </div>
            </div>
          ) : null}

          {/* Create / Launch New Quiz Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Launch Next Interactive Question
              </h4>

              {/* Timer preset selection */}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">Timer:</span>
                {[15, 30, 45, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTimerSeconds(sec)}
                    className={`rounded-md px-2 py-0.5 text-xs font-bold transition ${
                      timerSeconds === sec
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setTab("bank")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  tab === "bank"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Question Bank
              </button>
              <button
                type="button"
                onClick={() => setTab("custom")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  tab === "custom"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Instant Custom Question
              </button>
            </div>

            {/* Tab 1: Question Bank */}
            {tab === "bank" ? (
              <div className="space-y-3.5">
                {/* Course & Scope Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setScopeFilter("ALL")}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                        scopeFilter === "ALL"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      All ({questions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeFilter("COURSE")}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition flex items-center gap-1.5 ${
                        scopeFilter === "COURSE"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Filter questions belonging specifically to this course"
                    >
                      <BookOpen className="h-3 w-3" />
                      Course Only ({courseSpecificCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeFilter("GLOBAL")}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition flex items-center gap-1.5 ${
                        scopeFilter === "GLOBAL"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Filter reusable questions accessible across all courses"
                    >
                      <Globe className="h-3 w-3" />
                      Reusable Global ({globalCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
                    {["ALL", "MULTIPLE_CHOICE", "TRUE_FALSE"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                          typeFilter === t
                            ? "bg-slate-700 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {t === "ALL" ? "All Types" : t === "MULTIPLE_CHOICE" ? "MCQ" : "True/False"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search course question bank by title, category, or choice…"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
                  />
                </div>

                {loadingQuestions ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Loading course question bank…
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400 space-y-2">
                    <p>No questions found matching your course and scope filters.</p>
                    <p className="text-[11px] text-slate-500">
                      Switch to &quot;Instant Custom Question&quot; to ask a question right away, and check &quot;Save to Course Bank&quot; to keep it for future classes.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                    {filteredQuestions.map((q) => {
                      const isSelected = selectedQuestion?.id === q.id;
                      const isCourse = q.courseId === courseId;
                      return (
                        <div
                          key={q.id}
                          onClick={() => setSelectedQuestion(q)}
                          className={`cursor-pointer rounded-2xl border p-3.5 transition space-y-2 ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/40"
                              : "border-slate-800 bg-slate-800/40 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                {isCourse ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                                    <BookOpen className="h-3 w-3" />
                                    This Course
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                                    <Globe className="h-3 w-3" />
                                    Reusable Global
                                  </span>
                                )}
                                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                  {q.type === "TRUE_FALSE" ? "True / False" : q.type === "SHORT_ANSWER" ? "Short Answer" : "Multiple Choice"}
                                </span>
                                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                  {q.category}
                                </span>
                                <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400">
                                  {q.points} pts
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-100 line-clamp-2">
                                {q.question}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>

                          {/* Options preview with correct answer verification for trainer */}
                          {isSelected && Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="pt-2 border-t border-slate-800/80 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Options Preview (Correct choice highlighted):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                                {q.options.map((opt: any, idx) => {
                                  const optText = typeof opt === "string" ? opt : opt.textEn || opt.text || "";
                                  const isCorrect =
                                    q.correctAnswer !== null &&
                                    (String(idx) === String(q.correctAnswer).trim() ||
                                      optText.toLowerCase() === String(q.correctAnswer).trim().toLowerCase());

                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border ${
                                        isCorrect
                                          ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300 font-semibold"
                                          : "border-slate-800 bg-slate-900/60 text-slate-300"
                                      }`}
                                    >
                                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded text-[10px] font-bold text-slate-400">
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      <span className="truncate flex-1">{optText}</span>
                                      {isCorrect && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-400 shrink-0" />}
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

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    {selectedQuestion ? (
                      <span className="text-slate-300 font-semibold truncate max-w-xs block">
                        Selected: {selectedQuestion.question}
                      </span>
                    ) : (
                      "Select a question above to broadcast to participants"
                    )}
                  </span>
                  <Button
                    size="sm"
                    disabled={!selectedQuestion}
                    onClick={handleLaunchFromBank}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Broadcast Question ({timerSeconds}s)
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Tab 2: Custom Instant Poll */}
            {tab === "custom" ? (
              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Question Text (English) *
                  </label>
                  <input
                    type="text"
                    value={customTitleEn}
                    onChange={(e) => setCustomTitleEn(e.target.value)}
                    placeholder="e.g. What is the deadline for filing VAT declarations in Ethiopia?"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Question Text (Amharic - Optional)
                  </label>
                  <input
                    type="text"
                    value={customTitleAm}
                    onChange={(e) => setCustomTitleAm(e.target.value)}
                    placeholder="የተጨማሪ እሴት ታክስ ማስታወቂያ ማቅረቢያ የመጨረሻ ቀን መቼ ነው?"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 font-amharic"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-400">
                      Options (Select radio for correct answer)
                    </label>
                    {customOptions.length < 4 && (
                      <button
                        type="button"
                        onClick={() => setCustomOptions([...customOptions, `Option ${customOptions.length + 1}`])}
                        className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Plus className="h-3 w-3" /> Add Option
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
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-600"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...customOptions];
                          updated[idx] = e.target.value;
                          setCustomOptions(updated);
                        }}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-400"
                      />
                      {customOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = customOptions.filter((_, i) => i !== idx);
                            setCustomOptions(updated);
                            if (correctOptionIdx >= updated.length) setCorrectOptionIdx(0);
                          }}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Explanation (Shown on reveal)
                  </label>
                  <input
                    type="text"
                    value={customExplanation}
                    onChange={(e) => setCustomExplanation(e.target.value)}
                    placeholder="e.g. VAT declarations must be submitted within 30 days following the end of the accounting period."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Save to Course Question Bank Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveToBankCheckbox"
                    checked={saveToBank}
                    onChange={(e) => setSaveToBank(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/20"
                  />
                  <label htmlFor="saveToBankCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                    Save this question to Course Question Bank for future sessions
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    disabled={!customTitleEn.trim()}
                    onClick={handleLaunchCustom}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Broadcast Instant Question ({timerSeconds}s)
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
