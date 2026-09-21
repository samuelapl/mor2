"use client";

import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { EnrollmentForm } from "@/components/features/enroll/EnrollmentForm";

export default function EnrollmentsPage() {
  const { courses } = useLms();

  return (
    <PageShell
      role="training_admin"
      title="Course Enrolled Students & Roster"
      description="Inspect enrolled learners, track real-time course progress, and manage learner assignments across all catalog courses."
    >
      <EnrollmentForm />
    </PageShell>
  );
}