"use client";

import { CertificateTemplatesAdmin } from "@/components/features/certificates/CertificateTemplatesAdmin";
import PageShell from "@/components/shared/PageShell";
import { useLms } from "@/lib/lms-store";

export default function CertificateTemplatesPage() {
  const { currentUser } = useLms();

  return (
    <PageShell
      role={currentUser?.role ?? "system_admin"}
      title="Certificate Templates"
      description="Manage the layouts and brand assets used to issue official completion certificates."
    >
      <CertificateTemplatesAdmin />
    </PageShell>
  );
}

