"use client";

import { useMemo, useState } from "react";
import { Eye, FilePenLine, PackageOpen, Plus } from "lucide-react";
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
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { COURSE_CATEGORIES } from "@/constants/course-categories";
import { cn } from "@/lib/utils";

type StatusTab = "all" | "draft" | "under_review" | "approved" | "published" | "archived";

export default function CoursesPage() {
  const { courses, currentUser } = useLms();
  const { can } = usePermissions();
  const canCreate = can("course.create");
  const canViewAssignedOnly = can("course.view.assigned") && !can("course.view.all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"manual" | "scorm" | null>(null);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [category, setCategory] = useState("all");
  const [flash, setFlash] = useState<string | null>(null);

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
      if (statusTab === "draft" && course.status !== "draft") return false;
      if (statusTab === "under_review" && course.status !== "under_review") return false;
      if (statusTab === "approved" && (course.status !== "approved" || course.published)) return false;
      if (statusTab === "published" && !course.published && course.status !== "published") return false;
      if (statusTab === "archived" && course.status !== "archived") return false;

      if (category !== "all" && course.category !== category) return false;

      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        (course.rejectionReason ?? "").toLowerCase().includes(q)
      );
    });
  }, [courses, search, statusTab, category]);

  const { page, totalPages, setPage, pageItems } = usePagination(filtered, 6);

  const tabs: { id: StatusTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "draft", label: "Draft", count: counts.draft },
    { id: "under_review", label: "Pending Approval", count: counts.under_review },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "published", label: "Published", count: counts.published },
    { id: "archived", label: "Archived", count: counts.archived },
  ];

  const emptyStateCopy = canViewAssignedOnly
    ? {
        title: "No courses assigned to you yet",
        description: "Once a Training Administrator assigns you to a course, it will appear here.",
      }
    : canCreate
      ? {
          title: "No courses yet",
          description: "Create one to get started, or adjust the filters above.",
        }
      : {
          title: "No courses match",
          description: "Adjust the filters above to see other courses.",
        };

  return (
    <PageShell
      role={currentUser?.role ?? "course_owner"}
      title="Courses"
      description="Browse, review, and manage courses. What you see here is scoped to your role."
      actions={
        canCreate ? (
          <Button onClick={() => setCreateOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        ) : undefined
      }
    >
      {flash ? (
        <div className="mb-4 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700">
          {flash}
        </div>
      ) : null}

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
        <EmptyState title={emptyStateCopy.title} description={emptyStateCopy.description}>
          {canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          ) : undefined}
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

      <WorkspaceDetailOverlay
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreationMode(null);
        }}
        title={creationMode === "manual" ? "Create New Course" : "Create Course"}
        subtitle={
          creationMode === "manual"
            ? "Add course details, build your curriculum, attach content, and set up the final assessment."
            : creationMode === "scorm"
              ? "Import a ready-made SCORM package as a course."
              : "Choose how you'd like to build this course."
        }
      >
        <div className="w-full">
          {/* ── Step 1: Options picker (no mode selected yet) ── */}
          {!creationMode && (
            <div className="grid w-full gap-4 sm:grid-cols-2">
              {([
                {
                  key: "manual" as const,
                  icon: FilePenLine,
                  title: "Create manually",
                  description:
                    "Build the course step by step — details, curriculum, materials and a final assessment.",
                },
                {
                  key: "scorm" as const,
                  icon: PackageOpen,
                  title: "Upload SCORM",
                  description: "Import a ready-made SCORM package as a course.",
                },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setCreationMode(option.key)}
                  className={cn(
                    "group flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-soft ring-super-soft transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift",
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 transition-transform duration-200 group-hover:scale-110">
                    <option.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
                    {option.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2a: Manual creation wizard ── */}
          {creationMode === "manual" && (
            <CourseCreationWizard
              onDone={() => {
                setCreateOpen(false);
                setCreationMode(null);
                setFlash("Course created successfully!");
              }}
              onCancel={() => setCreationMode(null)}
            />
          )}

          {/* ── Step 2b: SCORM placeholder ── */}
          {creationMode === "scorm" && (
            <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-soft">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <PackageOpen className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
                SCORM upload — coming soon
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Uploading and importing SCORM packages isn&apos;t wired up yet. For now, build
                your course manually.
              </p>
              <button
                type="button"
                onClick={() => setCreationMode(null)}
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                ← Back to options
              </button>
            </div>
          )}
        </div>
      </WorkspaceDetailOverlay>
    </PageShell>
  );
}
