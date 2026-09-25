"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { useCourseProgress } from "@/lib/api/useCourseProgress";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { CatalogCourseModal } from "@/components/features/courses/CatalogCourseModal";
import {
  EnrolledCourseActions,
  isInPersonEnrollment,
} from "@/components/features/courses/EnrolledCourseActions";
import { VenueDetailModal } from "@/components/features/venues/VenueDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { COURSE_CATEGORIES } from "@/constants/course-categories";
import type { ApiVenue } from "@/lib/api/types";

export default function LearnerCatalogPage() {
  const router = useRouter();
  const { courses, currentUser, getEnrollmentForCourse } = useLms();
  const me = currentUser?.id;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [inspectVenue, setInspectVenue] = useState<{
    venue: ApiVenue;
    courseTitle: string;
    courseCode: string;
  } | null>(null);

  const enrolledCourseIds = useMemo(() => {
    return courses
      .filter((c) => (me ? c.enrolledLearnerIds.includes(me) : false))
      .map((c) => c.id);
  }, [courses, me]);
  const { progress } = useCourseProgress(enrolledCourseIds);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (!course.published && course.status !== "published") return false;
      if (category !== "all" && course.category !== category) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q)
      );
    });
  }, [courses, search, category]);

  const { page, totalPages, setPage, pageItems } = usePagination(available, 6);

  return (
    <PageShell
      role="learner"
      title="Available Courses"
      description="Published courses you can enroll in."
    >
      <div className="mb-4 flex justify-end">
        <LanguageToggle />
      </div>
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
          {pageItems.map((course) => {
            const enrolled = me ? course.enrolledLearnerIds.includes(me) : false;
            const percent = progress[course.id]?.stats.overallPercent ?? 0;
            const done = percent >= 100;
            const enrollment = enrolled ? getEnrollmentForCourse(course.id) : undefined;
            const isPerson = enrolled && isInPersonEnrollment(course, enrollment);

            return (
              <CourseCard
                key={course.id}
                course={course}
                showStatus={false}
                progress={enrolled ? percent : undefined}
                onClick={() => {
                  if (enrolled) {
                    router.push(`/learner/courses/${course.id}/learn`);
                  } else {
                    setOpenCourseId(course.id);
                  }
                }}
              >
                {enrolled ? (
                  <EnrolledCourseActions
                    courseId={course.id}
                    done={done}
                    isPerson={isPerson}
                    onViewVenue={
                      isPerson && enrollment?.venue
                        ? () =>
                            setInspectVenue({
                              venue: enrollment.venue!,
                              courseTitle: course.title,
                              courseCode: course.code,
                            })
                        : undefined
                    }
                  />
                ) : (
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenCourseId(course.id);
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
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {openCourseId ? (
        <CatalogCourseModal
          open
          onClose={() => setOpenCourseId(null)}
          courseId={openCourseId}
        />
      ) : null}

      {inspectVenue ? (
        <VenueDetailModal
          open
          onClose={() => setInspectVenue(null)}
          venue={inspectVenue.venue}
          courseTitle={inspectVenue.courseTitle}
          courseCode={inspectVenue.courseCode}
        />
      ) : null}
    </PageShell>
  );
}
