"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Send } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { CreateCourseModal } from "@/components/features/courses/CreateCourseModal";
import { EditCourseModal } from "@/components/features/courses/EditCourseModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { COURSE_CATEGORIES } from "@/constants/course-categories";
import type { Course } from "@/types";

export default function MyCoursesPage() {
  const { courses, submitForApproval } = useLms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [flash, setFlash] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (status !== "all" && course.status !== status) return false;
      if (category !== "all" && course.category !== category) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        (course.rejectionReason ?? "").toLowerCase().includes(q)
      );
    });
  }, [courses, search, status, category]);
  const { page, totalPages, setPage, pageItems } = usePagination(filtered, 6);

  const resubmit = async (courseId: string) => {
    const result = await submitForApproval(courseId);
    setFlash(result.ok ? "Course submitted for approval." : result.message);
  };

  return (
    <PageShell
      role="course_owner"
      title="My Courses"
      description="Manage your catalog, submit drafts, and review administrator feedback on rejected courses."
    >
      {flash ? (
        <div className="mb-4 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700">
          {flash}
        </div>
      ) : null}

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create New Course
        </Button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses…"
        selects={[
          {
            id: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "all", label: "All" },
              { value: "draft", label: "Draft" },
              { value: "under_review", label: "Pending approval" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ],
          },
          {
            id: "category",
            label: "Category",
            value: category,
            onChange: setCategory,
            options: [
              { value: "all", label: "All" },
              ...COURSE_CATEGORIES.map((item) => ({ value: item, label: item })),
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setStatus("all");
          setCategory("all");
        }}
        hasActiveFilters={search !== "" || status !== "all" || category !== "all"}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No courses match"
          description="Adjust filters or create a new course."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              extraBadge={
                course.status === "under_review" ? <Badge variant="blue">Pending review</Badge> : undefined
              }
            >
              {course.status === "rejected" && course.rejectionReason ? (
                <div className="w-full rounded-xl border border-red-200/70 bg-red-50/80 px-3 py-2 text-xs text-red-700">
                  <p className="font-semibold">Admin feedback</p>
                  <p className="mt-0.5">{course.rejectionReason}</p>
                </div>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                <Eye className="h-3.5 w-3.5" />
                Details
              </Button>
              {course.status === "draft" || course.status === "rejected" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditCourse(course)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit course
                  </Button>
                  <Button size="sm" onClick={() => resubmit(course.id)}>
                    <Send className="h-3.5 w-3.5" />
                    {course.status === "rejected" ? "Resubmit for approval" : "Submit for approval"}
                  </Button>
                </>
              ) : null}
            </CourseCard>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <CourseDetailModal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        courseId={selectedId ?? ""}
      />
      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditCourseModal
        open={editCourse !== null}
        onClose={() => setEditCourse(null)}
        course={editCourse}
      />
    </PageShell>
  );
}
