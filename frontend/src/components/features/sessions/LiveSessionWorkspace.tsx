"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  PhoneOff,
  Radio,
  RefreshCw,
  Users,
  Video,
} from "lucide-react";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchSessionJoinUrl, selfCheckIn, fetchSessionAttendance } from "@/lib/api/monitoring";
import type { ApiAttendance, ApiLiveSession } from "@/lib/api/types";
import { useLms } from "@/lib/lms-store";

interface LiveSessionWorkspaceProps {
  open: boolean;
  onClose: () => void;
  session: ApiLiveSession;
  courseTitle?: string;
  courseCode?: string;
  trainerName?: string;
  userRole?: "trainer" | "learner" | "training_admin";
}

export function LiveSessionWorkspace({
  open,
  onClose,
  session,
  courseTitle,
  courseCode,
  trainerName,
  userRole = "learner",
}: LiveSessionWorkspaceProps) {
  const { currentUser } = useLms();
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [attendees, setAttendees] = useState<ApiAttendance[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const init = async () => {
      // 1. Record self check-in for learners
      if (userRole === "learner") {
        try {
          await selfCheckIn(session.id, "VIRTUAL");
          if (!cancelled) setCheckedIn(true);
        } catch {
          // If already checked in or error, continue
        }
      }

      // 2. Fetch resolved join URL with displayName injected
      try {
        const res = await fetchSessionJoinUrl(session.id);
        if (cancelled) return;
        if (res?.joinUrl) {
          setJoinUrl(res.joinUrl);
        } else if (session.externalUrl) {
          setJoinUrl(session.externalUrl);
        } else {
          setError("No active meeting URL is configured for this session.");
        }
      } catch {
        if (session.externalUrl) {
          if (!cancelled) setJoinUrl(session.externalUrl);
        } else {
          if (!cancelled) setError("Could not resolve meeting URL for this session.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [open, session.id, session.externalUrl, userRole]);

  // Load attendees for trainers or admins
  const loadAttendees = async () => {
    setLoadingAttendees(true);
    try {
      const data = await fetchSessionAttendance(session.id);
      setAttendees(data);
    } catch {
      setAttendees([]);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleToggleAttendees = () => {
    if (!showAttendees) {
      void loadAttendees();
    }
    setShowAttendees(!showAttendees);
  };

  if (!open) return null;

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Radio className="h-4 w-4 animate-pulse" />
          </span>
          <span className="truncate">{session.titleEn || "Live Training Session"}</span>
        </div>
      }
      subtitle={`${courseCode ? `${courseCode} · ` : ""}${courseTitle || "Training"} ${
        trainerName ? `· Trainer: ${trainerName}` : ""
      }`}
      badge={
        session.status === "LIVE" ? (
          <Badge variant="green" dot>
            Live Now
          </Badge>
        ) : (
          <Badge variant="blue" dot>
            {session.status}
          </Badge>
        )
      }
      actions={
        <div className="flex items-center gap-2">
          {(userRole === "trainer" || userRole === "training_admin") && (
            <Button
              size="sm"
              variant={showAttendees ? "primary" : "outline"}
              onClick={handleToggleAttendees}
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              Attendees ({attendees.length})
            </Button>
          )}

          {joinUrl && (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100 transition"
              title="Open in new tab if browser blocks iframe video"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              External Link
            </a>
          )}

          <Button
            size="sm"
            variant="danger"
            onClick={onClose}
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            Leave Session
          </Button>
        </div>
      }
      contentClassName="p-0 flex flex-col h-full overflow-hidden bg-slate-950"
    >
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-8rem)]">
        {/* Main Video Meeting Container */}
        <div className="flex-1 flex flex-col relative bg-slate-950">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-sm font-medium">Connecting to virtual training room…</p>
              {checkedIn && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Attendance recorded automatically
                </span>
              )}
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="rounded-full bg-red-900/30 p-4 text-red-400">
                <Video className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{error}</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md">
                  The meeting host may not have started the session yet, or the meeting URL has not been generated.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={onClose}>
                Back to Sessions
              </Button>
            </div>
          ) : joinUrl ? (
            <iframe
              src={joinUrl}
              allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
              className="w-full h-full border-0 bg-black"
              title={session.titleEn || "Live Video Session"}
            />
          ) : null}
        </div>

        {/* Optional Attendees Sidebar (for Trainer/Admin) */}
        {showAttendees && (
          <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Session Attendees</h4>
              </div>
              <Button size="sm" variant="ghost" onClick={loadAttendees} disabled={loadingAttendees}>
                <RefreshCw className={`h-3 w-3 ${loadingAttendees ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {attendees.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No recorded attendees yet.</p>
              ) : (
                attendees.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {att.user?.firstName} {att.user?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400">{att.user?.email}</p>
                    </div>
                    <Badge variant={att.status === "PRESENT" ? "green" : "blue"} className="text-[10px]">
                      {att.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </WorkspaceDetailOverlay>
  );
}
