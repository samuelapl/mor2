'use client';

import { useLms } from '@/lib/lms-store';
import type { Role } from '@/types';

export function usePermissions() {
  const { currentUser } = useLms();
  const isSystemAdmin =
    currentUser?.role === 'system_admin' || (currentUser?.roles?.includes('system_admin') ?? false);

  return {
    isSystemAdmin,
    can: (code: string) => isSystemAdmin || (currentUser?.permissions?.includes(code) ?? false),
    canAny: (codes: string[]) =>
      isSystemAdmin || codes.some((code) => currentUser?.permissions?.includes(code) ?? false),
    hasRole: (role: Role) =>
      currentUser?.role === role || (currentUser?.roles?.includes(role) ?? false),
  };
}
