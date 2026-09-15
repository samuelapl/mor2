"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getRoleFromPath, ROLE_PATHS } from "@/constants/roles";
import { useLms } from "@/lib/lms-store";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { ready, currentUser } = useLms();
  const pathname = usePathname();
  const router = useRouter();
  const pathRole = getRoleFromPath(pathname);

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (pathRole && currentUser.role !== pathRole) {
      router.replace(ROLE_PATHS[currentUser.role]);
    }
  }, [ready, currentUser, pathRole, router]);

  if (!ready || !currentUser || (pathRole && currentUser.role !== pathRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading workspace…
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
