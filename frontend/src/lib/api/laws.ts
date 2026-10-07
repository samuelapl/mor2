import { api } from './client';
import type {
  CreateLawCategoryInput,
  CreateLegalDocumentInput,
  LawCategory,
  LawDomain,
  LawInstrumentType,
  LawStatus,
  LegalDocument,
  PaginatedLegalDocuments,
  UpdateLawCategoryInput,
  UpdateLegalDocumentInput,
} from '@/types/laws';

/* -------------------------------------------------------------------------- */
/*  Categories API                                                            */
/* -------------------------------------------------------------------------- */

export async function fetchLawCategories(params: {
  domain?: LawDomain;
  instrumentType?: LawInstrumentType;
  search?: string;
} = {}): Promise<LawCategory[]> {
  const query: Record<string, string> = {};
  if (params.domain) query.domain = params.domain;
  if (params.instrumentType) query.instrumentType = params.instrumentType;
  if (params.search?.trim()) query.search = params.search.trim();

  return api<LawCategory[]>('laws/categories', { query });
}

export async function fetchLawCategoryById(id: string): Promise<LawCategory> {
  return api<LawCategory>(`laws/categories/${id}`);
}

export async function createLawCategory(input: CreateLawCategoryInput): Promise<LawCategory> {
  return api<LawCategory>('laws/categories', {
    method: 'POST',
    body: input,
  });
}

export async function updateLawCategory(
  id: string,
  input: UpdateLawCategoryInput,
): Promise<LawCategory> {
  return api<LawCategory>(`laws/categories/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteLawCategory(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`laws/categories/${id}`, {
    method: 'DELETE',
  });
}

/* -------------------------------------------------------------------------- */
/*  Legal Documents API                                                       */
/* -------------------------------------------------------------------------- */

export async function fetchLegalDocuments(params: {
  page?: number;
  limit?: number;
  categoryId?: string;
  domain?: LawDomain;
  instrumentType?: LawInstrumentType;
  status?: LawStatus;
  search?: string;
  yearIssued?: number;
} = {}): Promise<PaginatedLegalDocuments> {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  if (params.categoryId) query.categoryId = params.categoryId;
  if (params.domain) query.domain = params.domain;
  if (params.instrumentType) query.instrumentType = params.instrumentType;
  if (params.status) query.status = params.status;
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.yearIssued) query.yearIssued = params.yearIssued;

  return api<PaginatedLegalDocuments>('laws/documents', { query });
}

export async function fetchLegalDocumentById(id: string): Promise<LegalDocument> {
  return api<LegalDocument>(`laws/documents/${id}`);
}

export async function createLegalDocument(input: CreateLegalDocumentInput): Promise<LegalDocument> {
  return api<LegalDocument>('laws/documents', {
    method: 'POST',
    body: input,
  });
}

export async function updateLegalDocument(
  id: string,
  input: UpdateLegalDocumentInput,
): Promise<LegalDocument> {
  return api<LegalDocument>(`laws/documents/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteLegalDocument(id: string): Promise<{ success: boolean; message: string }> {
  return api<{ success: boolean; message: string }>(`laws/documents/${id}`, {
    method: 'DELETE',
  });
}

