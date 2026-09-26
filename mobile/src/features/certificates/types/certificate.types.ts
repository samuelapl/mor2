/** GET /certificates/me · /certificates/:id (spec §9). */
export interface ApiCertificate {
  id: string;
  userId: string;
  courseId: string;
  templateId: string | null;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  expiresAt: string | null;
  pdfFileUrl: string | null;
  /** Presigned (1 h) — fetch a fresh one via /download right before downloading. */
  downloadUrl: string | null;
  course: { id: string; titleEn: string; titleAm: string; code: string };
}
