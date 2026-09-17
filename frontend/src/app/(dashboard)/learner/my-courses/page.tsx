"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, BookOpenCheck, PlayCircle } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { useCourseProgress } from "@/lib/api/useCourseProgress";
import { tr } from "@/constants/labels";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { LearnCourseModal } from "@/components/features/courses/LearnCourseModal";
import { QuizTakerModal } from "@/components/features/quiz/QuizTakerModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

export default function LearnerCoursesPage() {
  const { courses, lang, currentUser } = useLms();
  const me = currentUser?.id ?? "";
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress, loading } = useCourseProgress(enrolled.map((c) => c.id));
  const [learnCourse, setLearnCourse] = useState<{ id: string; title: string } | null>(null);
  const [quizCourse, setQuizCourse] = useState<{ id: string; title: string } | null>(null);

  const rows = useMemo(
    () =>
      enrolled
        .map((course) => ({
          course,
          percent: progress[course.id]?.stats.overallPercent ?? 0,
          done: (progress[course.id]?.stats.overallPercent ?? 0) >= 100,
        }))
        .sort((a, b) => a.percent - b.percent),
    [enrolled, progress],
  );

  const { page, totalPages, setPage, pageItems } = usePagination(rows, 6);

  return (
    <PageShell
      role="learner"
      title={tr(lang, "myCourses")}
      description="Courses you are enrolled in."
    >
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No enrollments yet"
          description="Enrolled courses will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map(({ course, percent, done }) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={loading ? 0 : percent}
              extraBadge={
                done ? (
                  <Badge variant="green">{tr(lang, "completed")}</Badge>
                ) : (
                  <Badge variant="blue">{percent}%</Badge>
                )
              }
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setLearnCourse({ id: course.id, title: course.title })}
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  {tr(lang, "startLearning")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuizCourse({ id: course.id, title: course.title })}
                >
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  {tr(lang, "takeQuiz")}
                </Button>
                {done ? (
                  <Link href="/learner/certificates">
                    <Button size="sm" variant="outline">
                      <Award className="h-3.5 w-3.5" />
                      {tr(lang, "certificates")}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </CourseCard>
          ))}
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

      {quizCourse ? (
        <QuizTakerModal
          open={quizCourse !== null}
          onClose={() => setQuizCourse(null)}
          courseId={quizCourse.id}
          courseTitle={quizCourse.title}
        />
      ) : null}
    </PageShell>
  );
}