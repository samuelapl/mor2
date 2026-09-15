"use client";

import { useMemo, useState } from "react";
import { BookPlus } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { CatalogCourseModal } from "@/components/features/courses/CatalogCourseModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { COURSE_CATEGORIES } from "@/constants/course-categories";

export default function LearnerCatalogPage() {
  const { courses, currentUser, lang, enrollSelf } = useLms();
  const me = currentUser?.id;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [flash, setFlash] = useState<string | null>(null);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (!course.published || course.status !== "approved") return false;
      if (category !== "all" && course.category !== category) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q)
      );
    });
  }, [courses, search, category]);

  const enroll = async (courseId: string) => {
    const result = await enrollSelf(courseId);
    setFlash(result.ok ? "You are enrolled. Open My Courses to start learning." : result.message);
  };

  return (
    <PageShell
      role="learner"
      title="Available Courses"
      description="Published courses you can enroll in."
    >
      <div className="mb-4 flex justify-end">
        <LanguageToggle />
      </div>
      {flash ? (
        <div className="mb-4 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700">
          {flash}
        </div>
      ) : null}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search available courses…"
        selects={[
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
          setCategory("all");
        }}
        hasActiveFilters={search !== "" || category !== "all"}
      />

      {available.length === 0 ? (
        <EmptyState
          title="No published courses"
          description="Approved courses appear here after an administrator publishes them."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {available.map((course) => {
            const enrolled = me ? course.enrolledLearnerIds.includes(me) : false;
            return (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => setOpenCourseId(course.id)}
              >
                {enrolled ? (
                  <Button size="sm" variant="outline" disabled>
                    Already enrolled
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      void enroll(course.id);
                    }}
                  >
                    <BookPlus className="h-3.5 w-3.5" />
                    Enroll
                  </Button>
                )}
              </CourseCard>
            );
          })}
        </div>
      )}

      {openCourseId ? (
        <CatalogCourseModal
          open
          onClose={() => setOpenCourseId(null)}
          courseId={openCourseId}
        />
      ) : null}
    </PageShell>
  );
}
