"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Laptop } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { useCourseProgress } from "@/lib/api/useCourseProgress";
import { tr } from "@/constants/labels";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { CourseCard } from "@/components/features/courses/CourseCard";
import {
  EnrolledCourseActions,
  isInPersonEnrollment,
} from "@/components/features/courses/EnrolledCourseActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { VenueDetailModal } from "@/components/features/venues/VenueDetailModal";
import type { ApiVenue } from "@/lib/api/types";

export default function LearnerCoursesPage() {
  const router = useRouter();
  const { courses, lang, currentUser, ready, getEnrollmentForCourse } = useLms();
  const me = currentUser?.id ?? "";
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress, loading } = useCourseProgress(enrolled.map((c) => c.id));

  const [modeFilter, setModeFilter] = useState<"ALL" | "ONLINE" | "IN_PERSON">("ALL");
  const [inspectVenue, setInspectVenue] = useState<{
    venue: ApiVenue;
    courseTitle: string;
    courseCode: string;
  } | null>(null);

  // Compute counts for filter tabs
  const { onlineCount, inPersonCount } = useMemo(() => {
    let on = 0;
    let inP = 0;
    for (const c of enrolled) {
      const enr = getEnrollmentForCourse(c.id);
      const isPerson = isInPersonEnrollment(c, enr);
      if (isPerson) {
        inP++;
      } else {
        on++;
      }
    }
    return { onlineCount: on, inPersonCount: inP };
  }, [enrolled, getEnrollmentForCourse]);

  const rows = useMemo(() => {
    const list = enrolled.filter((course) => {
      const enr = getEnrollmentForCourse(course.id);
      const isPerson = isInPersonEnrollment(course, enr);

      if (modeFilter === "ONLINE" && isPerson) return false;
      if (modeFilter === "IN_PERSON" && !isPerson) return false;
      return true;
    });

    return list
      .map((course) => {
        const enr = getEnrollmentForCourse(course.id);
        const isPerson = isInPersonEnrollment(course, enr);
        return {
          course,
          enrollment: enr,
          isPerson,
          percent: progress[course.id]?.stats.overallPercent ?? 0,
          done: (progress[course.id]?.stats.overallPercent ?? 0) >= 100,
        };
      })
      .sort((a, b) => a.percent - b.percent);
  }, [enrolled, progress, modeFilter, getEnrollmentForCourse]);

  const { page, totalPages, setPage, pageItems } = usePagination(rows, 6);

  return (
    <PageShell
      role="learner"
      title={tr(lang, "myCourses")}
      description="Courses you are enrolled in across pure online and in-person regional classroom formats."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Delivery Mode Tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setModeFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
              modeFilter === "ALL"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Courses ({enrolled.length})
          </button>
          <button
            type="button"
            onClick={() => setModeFilter("ONLINE")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
              modeFilter === "ONLINE"
                ? "bg-white text-sky-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>Pure Online ({onlineCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setModeFilter("IN_PERSON")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
              modeFilter === "IN_PERSON"
                ? "bg-white text-amber-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>In-Person Classroom ({inPersonCount})</span>
          </button>
        </div>

        <LanguageToggle />
      </div>

      {!ready ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton count={6} />
        </div>
      ) : enrolled.length === 0 ? (
        <EmptyState
          title="No enrolled courses"
          description="Browse the catalog to enroll in pure online or in-person Ministry training courses."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            modeFilter === "IN_PERSON"
              ? "No in-person classroom enrollments"
              : "No online enrollments"
          }
          description="You do not have any enrolled courses matching this delivery mode filter."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map(({ course, enrollment, isPerson, percent, done }) => (
            <CourseCard
              key={course.id}
              course={course}
              showStatus={false}
              progress={loading ? 0 : percent}
              onClick={() => router.push(`/learner/courses/${course.id}/learn`)}
              extraBadge={
                <div className="flex flex-col items-end gap-1">
                  {isPerson ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                      <Building2 className="h-3 w-3" />
                      {enrollment?.venue?.branch || "In-Person Classroom"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
                      <Laptop className="h-3 w-3" />
                      Pure Online
                    </span>
                  )}

                  {done ? (
                    <Badge variant="green">{tr(lang, "completed")}</Badge>
                  ) : (
                    <Badge variant="blue">{percent}%</Badge>
                  )}
                </div>
              }
            >
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
            </CourseCard>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Classroom Venue Details Inspection Modal */}
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