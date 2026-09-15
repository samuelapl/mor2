"use client";

import { useRouter } from "next/navigation";
import PageShell from "@/components/shared/PageShell";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";

export default function CreateCoursePage() {
  const router = useRouter();

  return (
    <PageShell
      role="course_owner"
      title="Create New Course"
      description="Add course details, attach materials, and build the final assessment in three steps."
    >
      <div className="max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft">
        <CourseCreationWizard
          onDone={() => router.push("/course-owner/my-courses")}
          onCancel={() => router.back()}
        />
      </div>
    </PageShell>
  );
}
