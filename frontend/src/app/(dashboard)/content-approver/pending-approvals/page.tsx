"use client";

import PageShell from "@/components/shared/PageShell";
import { PendingCourseApprovals } from "@/components/features/courses/PendingCourseApprovals";

export default function PendingApprovalsPage() {
  return (
    <PageShell
      role="content_approver"
      title="Pending Approvals"
      description="Review submissions and approve or reject course content. A rejection reason is required."
    >
      <PendingCourseApprovals />
    </PageShell>
  );
}
