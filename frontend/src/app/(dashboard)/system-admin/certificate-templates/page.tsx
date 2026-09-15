import { CertificateTemplatesAdmin } from "@/components/features/certificates/CertificateTemplatesAdmin";
import PageShell from "@/components/shared/PageShell";

export default function CertificateTemplatesPage() {
  return (
    <PageShell
      role="system_admin"
      title="Certificate Templates"
      description="Manage the layouts used to issue completion certificates."
    >
      <CertificateTemplatesAdmin />
    </PageShell>
  );
}