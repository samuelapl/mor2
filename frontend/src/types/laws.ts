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

export const LAW_DOMAINS: { key: LawDomain; labelEn: string; labelAm: string; description: string }[] = [
  { key: 'TAX_LAW', labelEn: 'Tax Laws', labelAm: 'የታክስ ሕጎች', description: 'Domestic direct and indirect tax legislation' },
  { key: 'CUSTOMS_LAW', labelEn: 'Customs Laws', labelAm: 'የጉምሩክ ሕጎች', description: 'Cross-border trade tariffs and customs controls' },
  { key: 'DRAFT_LAW', labelEn: 'Draft Laws', labelAm: 'ረቂቅ ሕጎች', description: 'Upcoming proposals and public consultation drafts' },
  { key: 'OTHER_DOCUMENTS', labelEn: 'Other Documents', labelAm: 'ሌሎች ሰነዶች', description: 'Treaties, technical circulars, and official guidance' },
];

export const LAW_INSTRUMENT_TYPES: { key: LawInstrumentType; labelEn: string; labelAm: string }[] = [
  { key: 'PROCLAMATION', labelEn: 'Proclamations', labelAm: 'አዋጆች' },
  { key: 'REGULATION', labelEn: 'Regulations', labelAm: 'ደንቦች' },
  { key: 'DIRECTIVE', labelEn: 'Directives', labelAm: 'መመሪያዎች' },
  { key: 'CIRCULAR', labelEn: 'Circulars', labelAm: 'ሰርኩላሮች' },
  { key: 'OTHER', labelEn: 'Other', labelAm: 'ሌሎች' },
];

export const LAW_STATUS_CONFIG: Record<LawStatus, { labelEn: string; labelAm: string; badgeClass: string }> = {
  IN_FORCE: {
    labelEn: 'In Force',
    labelAm: 'በሥራ ላይ ያለ',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  REPEALED: {
    labelEn: 'Repealed',
    labelAm: 'የተሻረ',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  },
  AMENDED: {
    labelEn: 'Amended',
    labelAm: 'የተሻሻለ',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  DRAFT: {
    labelEn: 'Draft',
    labelAm: 'ረቂቅ',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-700',
  },
};

