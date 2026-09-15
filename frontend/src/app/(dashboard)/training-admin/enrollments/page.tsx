"use client";

import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { EnrollmentForm } from "@/components/features/enroll/EnrollmentForm";

export default function EnrollmentsPage() {
  const { courses } = useLms();

  return (
    <PageShell
      role="training_admin"
      title="Enrollments"
      description={`Assign learners to any of the ${courses.length} courses in the catalog. Changes update the roster immediately.`}
    >
      <EnrollmentForm />
    </PageShell>
  );
}