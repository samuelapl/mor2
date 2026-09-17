"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getRoleFromPath, ROLE_PATHS } from "@/constants/roles";
import { PERMISSION_GATED_PATHS } from "@/constants/navigation";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { ready, currentUser } = useLms();
  const { canAny } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const pathRole = getRoleFromPath(pathname);
  const gatedPermissions = PERMISSION_GATED_PATHS[pathname];
  const isGated = Boolean(gatedPermissions);
  const gatedAllowed = isGated && canAny(gatedPermissions);
  // Purely permission-based pages (Users & Roles) ignore the normal role/path match —
  // any role holding the permission may open them, so the usual redirect is skipped here.
  const blocked = isGated ? !gatedAllowed : Boolean(pathRole && currentUser?.role !== pathRole);

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (blocked) {
      router.replace(ROLE_PATHS[currentUser.role]);
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
