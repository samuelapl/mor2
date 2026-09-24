"use client";

import React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileQuestion,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import type { Question, QuestionType, UploadedResource } from "@/types";
import { Button } from "@/components/ui/Button";
import { uploadAttachment } from "@/lib/api/files";
import { toast } from "@/lib/toast";
import { inputClass, labelClass, uid } from "./wizard-types";
import { CompactRichEditor, MultiFileUploader } from "./wizard-components";

export interface StepFinalAssessmentProps {
  quizTitle: string;
  setQuizTitle: (val: string) => void;
  passMark: number;
  setPassMark: (val: number) => void;
  timeLimitMinutes: number | null;
  setTimeLimitMinutes: (val: number) => void;
  attemptsAllowed: number;
  setAttemptsAllowed: (val: number) => void;
  allowEarlySubmission: boolean;
  setAllowEarlySubmission: (val: boolean) => void;
  autoSubmitOnExpire: boolean;
  setAutoSubmitOnExpire: (val: boolean) => void;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  bankQuestions: Question[];
  assessmentResources: UploadedResource[];
  assessmentFileUrl: string;
  assessmentFileName: string;
  assessmentFileSize: number;
  assessmentUploading: boolean;
  assessmentUploadError: string | null;
  handleFinalAssessmentFileUpload: (files: File | File[] | FileList) => Promise<void>;
  removeFinalAssessmentFile: (fileIdOrUrl: string) => void;
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

function optionsForType(type: QuestionType): string[] {
  if (type === "true_false") return ["True", "False"];
  if (type === "short_answer") return [];
  return ["", "", "", ""];
}

export function StepFinalAssessment({
  quizTitle,
  setQuizTitle,
  passMark,
  setPassMark,
  timeLimitMinutes,
  setTimeLimitMinutes,
  attemptsAllowed,
  setAttemptsAllowed,
  allowEarlySubmission,
  setAllowEarlySubmission,
  autoSubmitOnExpire,
  setAutoSubmitOnExpire,
  questions,
  setQuestions,
  bankQuestions,
  assessmentResources,
  assessmentFileUrl,
  assessmentFileName,
  assessmentFileSize,
  assessmentUploading,
  assessmentUploadError,
  handleFinalAssessmentFileUpload,
  removeFinalAssessmentFile,
  editingCourseId,
}: StepFinalAssessmentProps) {
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

  return (
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

      {/* Final Assessment Reference Document / Case Study Attachment */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Assessment Reference Document / Exam Briefing (Optional)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload an exam scenario, reference formula sheet, case study document, or dataset for the final assessment.
            </p>
          </div>
          {assessmentUploading && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading to storage…
            </span>
          )}
        </div>

        {assessmentUploadError && (
          <p className="text-xs text-red-600 mt-1">{assessmentUploadError}</p>
        )}
        <MultiFileUploader
          id="final-assessment-file"
          files={assessmentResources}
          legacyUrl={assessmentFileUrl}
          legacyName={assessmentFileName}
          legacySize={assessmentFileSize}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.zip,.png,.jpg,.jpeg"
          uploading={assessmentUploading}
          uploadError={assessmentUploadError}
          theme="emerald"
          placeholderText="Upload Final Assessment Brief, Reference Sheet, or Case Study File"
          descriptionText="Attach multiple formula sheets, reference documents, or case study files for learners during final assessment."
          onUpload={handleFinalAssessmentFileUpload}
          onRemove={removeFinalAssessmentFile}
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

              {/* Question Diagram / Image Attachment */}
              <div className="pt-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Question Diagram / Reference Image (Optional)</span>
                  {q.imageUrl && (
                    <button
                      type="button"
                      onClick={() => patchQuestion(qIdx, { imageUrl: undefined })}
                      className="text-[11px] text-red-500 hover:text-red-700 underline"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                {q.imageUrl ? (
                  <div className="relative inline-block rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={q.imageUrl} alt="Question diagram" className="max-h-40 max-w-full rounded-lg object-contain" />
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id={`step3-q-img-${q.id || qIdx}`}
                      className="sr-only"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleQuestionImageUpload(
                            f,
                            (url) => patchQuestion(qIdx, { imageUrl: url }),
                            (err) => toast.error(err),
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`step3-q-img-${q.id || qIdx}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-400" />
                      <span>Attach Diagram, Chart, or Problem Screenshot</span>
                    </label>
                  </div>
                )}
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

        {questions.length > 0 && (
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              {questions.length} question{questions.length !== 1 ? "s" : ""} configured
            </span>
            <Button size="sm" onClick={addQuestion} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

