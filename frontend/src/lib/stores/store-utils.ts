import { ApiError } from '@/lib/api/client';
import type { User } from '@/types';

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function hasPermission(user: User | null, code: string): boolean {
  return user?.permissions?.includes(code) ?? false;
}
