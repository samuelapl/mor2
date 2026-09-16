"use client";

import { useState } from "react";
import { Eye, Globe2, UserRoundCog } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PublishCoursesPage() {
  const { courses, users, publishCourse, assignTrainerToCourse } = useLms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trainerByCourse, setTrainerByCourse] = useState<Record<string, string>>({});

  const trainers = users.filter(
    (u) => u.role === "trainer" && u.status === "active",
  );

  const ready = courses.filter((c) => c.status === "approved" && !c.published);
  const locked = courses.filter((c) => c.status !== "approved");
  const published = courses.filter((c) => c.published);
  const readyPage = usePagination(ready, 5);
  const publishedPage = usePagination(published, 5);

  const hasTrainers = trainers.length > 0;

  const publishWithTrainer = async (courseId: string) => {
    const trainerId = trainerByCourse[courseId] ?? null;
    if (!trainerId) return;
    const assigned = await assignTrainerToCourse(courseId, trainerId);
    if (!assigned.ok) return;
    await publishCourse(courseId);
  };

  return (
    <PageShell
      role="training_admin"
      title="Pending to Publish"
      description="Approved courses awaiting publication. Assign a trainer to publish them to the learner catalog."
    >
      <PageSection
        title="Courses Awaiting Publication"
        description="These courses have passed content review and approval and are ready to be published to learners."
      >
        {ready.length === 0 ? (
          <EmptyState
            title="Nothing to publish"
            description="All approved courses are already published."
          />
        ) : (
          <Table columns={["Course", "Category", "Content", "Trainer", ""]}>
            {readyPage.pageItems.map((course) => (
              <tr key={course.id}>
                <Td>
                  <span className="font-medium text-slate-900">{course.title}</span>
                  <span className="block text-[11px] text-slate-400">{course.code}</span>
                </Td>
                <Td>
                  <Badge variant="outline">{course.category}</Badge>
                </Td>
                <Td>
                  <span className="text-[11px] text-slate-500">
                    {course.modules.length} modules ·{" "}
                    {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons
                  </span>
                </Td>
                <Td>
                  {hasTrainers ? (
                    <select
                      value={trainerByCourse[course.id] ?? course.trainerId ?? ""}
                      onChange={(event) =>
                        setTrainerByCourse((prev) => ({
                          ...prev,
                          [course.id]: event.target.value,
                        }))
                      }
                      className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-300"
                    >
                      <option value="">Select trainer…</option>
                      {trainers.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>
                          {trainer.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="red">No trainers</Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      disabled={!hasTrainers || !(trainerByCourse[course.id] ?? course.trainerId)}
                      title={
                        !hasTrainers
                          ? "Register a trainer before publishing"
                          : "A trainer must be assigned before publishing"
                      }
                      onClick={() => void publishWithTrainer(course.id)}
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                      Publish
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <Pagination page={readyPage.page} totalPages={readyPage.totalPages} onPageChange={readyPage.setPage} />
      </PageSection>

      <PageSection title="Published courses" description="Currently visible to learners.">
        <Table columns={["Course", "Category", "Trainer", "Learners", ""]}>
          {publishedPage.pageItems.map((course) => (
            <tr key={course.id}>
              <Td>
                <span className="font-medium text-slate-900">{course.title}</span>
                <span className="block text-[11px] text-slate-400">{course.code}</span>
              </Td>
              <Td>
                <Badge variant="outline">{course.category}</Badge>
              </Td>
              <Td>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <UserRoundCog className="h-3.5 w-3.5 text-indigo-500/70" />
                  {course.trainerId ? "Assigned" : "—"}
                </span>
              </Td>
              <Td>{course.enrolledLearnerIds.length}</Td>
              <Td className="text-right">
                <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                  <Eye className="h-3.5 w-3.5" />
                  Details
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={publishedPage.page}
          totalPages={publishedPage.totalPages}
          onPageChange={publishedPage.setPage}
        />
      </PageSection>

      {locked.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          {locked.length} course(s) still need content approval before they can be published.
        </div>
      ) : null}

      <CourseDetailModal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        courseId={selectedId ?? ""}
      />
    </PageShell>
  );
}