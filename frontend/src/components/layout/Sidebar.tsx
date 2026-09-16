"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { getRoleFromPath, ROLE_LABELS } from "@/constants/roles";
import { NAV_ITEMS, ROLE_ICONS } from "@/constants/navigation";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, logout } = useLms();
  const { canAny } = usePermissions();
  const role = currentUser?.role ?? getRoleFromPath(pathname) ?? "learner";
  const RoleIcon = ROLE_ICONS[role];
  const navItems = NAV_ITEMS[role].filter(
    (item) => !item.permission || canAny([item.permission].flat()),
  );
  const displayUser = currentUser;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="relative flex w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-600">
      <div className="relative flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <Image
          src="/logo.jpg"
          alt="Ministry of Revenues"
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-contain"
        />
        <div className="leading-tight">
          <p className="font-display text-sm font-bold tracking-tight text-slate-900">
            ELTMS
          </p>
          <p className="text-[11px] text-slate-500">MoR Training System</p>
        </div>
      </div>

      <div className="relative border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white ring-1 ring-white/20">
            <RoleIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-slate-900">{ROLE_LABELS[role]}</p>
            <p className="truncate text-[11px] text-slate-500">{displayUser?.name}</p>
          </div>
        </div>
      </div>

      <p className="relative px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Navigation
      </p>
      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-indigo-500/90 to-violet-500/80 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active
                    ? "text-white"
                    : "text-slate-400 group-hover:text-indigo-500",
                )}
              />
              {item.label}
              {active ? (
                <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgb(255_255_255/0.8)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-slate-200 p-3">
        <Link
          href="/login"
          onClick={() => logout()}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Switch role / Sign out
        </Link>
      </div>
    </aside>
  );
}
