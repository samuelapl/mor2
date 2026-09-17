"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Link2,
  MonitorPlay,
  Play,
  Radio,
  Users,
  Video,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSession } from "@/lib/api/monitoring";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { LiveSessionWorkspace } from "./LiveSessionWorkspace";

interface SessionDetailModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  userRole?: "trainer" | "learner" | "training_admin";
  onJoin?: () => void;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const STATUS_META: Record<
  ApiLiveSession["status"],
  { label: string; variant: "blue" | "green" | "slate" | "red" }
> = {
  SCHEDULED: { label: "Upcoming", variant: "blue" },
  LIVE: { label: "LIVE NOW", variant: "green" },
  COMPLETED: { label: "Completed", variant: "slate" },
  CANCELLED: { label: "Cancelled", variant: "red" },
};

export function SessionDetailModal({
  open,
  onClose,
  sessionId,
  userRole = "trainer",
  onJoin,
}: SessionDetailModalProps) {
  const [session, setSession] = useState<ApiLiveSession | null>(null);
  const [liveWorkspaceOpen, setLiveWorkspaceOpen] = useState(false);

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

  if (!open || !session) return null;

  const meta = STATUS_META[session.status];
  const attendees = session.attendees || [];
  const presentCount = attendees.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;

  return (
    <>
      <WorkspaceDetailOverlay
        open={open && !liveWorkspaceOpen}
        onClose={onClose}
        title={session.titleEn || "Live Training Session"}
        subtitle={`${session.course.code} · ${session.course.titleEn || session.course.code}`}
        badge={
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {userRole === "trainer" && (
              <Link href={`/trainer/attendance`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  Manage Attendance
                </Button>
              </Link>
            )}

            <Button
              size="sm"
              onClick={() => {
                if (onJoin) {
                  onJoin();
                  onClose();
                } else {
                  setLiveWorkspaceOpen(true);
                }
              }}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <MonitorPlay className="h-4 w-4" />
              Join Session (In-LMS)
            </Button>
          </div>
        }
      >
        <div className="w-full space-y-6 pb-8">
          {/* Top Session Metadata Hero */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                {formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <Clock className="h-4 w-4 text-indigo-500" />
                {session.durationMinutes} Minutes Duration
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <Video className="h-4 w-4 text-indigo-600" />
                Platform: {session.platform || "JITSI"}
              </span>
              {session.meetingId && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
                  Meeting ID: {session.meetingId}
                </span>
              )}
            </div>

            {session.titleAm ? (
              <p className="text-xs text-slate-500 font-medium">የስልጠና ርዕስ (አማርኛ): {session.titleAm}</p>
            ) : null}

            {session.descriptionEn ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1">
                  Session Description / Agenda:
                </p>
                {session.descriptionEn}
              </div>
            ) : null}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Registered Attendees</span>
                <Users className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{attendees.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Enrolled participants</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Verified Present</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{presentCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {attendees.length > 0
                  ? `${Math.round((presentCount / attendees.length) * 100)}% attendance rate`
                  : "No check-ins yet"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Live Status</span>
                <Radio className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900">{meta.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {session.status === "LIVE"
                  ? "Interactive room is currently active"
                  : "Scheduled for upcoming delivery"}
              </p>
            </div>
          </div>

          {/* Enrolled Learners & Attendance Table */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Enrolled Learners & Attendance Log</h3>
                <p className="text-xs text-slate-500">
                  Real-time participation tracking and attendance verification.
                </p>
              </div>
              {userRole === "trainer" && (
                <Link href={`/trainer/attendance`}>
                  <Button size="sm" variant="outline" className="text-xs">
                    Open Full Attendance Sheet →
                  </Button>
                </Link>
              )}
            </div>

            {attendees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-xs text-slate-400">
                No attendance or check-in records logged for this session yet.
              </div>
            ) : (
              <Table columns={["Learner Name", "Email / Account", "Check-in Method", "Status"]}>
                {attendees.map((attendee) => (
                  <tr key={attendee.id}>
                    <Td className="font-semibold text-slate-900">
                      {attendee.user
                        ? `${attendee.user.firstName} ${attendee.user.lastName}`
                        : "Unknown Participant"}
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {attendee.user?.email || "—"}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {attendee.checkInMethod || "VIRTUAL"}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        variant={
                          attendee.status === "PRESENT" || attendee.status === "LATE"
                            ? "green"
                            : attendee.status === "EXCUSED"
                            ? "blue"
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
        </div>
      </WorkspaceDetailOverlay>

      {/* Embedded Live Workspace */}
      {liveWorkspaceOpen && (
        <LiveSessionWorkspace
          open={liveWorkspaceOpen}
          onClose={() => setLiveWorkspaceOpen(false)}
          session={session}
          courseTitle={session.course.titleEn}
          courseCode={session.course.code}
          userRole={userRole}
        />
      )}
    </>
  );
}