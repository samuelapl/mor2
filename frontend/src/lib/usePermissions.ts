"use client";

import { useLms } from "@/lib/lms-store";
import type { Role } from "@/types";

export function usePermissions() {
  const { currentUser } = useLms();
  return {
    can: (code: string) => currentUser?.permissions?.includes(code) ?? false,
    canAny: (codes: string[]) =>
      codes.some((code) => currentUser?.permissions?.includes(code) ?? false),
    hasRole: (role: Role) => currentUser?.roles?.includes(role) ?? false,
  };
}
