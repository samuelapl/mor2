export type LawDomain = 'TAX_LAW' | 'CUSTOMS_LAW' | 'DRAFT_LAW' | 'OTHER_DOCUMENTS';
export type LawInstrumentType = 'PROCLAMATION' | 'REGULATION' | 'DIRECTIVE' | 'CIRCULAR' | 'OTHER';
export type LawStatus = 'IN_FORCE' | 'REPEALED' | 'AMENDED' | 'DRAFT';

export interface LawCategory {
  id: string;
  domain: LawDomain;
  instrumentType: LawInstrumentType;
  nameEn: string;
  nameAm?: string | null;
  description?: string | null;
  order: number;
  _count?: {
    documents: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocument {
  id: string;
  categoryId: string;
  category?: LawCategory;
  documentNumber: string;
  titleEn: string;
  titleAm?: string | null;
  descriptionEn?: string | null;
  descriptionAm?: string | null;
  status: LawStatus;
  yearIssued?: number | null;
  coverImageUrl?: string | null;
  pdfUrl: string;
  fileName: string;
  fileSize?: number | null;
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLegalDocuments {
  data: LegalDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateLawCategoryInput {
  domain: LawDomain;
  instrumentType: LawInstrumentType;
  nameEn: string;
  nameAm?: string;
  description?: string;
  order?: number;
}

export interface UpdateLawCategoryInput {
  domain?: LawDomain;
  instrumentType?: LawInstrumentType;
  nameEn?: string;
  nameAm?: string;
  description?: string;
  order?: number;
}

export interface CreateLegalDocumentInput {
  categoryId: string;
  documentNumber: string;
  titleEn: string;
  titleAm?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  status?: LawStatus;
  yearIssued?: number;
  coverImageUrl?: string;
  pdfUrl: string;
  fileName: string;
  fileSize?: number;
}

export interface UpdateLegalDocumentInput {
  categoryId?: string;
  documentNumber?: string;
  titleEn?: string;
  titleAm?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  status?: LawStatus;
  yearIssued?: number;
  coverImageUrl?: string;
  pdfUrl?: string;
  fileName?: string;
  fileSize?: number;
}

/** Labels: locales laws.domain.<key>, laws.instrumentType.<key>, laws.status.<key>. */
export const LAW_DOMAINS: { key: LawDomain; description: string }[] = [
  { key: 'TAX_LAW', description: 'Domestic direct and indirect tax legislation' },
  { key: 'CUSTOMS_LAW', description: 'Cross-border trade tariffs and customs controls' },
  { key: 'DRAFT_LAW', description: 'Upcoming proposals and public consultation drafts' },
  { key: 'OTHER_DOCUMENTS', description: 'Treaties, technical circulars, and official guidance' },
];

export const LAW_INSTRUMENT_TYPES: { key: LawInstrumentType }[] = [
  { key: 'PROCLAMATION' },
  { key: 'REGULATION' },
  { key: 'DIRECTIVE' },
  { key: 'CIRCULAR' },
  { key: 'OTHER' },
];

export const LAW_STATUS_CONFIG: Record<LawStatus, { badgeClass: string }> = {
  IN_FORCE: {
    badgeClass: 'bg-success-soft text-success border-success/30',
  },
  REPEALED: {
    badgeClass: 'bg-danger-soft text-danger border-danger/30',
  },
  AMENDED: {
    badgeClass: 'bg-warning-soft text-warning border-warning/30',
  },
  DRAFT: {
    badgeClass: 'bg-muted text-secondary-foreground border-border',
  },
};

