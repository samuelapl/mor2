"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";
import { getRoleFromPath, ROLE_LABELS } from "@/constants/roles";
import { NAV_ITEMS, ROLE_ICONS } from "@/constants/navigation";
import { useLms } from "@/lib/lms-store";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, logout } = useLms();
  const role = currentUser?.role ?? getRoleFromPath(pathname) ?? "learner";
  const RoleIcon = ROLE_ICONS[role];
  const navItems = NAV_ITEMS[role];
  const displayUser = currentUser;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="relative flex w-64 shrink-0 flex-col overflow-hidden bg-sidebar-gradient text-slate-300">
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-60" />
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold tracking-tight text-white">
            ELTMS
          </p>
          <p className="text-[11px] text-slate-400">MoR Training System</p>
        </div>
      </div>

      <div className="relative border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600/60 to-slate-700/40 text-white ring-1 ring-white/20">
            <RoleIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{ROLE_LABELS[role]}</p>
            <p className="truncate text-[11px] text-slate-400">{displayUser?.name}</p>
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
                  ? "bg-gradient-to-r from-indigo-500/90 to-violet-500/80 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active
                    ? "text-white"
                    : "text-slate-400 group-hover:text-indigo-300",
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

      <div className="relative border-t border-white/10 p-3">
        <Link
          href="/login"
          onClick={() => logout()}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Switch role / Sign out
        </Link>
      </div>
    </aside>
  );
}
