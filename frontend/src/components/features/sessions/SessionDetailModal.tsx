"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, Link2, MonitorPlay } from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSession } from "@/lib/api/monitoring";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";

interface SessionDetailModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const STATUS_META: Record<ApiLiveSession["status"], { label: string; variant: "blue" | "green" | "slate" | "red" }> = {
  SCHEDULED: { label: "Upcoming", variant: "blue" },
  LIVE: { label: "LIVE", variant: "green" },
  COMPLETED: { label: "Past", variant: "slate" },
  CANCELLED: { label: "Cancelled", variant: "red" },
};

export function SessionDetailModal({ open, onClose, sessionId }: SessionDetailModalProps) {
  const [session, setSession] = useState<ApiLiveSession | null>(null);

  useEffect(() => {
    if (!open || !sessionId) {
      setSession(null);
      return;
    }
    let cancelled = false;
    fetchLiveSession(sessionId)
      .then((res) => {
        if (!cancelled) setSession(res);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  if (!session) return null;

  const meta = STATUS_META[session.status];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={session.titleEn}
      subtitle={`${session.course.code} · ${formatDate(session.scheduledAt)} at ${formatTime(session.scheduledAt)}`}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
            <CalendarDays className="h-3.5 w-3.5 text-indigo-500/70" />
            {formatDate(session.scheduledAt)} · {formatTime(session.scheduledAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
            <Clock className="h-3.5 w-3.5 text-indigo-500/70" />
            {session.durationMinutes} minutes
          </span>
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
          {session.externalUrl ? (
            <a
              href={session.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50/80 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100"
            >
              <Link2 className="h-3.5 w-3.5" />
              Meeting link
            </a>
          ) : null}
        </div>

        {session.titleAm ? (
          <p className="text-sm text-slate-500">አማርኛ: {session.titleAm}</p>
        ) : null}

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Learner attendance
          </h3>
          {!session.attendees || session.attendees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-indigo-200/60 bg-white/60 px-4 py-6 text-center text-xs text-slate-400">
              No attendance records for this session yet.
            </div>
          ) : (
            <Table columns={["Learner", "Method", "Status"]}>
              {session.attendees.map((attendee) => (
                <tr key={attendee.id}>
                  <Td className="font-medium text-slate-900">
                    {attendee.user
                      ? `${attendee.user.firstName} ${attendee.user.lastName}`
                      : "Unknown"}
                  </Td>
                  <Td>
                    <span className="text-xs text-slate-500">
                      {attendee.checkInMethod?.toLowerCase() ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        attendee.status === "PRESENT" || attendee.status === "LATE"
                          ? "green"
                          : "slate"
                      }
                      dot
                    >
                      {attendee.status}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <p className="flex items-center gap-2 text-xs text-slate-400">
          <MonitorPlay className="h-4 w-4" />
          Sessions are delivered live; check-ins and records are captured in real time.
        </p>
      </div>
    </Modal>
  );
}