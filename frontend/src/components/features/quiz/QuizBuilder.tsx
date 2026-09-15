"use client";

import { useEffect, useState } from "react";
import { FileQuestion, Plus, Trash2 } from "lucide-react";
import type { Course, Question, Quiz } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api/client";
import {
  createCourseAssessment,
  fetchAssessmentWithAnswers,
  fetchCourseAssessments,
  updateAssessment,
} from "@/lib/api/quiz";
import type { SaveAssessmentBody } from "@/lib/api/quiz";
import { cn } from "@/lib/utils";

interface QuizBuilderProps {
  course: Course;
}

const emptyQuiz = (course: Course): Quiz => ({
  id: `q-${Date.now()}`,
  title: `${course.title} Quiz`,
  passMark: 60,
  attemptsAllowed: 2,
  questions: [],
});

const blankQuestion = (): Question => ({
  id: `qn-${Date.now()}`,
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  points: 10,
});

export function QuizBuilder({ course }: QuizBuilderProps) {
  const [existingId, setExistingId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<Quiz>(() => emptyQuiz(course));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    (async () => {
      try {
        const list = await fetchCourseAssessments(course.id);
        if (cancelled || !list || list.length === 0) return;
        const detail = await fetchAssessmentWithAnswers(list[0].id);
        if (cancelled) return;
        setExistingId(detail.id);
        setQuiz({
          id: detail.id,
          title: detail.titleEn,
          passMark: detail.passingScore,
          attemptsAllowed: detail.maxAttempts,
          questions: detail.questions.map((q) => ({
            id: q.id,
            text: q.question,
            options: q.options,
            correctIndex: q.correctAnswer ?? 0,
            points: q.points,
          })),
        });
      } catch {
        // leave the quiz in its fresh state
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

  const patchQuiz = (patch: Partial<Quiz>) => {
    setQuiz((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const patchQuestion = (index: number, patch: Partial<Question>) => {
    const questions = quiz.questions.map((question, i) =>
      i === index ? { ...question, ...patch } : question,
    );
    patchQuiz({ questions });
  };

  const patchOption = (index: number, optionIndex: number, value: string) => {
    const questions = quiz.questions.map((question, i) => {
      if (i !== index) return question;
      const options = question.options.map((option, j) =>
        j === optionIndex ? value : option,
      );
      return { ...question, options };
    });
    patchQuiz({ questions });
  };

  const removeQuestion = (index: number) => {
    patchQuiz({ questions: quiz.questions.filter((_, i) => i !== index) });
  };

  const addQuestion = () => {
    patchQuiz({ questions: [...quiz.questions, blankQuestion()] });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const body: SaveAssessmentBody = {
      titleEn: quiz.title,
      titleAm: quiz.title,
      passingScore: quiz.passMark,
      maxAttempts: quiz.attemptsAllowed,
      shuffleQuestions: false,
      questions: quiz.questions.map((question) => ({
        id: question.id,
        type: "MULTIPLE_CHOICE" as const,
        question: question.text,
        options: question.options.filter((option) => option.trim() !== ""),
        correctAnswer: question.correctIndex,
        points: question.points,
      })),
    };
    try {
      if (existingId) {
        const updated = await updateAssessment(existingId, body);
        setExistingId(updated.id);
      } else {
        const created = await createCourseAssessment(course.id, body);
        setExistingId(created.id);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save quiz.");
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
  const canSave =
    quiz.title.trim() !== "" &&
    quiz.questions.length > 0 &&
    quiz.questions.every((q) => q.text.trim() !== "" && q.options.some((o) => o.trim() !== ""));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/30">
            <FileQuestion className="h-4 w-4" />
          </span>
          <h3 className="font-display text-sm font-bold text-slate-900">Quiz Builder</h3>
          <Badge variant="outline">{course.code} — {course.title}</Badge>
        </div>
        {saved ? <Badge variant="green" dot>Saved</Badge> : null}
      </div>

      {fetching ? (
        <p className="mt-4 text-sm text-slate-500">Loading existing quiz…</p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Quiz title</label>
              <input
                value={quiz.title}
                onChange={(event) => patchQuiz({ title: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Pass mark (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={quiz.passMark}
                onChange={(event) => patchQuiz({ passMark: Number(event.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Allowed attempts</label>
              <input
                type="number"
                min={1}
                value={quiz.attemptsAllowed}
                onChange={(event) => patchQuiz({ attemptsAllowed: Number(event.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {quiz.questions.length === 0 ? (
              <div className="relative rounded-2xl border-2 border-dashed border-indigo-200/60 bg-indigo-50/20 px-4 py-8 text-center">
                <p className="text-xs font-medium text-slate-500">
                  No questions yet. Add questions below.
                </p>
              </div>
            ) : (
              quiz.questions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <label className="block flex-1">
                      <span className={labelClass}>
                        Question {index + 1}
                      </span>
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
                        onChange={(event) => patchQuestion(index, { points: Number(event.target.value) })}
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

          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {quiz.questions.length} questions · {totalPoints} points total · pass mark {quiz.passMark}%
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus className="h-4 w-4" />
                Add question
              </Button>
              <Button type="button" onClick={save} disabled={!canSave || saving}>
                {saving ? "Saving…" : "Save quiz"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}