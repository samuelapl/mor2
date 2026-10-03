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
  course: {
    id: string;
    title?: string;
    titleEn?: string;
    titleAm?: string;
    code: string;
    estimatedHours?: number | string | null;
  };
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  template?: {
    id?: string;
    name?: string;
    backgroundUrl?: string | null;
    fields?: any;
  } | null;
}
