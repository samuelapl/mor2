import { api } from './client';

export type LookupCategoryType = 'COURSE_CATEGORY' | 'COURSE_LEVEL' | 'QUESTION_TYPE';

export interface ApiLookupCategory {
  id: string;
  type: LookupCategoryType;
  value: string;
  labelEn: string;
  labelAm: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLookupCategoryInput {
  type: LookupCategoryType;
  value: string;
  labelEn: string;
  labelAm: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateLookupCategoryInput {
  labelEn?: string;
  labelAm?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function fetchLookupCategories(
  type?: LookupCategoryType,
  includeInactive = false,
): Promise<ApiLookupCategory[]> {
  const query: Record<string, string | undefined> = {};
  if (type) query.type = type;
  if (includeInactive) query.includeInactive = 'true';
  return api<ApiLookupCategory[]>('lookup-categories', { query });
}

export async function createLookupCategory(
  input: CreateLookupCategoryInput,
): Promise<ApiLookupCategory> {
  return api<ApiLookupCategory>('lookup-categories', { method: 'POST', body: input });
}

export async function updateLookupCategory(
  id: string,
  input: UpdateLookupCategoryInput,
): Promise<ApiLookupCategory> {
  return api<ApiLookupCategory>(`lookup-categories/${id}`, { method: 'PATCH', body: input });
}

export async function deleteLookupCategory(id: string): Promise<void> {
  return api<void>(`lookup-categories/${id}`, { method: 'DELETE' });
}
