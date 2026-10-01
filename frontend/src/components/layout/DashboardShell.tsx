'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getRoleFromPath, isBuiltInRole, getRoleHomePath } from '@/constants/roles';
import { PERMISSION_GATED_PATHS } from '@/constants/navigation';
import { useLms } from '@/lib/lms-store';
import { usePermissions } from '@/lib/usePermissions';

function getGatedPermissions(pathname: string): string[] | undefined {
  if (PERMISSION_GATED_PATHS[pathname]) {
    return PERMISSION_GATED_PATHS[pathname];
  }
  for (const [route, perms] of Object.entries(PERMISSION_GATED_PATHS)) {
    if (pathname.startsWith(`${route}/`)) {
      return perms;
    }
  }
  return undefined;
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { ready, currentUser } = useLms();
  const { canAny } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const pathRole = getRoleFromPath(pathname);
  const gatedPermissions = getGatedPermissions(pathname);
  const isGated = Boolean(gatedPermissions);
  const gatedAllowed = Boolean(gatedPermissions && canAny(gatedPermissions));
  const isCustomRole = Boolean(currentUser && !isBuiltInRole(currentUser.role));

  // Access evaluation:
  // 1. If page is permission-gated, access is granted if the user holds required permissions.
  // 2. If page has a pathRole (e.g. /system-admin, /trainer, /learner):
  //    - For custom/dynamic roles, they can access /learner pages by default, but not root built-in admin paths.
  //    - For built-in roles, they must match pathRole.
  const blocked = isGated
    ? !gatedAllowed
    : Boolean(
        pathRole &&
          (isCustomRole ? pathRole !== 'learner' : currentUser?.role !== pathRole),
      );

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (blocked) {
      router.replace(getRoleHomePath(currentUser.role, currentUser.permissions));
    }
  }, [ready, currentUser, blocked, router]);

  if (!ready || !currentUser || blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading workspace…
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
