"use client";

import { useEffect, useState } from "react";
import { Award, Download, Eye, Printer } from "lucide-react";
import type { ApiCertificate, ApiCertificateTemplate } from "@/lib/api/types";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { CertificateRenderer } from "@/components/features/certificates/CertificateRenderer";
import { fetchActiveCertificateTemplate } from "@/lib/api/certificates";

interface CertificateCardProps {
  certificate: ApiCertificate;
  learnerName: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CertificateCard({ certificate, learnerName }: CertificateCardProps) {
  const [open, setOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ApiCertificateTemplate | null>(null);
  const course = certificate.course;

  useEffect(() => {
    if (!certificate.template) {
      void fetchActiveCertificateTemplate().then(setActiveTemplate).catch(() => {});
    }
  }, [certificate.template]);

  const templateToUse = certificate.template || activeTemplate || undefined;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Card interactive className="group flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30 transition-transform duration-200 group-hover:scale-110">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>{course.titleEn}</CardTitle>
            <CardDescription>
              {course.code} · {formatDate(certificate.issuedAt)}
            </CardDescription>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <Badge variant="green" dot>{certificate.certificateNumber}</Badge>
          <div className="flex gap-2">
            {certificate.downloadUrl ? (
              <a href={certificate.downloadUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
              </a>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
          </div>
        </div>
      </Card>

      <WorkspaceDetailOverlay
        open={open}
        onClose={() => setOpen(false)}
        title="Official Certificate of Completion"
        subtitle={`${course.titleEn} (${course.code}) · Verified Credential`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
            {certificate.downloadUrl ? (
              <a href={certificate.downloadUrl} target="_blank" rel="noreferrer">
                <Button size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </a>
            ) : null}
          </div>
        }
      >
        <div className="w-full space-y-6 pb-12">
          <div className="rounded-2xl border border-slate-200 bg-slate-900/5 p-4 shadow-inner overflow-hidden flex items-center justify-center">
            <div className="w-full max-w-4xl">
              <CertificateRenderer
                template={templateToUse}
                studentName={learnerName}
                courseTitle={course.titleEn || course.titleAm}
                courseCode={course.code}
                certificateNumber={certificate.certificateNumber}
                verificationCode={certificate.verificationCode}
                completionDate={certificate.issuedAt}
                editable={false}
              />
            </div>
          </div>
        </div>
      </WorkspaceDetailOverlay>
    </>
  );
}