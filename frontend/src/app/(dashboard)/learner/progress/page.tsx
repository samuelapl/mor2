"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Lock, PlayCircle } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { useCourseProgress } from "@/lib/api/useCourseProgress";
import { tr } from "@/constants/labels";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Pagination } from "@/components/ui/Pagination";
import { LearnCourseModal } from "@/components/features/courses/LearnCourseModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

export default function ProgressPage() {
  const router = useRouter();
  const { courses, lang, currentUser } = useLms();
  const me = currentUser?.id ?? "";
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress, loading } = useCourseProgress(enrolled.map((c) => c.id));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [learnCourse, setLearnCourse] = useState<{ id: string; title: string } | null>(null);

  const rows = enrolled
    .map((course) => ({
      course,
      data: progress[course.id],
      percent: progress[course.id]?.stats.overallPercent ?? 0,
    }))
    .sort((a, b) => a.percent - b.percent);

  const { page, totalPages, setPage, pageItems } = usePagination(rows, 6);

  return (
    <PageShell
      role="learner"
      title={tr(lang, "progress")}
      description="Your completion progress across all enrolled courses."
    >
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-sm text-slate-500">Loading progress…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="No courses" description="Enrolled courses will appear here." />
      ) : (
        <div className="space-y-3">
          {pageItems.map(({ course, data, percent }) => {
            const done = percent >= 100;
            const open = Boolean(expanded[course.id]);
            return (
              <div
                key={course.id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [course.id]: !prev[course.id] }))
                  }
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{course.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {data ? `${data.stats.completedLessons}/${data.stats.totalLessons} lessons · ${data.stats.totalModules} modules` : course.code}
                    </p>
                  </div>
                  <div className="w-40">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={percent} className="flex-1" />
                      <span className="w-10 text-right text-xs font-medium text-slate-600">
                        {data ? `${percent}%` : "…"}
                      </span>
                    </div>
                  </div>
                  <Badge variant={done ? "green" : "blue"}>
                    {done ? tr(lang, "completed") : tr(lang, "inProgress")}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className={
                      done
                        ? "border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
                        : ""
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/learner/courses/${course.id}/learn`);
                    }}
                  >
                    {done ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {tr(lang, "completed")}
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        Continue
                      </>
                    )}
                  </Button>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                      open ? "rotate-180" : "",
                    )}
                  />
                </button>
                {open && data ? (
                  <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                    {data.modules.map((mod) => (
                      <div key={mod.moduleId}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">
                            {mod.unlocked === false ? (
                              <Lock className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                            ) : null}
                            {mod.titleEn}
                            <span className="ml-2 text-xs font-normal text-slate-400">
                              {mod.completedLessons}/{mod.totalLessons} lessons
                            </span>
                          </p>
                          <Badge variant={mod.moduleCompleted ? "green" : "outline"}>
                            {mod.moduleCompleted ? "Complete" : `${mod.progressPercent}%`}
                          </Badge>
                        </div>
                        <Table columns={["Lesson", "Status"]}>
                          {mod.lessons.map((lesson) => (
                            <tr key={lesson.lessonId}>
                              <Td>
                                <span
                                  className={cn(
                                    "font-medium",
                                    lesson.unlocked === false
                                      ? "text-slate-400"
                                      : "text-slate-700",
                                  )}
                                >
                                  {lesson.titleEn}
                                </span>
                              </Td>
                              <Td>
                                {lesson.completed ? (
                                  <Badge variant="green">Completed</Badge>
                                ) : lesson.unlocked === false ? (
                                  <Badge variant="slate">
                                    <Lock className="h-3 w-3" />
                                    Locked
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Not started</Badge>
                                )}
                                <Badge variant={lesson.completed ? "green" : lesson.unlocked === false ? "slate" : "outline"}>
                                  {lesson.completed ? "Completed" : lesson.unlocked === false ? "Locked" : "Not started"}
                                </Badge>
                              </Td>
                            </tr>
                          ))}
                        </Table>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      {learnCourse ? (
        <LearnCourseModal
          open={learnCourse !== null}
          onClose={() => setLearnCourse(null)}
          courseId={learnCourse.id}
          courseTitle={learnCourse.title}
        />
      ) : null}
    </PageShell>
  );
}