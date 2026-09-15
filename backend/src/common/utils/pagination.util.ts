import { PAGINATION_DEFAULTS } from '@config/constants';
import { PaginatedResponse, PaginationQuery } from '@common/interfaces';

export function buildPaginationArgs(query: PaginationQuery) {
  const page = Math.max(query.page || PAGINATION_DEFAULTS.page, 1);
  const rawLimit = query.limit || PAGINATION_DEFAULTS.limit;
  const limit = Math.min(Math.max(rawLimit, 1), PAGINATION_DEFAULTS.maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export function buildOrderBy(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'asc',
): Record<string, 'asc' | 'desc'> {
  if (!sortBy) {
    return { createdAt: 'desc' };
  }

  // Prevent injection by only allowing known sort fields
  const allowedFields = new Set([
    'createdAt',
    'updatedAt',
    'titleEn',
    'titleAm',
    'email',
    'lastName',
    'firstName',
    'status',
    'order',
    'scheduledAt',
    'score',
  ]);

  if (!allowedFields.has(sortBy)) {
    return { createdAt: 'desc' };
  }

  return { [sortBy]: sortOrder };
}

export function buildSearchFilter<T extends Record<string, unknown>>(
  searchTerm: string | undefined,
  fields: string[],
): T | undefined {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return undefined;
  }

  const trimmed = searchTerm.trim();

  return {
    OR: fields.map((field) => ({
      [field]: { contains: trimmed, mode: 'insensitive' },
    })),
  } as unknown as T;
}
