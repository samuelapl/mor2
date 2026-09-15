"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck, Search } from "lucide-react";
import { getRoleFromPath, ROLE_LABELS } from "@/constants/roles";
import { useLms } from "@/lib/lms-store";
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { ApiNotification } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function getInitials(label: string) {
  return label
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ApiNotificationListItem extends ApiNotification {}

export default function Header() {
  const pathname = usePathname();
  const { currentUser } = useLms();
  const role = currentUser?.role ?? getRoleFromPath(pathname);
  const roleLabel = role ? ROLE_LABELS[role] : "Dashboard";
  const demoUser = currentUser;

  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<ApiNotificationListItem[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, count] = await Promise.all([
        fetchMyNotifications({ limit: 15 }),
        fetchUnreadCount(),
      ]);
      setNotifications(res.data);
      setUnread(count.unreadCount);
    } catch {
      setNotifications([]);
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const readOne = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      void load();
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
    } catch {
      // ignore
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
    );
    setUnread(0);
  };

  const title = (n: ApiNotificationListItem) => n.titleEn ?? n.titleAm;

  return (
    <header className="glass sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/60 px-6">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          ELTMS · Dashboard
        </p>
        <h1 className="truncate font-display text-sm font-bold text-slate-900">{roleLabel}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses, users..."
            className="h-9 w-64 rounded-xl border border-slate-200/80 bg-white/70 pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none backdrop-blur transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              if (!open) void load();
              setOpen((prev) => !prev);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 shadow-sm backdrop-blur transition-all hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md active:scale-95"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </button>

          {open ? (
            <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <button
                  type="button"
                  onClick={() => void readAll()}
                  className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-600"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void readOne(n.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50/60",
                        !n.readAt ? "bg-indigo-50/40" : "",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.readAt ? "bg-slate-200" : "bg-indigo-500",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-800">
                          {title(n)}
                        </span>
                        {(n.bodyEn ?? n.bodyAm) ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                            {n.bodyEn ?? n.bodyAm}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5 border-l border-slate-200/80 pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/30">
            {getInitials(demoUser?.name ?? roleLabel)}
          </div>
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-medium text-slate-900">{demoUser?.name ?? "Demo User"}</p>
            <p className="text-[11px] text-slate-500">{demoUser?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}