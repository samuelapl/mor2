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
  UserCheck,
  ClipboardCheck,
  BookOpen,
  User,
  Key,
} from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSession } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RichContent } from "@/components/ui/RichContent";
import { LiveSessionWorkspace } from "./LiveSessionWorkspace";

interface SessionDetailModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  userRole?: string;
  onOpenAttendance?: () => void;
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
  onOpenAttendance,
  onJoin,
}: SessionDetailModalProps) {
  const { courses, users, userName } = useLms();
  const { can, canAny } = usePermissions();
  const [session, setSession] = useState<ApiLiveSession | null>(null);
  const [liveWorkspaceOpen, setLiveWorkspaceOpen] = useState(false);

  const canViewAttendance = can("attendance.view") || can("attendance.manage");

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
  const course = courses.find((c) => c.id === session.courseId) || session.course;
  const courseTitle = (course as any)?.title || (course as any)?.titleEn || "Training Program";
  const trainerObj = session.trainerId
    ? users.find((u) => u.id === session.trainerId) || session.trainer
    : session.trainer;
  const trainerDisplayName = trainerObj
    ? `${trainerObj.firstName || ""} ${trainerObj.lastName || ""}`.trim() || trainerObj.email
    : session.trainerId
    ? userName(session.trainerId)
    : "Institutional Trainer";

  return (
    <>
      <WorkspaceDetailOverlay
        open={open && !liveWorkspaceOpen}
        onClose={onClose}
        title={session.titleEn || "Session Details"}
        subtitle={`${course?.code || "COURSE"} · ${courseTitle}`}
        badge={
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {canViewAttendance && onOpenAttendance && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenAttendance();
                }}
                className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <ClipboardCheck className="h-3.5 w-3.5 text-indigo-600" />
                View Attendance
              </Button>
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
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs text-xs"
            >
              <MonitorPlay className="h-4 w-4" />
              Join Session Room
            </Button>
          </div>
        }
      >
        <div className="w-full space-y-6 pb-8">
          {/* Key Schedule & Delivery Information */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Schedule &amp; Delivery Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400">Scheduled Time</p>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">
                    {formatDate(session.scheduledAt)}
                  </p>
                  <p className="text-[11px] text-slate-500">{formatTime(session.scheduledAt)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400">Session Duration</p>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">
                    {session.durationMinutes} Minutes
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Threshold: {session.attendanceThreshold ?? 60}% required
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400">Conferencing Platform</p>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">
                    {session.platform || "IN-LMS (Jitsi / BigBlueButton)"}
                  </p>
                  <p className="text-[11px] text-slate-500">Interactive live classroom</p>
                </div>
              </div>
            </div>
          </div>

          {/* Course & Assigned Instructor */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Course
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{courseTitle}</p>
              <p className="text-xs text-slate-500">
                Course Code: <span className="font-semibold text-slate-700">{course?.code}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <User className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Designated Trainer / Instructor
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{trainerDisplayName}</p>
              <p className="text-xs text-slate-500">
                {trainerObj?.email || "Platform Assigned Instructor"}
              </p>
            </div>
          </div>

          {/* Meeting Room Access Credentials */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Meeting Room Access
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {session.meetingId && (
                <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">Meeting ID</span>
                  <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5">
                    {session.meetingId}
                  </p>
                </div>
              )}
              {session.meetingPassword && (
                <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">Meeting Password</span>
                  <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5">
                    {session.meetingPassword}
                  </p>
                </div>
              )}
            </div>

            {session.externalUrl ? (
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 font-medium">External Join Link</span>
                <div className="mt-1 flex items-center gap-2">
                  <a
                    href={session.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 underline break-all font-mono"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {session.externalUrl}
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          {/* Session Description / Objectives */}
          {session.descriptionEn && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Session Description &amp; Objectives
              </h3>
              <div className="text-xs leading-relaxed text-slate-600">
                <RichContent html={session.descriptionEn} />
              </div>
            </div>
          )}

          {/* Amharic Title & Description if present */}
          {session.titleAm && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                የርዕስ መረጃ (Amharic)
              </h3>
              <p className="text-xs font-semibold text-slate-900">{session.titleAm}</p>
              {session.descriptionAm && (
                <div className="text-xs text-slate-600">
                  <RichContent html={session.descriptionAm} />
                </div>
              )}
            </div>
          )}
        </div>
      </WorkspaceDetailOverlay>

      {/* Embedded Live Workspace */}
      {liveWorkspaceOpen && (
        <LiveSessionWorkspace
          open={liveWorkspaceOpen}
          onClose={() => setLiveWorkspaceOpen(false)}
          session={session}
          courseTitle={courseTitle}
          courseCode={course?.code}
          trainerName={trainerDisplayName}
          userRole={userRole}
        />
      )}
    </>
  );
}