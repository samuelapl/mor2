"use client";

import { PendingCourseApprovals } from "@/components/features/courses/PendingCourseApprovals";
import PageShell from "@/components/shared/PageShell";

export default function AdminPendingCourseApprovalsPage() {
  return (
    <PageShell
      role="system_admin"
      title="Pending Course Approvals"
      description="Review course submissions, approve to publish, or reject with required feedback."
    >
      <PendingCourseApprovals />
    </PageShell>
  );
}
