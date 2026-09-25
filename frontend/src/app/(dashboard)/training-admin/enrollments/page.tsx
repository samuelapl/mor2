"use client";

import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { EnrollmentForm } from "@/components/features/enroll/EnrollmentForm";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function EnrollmentsPage() {
  const { courses } = useLms();
  const { tBilingual } = useTranslation();

  return (
    <PageShell
      role="training_admin"
      title={tBilingual("Course Enrolled Students & Roster", "የተመዘገቡ ተማሪዎች ዝርዝር")}
      description={tBilingual(
        "Inspect enrolled learners, track real-time course progress, and manage learner assignments across all catalog courses.",
        "የተመዘገቡ ተማሪዎችን ይመልከቱ፣ የቀጥታ የትምህርት እድገታቸውን ይከታተሉ እና የተማሪዎችን ምደባ በሁሉም የኮርስ ካታሎጎች ያስተዳድሩ።"
      )}
    >
      <EnrollmentForm />
    </PageShell>
  );
}