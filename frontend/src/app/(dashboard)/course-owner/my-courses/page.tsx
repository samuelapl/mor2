"use client";

import { useMemo, useState } from "react";
import { Eye, Globe2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Pagination } from "@/components/ui/Pagination";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { EditCourseModal } from "@/components/features/courses/EditCourseModal";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { COURSE_CATEGORIES } from "@/constants/course-categories";
import type { Course } from "@/types";
import { cn } from "@/lib/utils";

type StatusTab = "all" | "draft" | "under_review" | "approved" | "published" | "archived";

export default function MyCoursesPage() {
  const { courses, submitForApproval, deleteCourse, publishCourse } = useLms();
  const { can } = usePermissions();
  const canEdit = can("course.update.own") || can("course.update.all");
  const canSubmitApproval = can("course.submit_approval");
  const canDelete = can("course.delete");
  const canPublish = can("course.publish");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [category, setCategory] = useState("all");
  const [flash, setFlash] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Calculate status counts
  const counts = useMemo(() => {
    return {
      all: courses.length,
      draft: courses.filter((c) => c.status === "draft").length,
      under_review: courses.filter((c) => c.status === "under_review").length,
      approved: courses.filter((c) => c.status === "approved" && !c.published).length,
      published: courses.filter((c) => c.published || c.status === "published").length,
      archived: courses.filter((c) => c.status === "archived").length,
    };
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      // Status tab filter
      if (statusTab === "draft" && course.status !== "draft") return false;
      if (statusTab === "under_review" && course.status !== "under_review") return false;
      if (statusTab === "approved" && (course.status !== "approved" || course.published)) return false;
      if (statusTab === "published" && !course.published && course.status !== "published") return false;
      if (statusTab === "archived" && course.status !== "archived") return false;

      // Category filter
      if (category !== "all" && course.category !== category) return false;

      // Search query
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        (course.rejectionReason ?? "").toLowerCase().includes(q)
      );
    });
  }, [courses, search, statusTab, category]);

  const { page, totalPages, setPage, pageItems } = usePagination(filtered, 6);

  const resubmit = async (courseId: string) => {
    const result = await submitForApproval(courseId);
    setFlash(result.ok ? "Course submitted for approval." : result.message);
  };

  const publish = async (courseId: string) => {
    setPublishingId(courseId);
    const result = await publishCourse(courseId);
    setPublishingId(null);
    setFlash(result.ok ? "Course published." : result.message);
  };

  const removeDraft = async (courseId: string) => {
    if (!window.confirm("Delete this draft course? This cannot be undone.")) return;
    setDeletingId(courseId);
    const result = await deleteCourse(courseId);
    setDeletingId(null);
    setFlash(result.ok ? "Course deleted." : result.message);
  };

  const tabs: { id: StatusTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "draft", label: "Draft", count: counts.draft },
    { id: "under_review", label: "Pending Approval", count: counts.under_review },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "published", label: "Published", count: counts.published },
    { id: "archived", label: "Archived", count: counts.archived },
  ];

  return (
    <PageShell
      role="course_owner"
      title="My Courses"
      description="Manage your catalog, submit drafts, and review administrator feedback on rejected courses."
      actions={
        <Button onClick={() => setCreateOpen(true)} className="shadow-sm">
          <Plus className="h-4 w-4" />
          Create Course
        </Button>
      }
    >
      {flash ? (
        <div className="mb-4 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700">
          {flash}
        </div>
      ) : null}

      {/* Navigation Tabs inside My Courses */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const active = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusTab(tab.id);
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150",
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  active ? "bg-slate-700 text-slate-100" : "bg-slate-200/70 text-slate-600",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses…"
        selects={[
          {
            id: "category",
            label: "Category",
            value: category,
            onChange: setCategory,
            options: [
              { value: "all", label: "All Categories" },
              ...COURSE_CATEGORIES.map((item) => ({ value: item, label: item })),
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setStatusTab("all");
          setCategory("all");
        }}
        hasActiveFilters={search !== "" || statusTab !== "all" || category !== "all"}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No courses match"
          description="Adjust filters or create a new course using the '+ Create Course' button above."
        >
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </EmptyState>
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
                  {canEdit ? (
                    <Button size="sm" variant="outline" onClick={() => setEditCourse(course)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit course
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    disabled={!canSubmitApproval}
                    title={!canSubmitApproval ? "You no longer have permission to submit courses" : undefined}
                    onClick={() => resubmit(course.id)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {course.status === "rejected" ? "Resubmit for approval" : "Submit for approval"}
                  </Button>
                </>
              ) : null}
              {course.status === "draft" && canDelete ? (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={deletingId === course.id}
                  onClick={() => void removeDraft(course.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              ) : null}
              {course.status === "approved" && !course.published && canPublish ? (
                <Button
                  size="sm"
                  disabled={publishingId === course.id || !course.trainerId}
                  title={
                    !course.trainerId
                      ? "A trainer must be assigned before publishing — ask a Training Administrator"
                      : undefined
                  }
                  onClick={() => void publish(course.id)}
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Publish
                </Button>
              ) : null}
            </CourseCard>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Course Detail Modal (Screen / Workspace Overlay) */}
      <CourseDetailModal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        courseId={selectedId ?? ""}
      />

      {/* Edit Course Modal (Screen / Workspace Overlay) */}
      <EditCourseModal
        open={editCourse !== null}
        onClose={() => setEditCourse(null)}
        course={editCourse}
      />

      {/* Create Course (Full Workspace Overlay) */}
      <WorkspaceDetailOverlay
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Course"
        subtitle="Build your course step-by-step: details, curriculum with content, final assessment, and review."
      >
        <div className="w-full">
          <CourseCreationWizard
            onDone={() => {
              setCreateOpen(false);
              setFlash("Course created successfully!");
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </div>
      </WorkspaceDetailOverlay>
    </PageShell>
  );
}
