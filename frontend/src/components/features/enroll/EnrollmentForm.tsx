"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useLms } from "@/lib/lms-store";
import { cn } from "@/lib/utils";

export function EnrollmentForm() {
  const { courses, users, enrollLearners } = useLms();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const course = courses.find((c) => c.id === courseId);
  const learners = useMemo(() => users.filter((user) => user.role === "learner"), [users]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (!course || selected.length === 0) return;
    const result = await enrollLearners(course.id, selected);
    if (result.ok) {
      setSuccess(`${selected.length} learner(s) enrolled in "${course.title}"`);
      setSelected([]);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft">
        <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-indigo-500/10 to-transparent" />
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/30">
            <UsersRound className="h-4 w-4" />
          </span>
          Enrollment
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Select a course and assign learners individually.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Course</label>
            <select
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                setSelected([]);
              }}
              className={inputClass}
            >
              {courses.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.code} — {option.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Learners ({selected.length} selected)
            </label>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/50 p-2">
              {learners.map((learner) => {
                const checked = selected.includes(learner.id);
                return (
                  <button
                    key={learner.id}
                    type="button"
                    onClick={() => toggle(learner.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all duration-150",
                      checked
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25"
                        : "text-slate-700 hover:bg-white hover:shadow-sm",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{learner.name}</span>
                      <span className={cn("block truncate text-[11px]", checked ? "text-slate-100/80" : "text-slate-400")}>
                        {learner.department}
                      </span>
                    </span>
                    {checked ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="button" onClick={submit} disabled={selected.length === 0}>
            Enroll {selected.length > 0 ? `${selected.length} learner(s)` : ""}
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft">
        <h3 className="text-sm font-semibold text-slate-900">Enrolled learners</h3>
        <p className="mt-1 text-xs text-slate-500">
          Current learner roster for the selected course.
        </p>
        {course ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {course.enrolledLearnerIds.length === 0 ? (
              <p className="text-xs text-slate-400">No learners enrolled yet.</p>
            ) : (
              course.enrolledLearnerIds.map((id) => {
                const learner = users.find((user) => user.id === id);
                return (
                  <Badge key={id} variant="outline">
                    {learner?.name ?? id} · {learner?.department ?? ""} ·{" "}
                    {course.progress[id] ?? 0}%
                  </Badge>
                );
              })
            )}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        ) : null}
      </div>
    </div>
  );
}