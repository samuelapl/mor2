"use client";

import { useState } from "react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { QuizBuilder } from "@/components/features/quiz/QuizBuilder";
import { EmptyState } from "@/components/ui/EmptyState";

const inputClass =
  "rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

export default function CreateQuizPage() {
  const { courses, currentUser } = useLms();
  const assigned = courses.filter((c) => c.trainerId === currentUser?.id);
  const [courseId, setCourseId] = useState(assigned[0]?.id ?? "");

  const course = courses.find((c) => c.id === courseId) ?? assigned[0];

  return (
    <PageShell
      role="trainer"
      title="Create / Manage Quiz"
      description="Add questions, set the pass mark, and control allowed attempts for any of your courses."
    >
      {assigned.length === 0 ? (
        <EmptyState title="No assigned courses" description="You have no courses to attach a quiz to." />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-soft ring-super-soft">
            <label className="pl-1 text-xs font-semibold text-slate-600">Course</label>
            <select value={course?.id} onChange={(event) => setCourseId(event.target.value)} className={inputClass}>
              {assigned.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.code} — {option.title}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              Any existing quiz for this course loads automatically.
            </span>
          </div>
          {course ? <QuizBuilder key={course.id} course={course} /> : null}
        </>
      )}
    </PageShell>
  );
}