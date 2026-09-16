"use client";

import { useEffect, useState } from "react";
import { Video, MonitorPlay, ExternalLink, CheckCircle, RefreshCw } from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import {
  fetchUpcomingSessions,
  selfCheckIn,
  fetchSessionJoinUrl,
  fetchMyAttendance,
} from "@/lib/api/monitoring";
import { ApiError } from "@/lib/api/client";
import { useLms } from "@/lib/lms-store";
import { tr } from "@/constants/labels";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { EmptyState } from "@/components/ui/EmptyState";

export default function LiveSessionsPage() {
  const { lang, currentUser } = useLms();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [joined, setJoined] = useState<string[]>([]);
  const [loadingJoinId, setLoadingJoinId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetchUpcomingSessions();
      setSessions(res.data);
    } catch {
      setSessions([]);
    }

    // Load past attendance to mark previously joined sessions
    try {
      const myAtt = await fetchMyAttendance();
      const attendedSessionIds = myAtt.map((a) => a.sessionId);
      setJoined((prev) => Array.from(new Set([...prev, ...attendedSessionIds])));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = sessions.map<SessionRow>((session) => ({
    session,
    courseTitle: session.course?.titleEn || "Course Session",
    courseCode: session.course?.code || "TRAINING",
    trainerName: "Assigned Trainer",
  }));

  const handleJoin = async (session: ApiLiveSession) => {
    setError(null);
    setSuccessMsg(null);
    setLoadingJoinId(session.id);

    try {
      // 1. Record self check-in (attendance)
      try {
        await selfCheckIn(session.id, "VIRTUAL");
        setJoined((prev) => (prev.includes(session.id) ? prev : [...prev, session.id]));
        setSuccessMsg(`Attendance recorded successfully for "${session.titleEn}". Opening room...`);
      } catch (checkinErr) {
        // If already checked in, that's completely fine
        console.info("Check-in notice:", checkinErr);
        setJoined((prev) => (prev.includes(session.id) ? prev : [...prev, session.id]));
      }

      // 2. Resolve join URL (with Jitsi name embedding or BBB signed URL)
      let targetUrl = session.externalUrl;
      try {
        const resolved = await fetchSessionJoinUrl(session.id);
        if (resolved?.joinUrl) {
          targetUrl = resolved.joinUrl;
        }
      } catch {
        // Fallback to session.externalUrl
      }

      // 3. Open session room in new window
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      } else {
        setError("This session does not have an active meeting link yet.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to join this live session.");
    } finally {
      setLoadingJoinId(null);
    }
  };

  return (
    <PageShell
      role="learner"
      title={tr(lang, "liveSessions")}
      description="Upcoming live sessions for the courses you are enrolled in."
    >
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        <LanguageToggle />
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {successMsg ? (
        <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No live sessions scheduled"
          description="Upcoming virtual classroom sessions and live lectures for your enrolled courses will appear here."
        />
      ) : (
        <SessionTable
          sessions={rows}
          extra={(row) => {
            const isCheckedIn = joined.includes(row.session.id);
            const isLoading = loadingJoinId === row.session.id;

            return (
              <div className="flex items-center justify-end gap-2">
                {isCheckedIn && (
                  <Badge variant="green" dot>
                    Present
                  </Badge>
                )}
                <Button
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleJoin(row.session)}
                  className={isCheckedIn ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200" : ""}
                >
                  <MonitorPlay className="h-3.5 w-3.5" />
                  {isLoading
                    ? "Connecting…"
                    : isCheckedIn
                    ? "Enter Room"
                    : tr(lang, "join")}
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </Button>
              </div>
            );
          }}
        />
      )}

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200/60">
        <Video className="h-4 w-4 text-indigo-600 flex-shrink-0" />
        <span>
          Clicking <strong>Join</strong> automatically logs your attendance check-in into the Ministry of Revenues
          official audit log and opens your live classroom session.
        </span>
      </div>
    </PageShell>
  );
}