import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';

import type {
  LawCategory,
  LawDomain,
  LawInstrumentType,
  LawQueryParams,
  LegalDocument,
  PaginatedLegalDocuments,
} from '../types/laws.types';

export const lawKeys = {
  all: ['laws'] as const,
  categories: (domain?: LawDomain, instrumentType?: LawInstrumentType) =>
    ['laws', 'categories', { domain, instrumentType }] as const,
  documents: (params: LawQueryParams) =>
    ['laws', 'documents', params] as const,
  detail: (id: string) => ['laws', 'detail', id] as const,
};

export function useLawCategories(domain?: LawDomain, instrumentType?: LawInstrumentType) {
  return useQuery({
    queryKey: lawKeys.categories(domain, instrumentType),
    queryFn: () =>
      api.get<LawCategory[]>(endpoints.laws.categories, {
        params: {
          domain: domain || undefined,
          instrumentType: instrumentType || undefined,
        },
      }),
  });
}

export function useLegalDocuments(params: LawQueryParams) {
  return useQuery({
    queryKey: lawKeys.documents(params),
    queryFn: () =>
      api.get<PaginatedLegalDocuments>(endpoints.laws.documents, {
        params: {
          categoryId: params.categoryId || undefined,
          domain: params.domain || undefined,
          instrumentType: params.instrumentType || undefined,
          status: params.status || undefined,
          search: params.search?.trim() || undefined,
          page: params.page ?? 1,
          limit: params.limit ?? 50,
        },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useLegalDocument(id: string | undefined) {
  return useQuery({
    queryKey: lawKeys.detail(id ?? ''),
    queryFn: () => api.get<LegalDocument>(endpoints.laws.detail(id!)),
    enabled: Boolean(id),
  });
}

