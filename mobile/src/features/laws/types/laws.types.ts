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

export interface LawQueryParams {
  categoryId?: string;
  domain?: LawDomain;
  instrumentType?: LawInstrumentType;
  status?: LawStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export const LAW_DOMAINS: { key: LawDomain; labelEn: string; labelAm: string }[] = [
  { key: 'TAX_LAW', labelEn: 'Tax Laws', labelAm: 'የታክስ ሕጎች' },
  { key: 'CUSTOMS_LAW', labelEn: 'Customs Laws', labelAm: 'የጉምሩክ ሕጎች' },
  { key: 'DRAFT_LAW', labelEn: 'Draft Laws', labelAm: 'ረቂቅ ሕጎች' },
  { key: 'OTHER_DOCUMENTS', labelEn: 'Other Docs', labelAm: 'ሌሎች ሰነዶች' },
];

export const LAW_INSTRUMENT_TYPES: { key: LawInstrumentType | 'ALL'; labelEn: string; labelAm: string }[] = [
  { key: 'ALL', labelEn: 'All', labelAm: 'ሁሉም' },
  { key: 'PROCLAMATION', labelEn: 'Proclamations', labelAm: 'አዋጆች' },
  { key: 'REGULATION', labelEn: 'Regulations', labelAm: 'ደንቦች' },
  { key: 'DIRECTIVE', labelEn: 'Directives', labelAm: 'መመሪያዎች' },
  { key: 'CIRCULAR', labelEn: 'Circulars', labelAm: 'ሰርኩላሮች' },
  { key: 'OTHER', labelEn: 'Other', labelAm: 'ሌሎች' },
];

export const LAW_STATUS_CONFIG: Record<
  LawStatus,
  { labelEn: string; labelAm: string; badgeVariant: 'success' | 'danger' | 'warning' | 'neutral' }
> = {
  IN_FORCE: {
    labelEn: 'In Force',
    labelAm: 'በሥራ ላይ ያለ',
    badgeVariant: 'success',
  },
  REPEALED: {
    labelEn: 'Repealed',
    labelAm: 'የተሻረ',
    badgeVariant: 'danger',
  },
  AMENDED: {
    labelEn: 'Amended',
    labelAm: 'የተሻሻለ',
    badgeVariant: 'warning',
  },
  DRAFT: {
    labelEn: 'Draft',
    labelAm: 'ረቂቅ',
    badgeVariant: 'neutral',
  },
};

