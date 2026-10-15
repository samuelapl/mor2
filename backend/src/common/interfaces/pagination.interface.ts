export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  /** Backward-compatible top-level aliases */
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  items?: T[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  sid: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  sid: string;
  permissions?: string[];
}

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}
