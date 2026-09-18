"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ExternalLink, MonitorPlay, RefreshCw, Video } from "lucide-react";
import { fetchUpcomingSessions, selfCheckIn } from "@/lib/api/monitoring";
import type { ApiLiveSession } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { useLms } from "@/lib/lms-store";
import { tr } from "@/constants/labels";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { LiveSessionWorkspace } from "@/components/features/sessions/LiveSessionWorkspace";
import { DynamicAttendanceModal } from "@/components/features/sessions/DynamicAttendanceModal";
import { Users } from "lucide-react";

export default function LearnerLiveSessionsPage() {
  const { lang, courses } = useLms();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [loadingJoinId, setLoadingJoinId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [joined, setJoined] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<ApiLiveSession | null>(null);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState<string | null>(null);

  const load = () => {
    fetchUpcomingSessions()
      .then((res) => setSessions(res.data))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load live sessions."),
      );
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

  const { page, totalPages, setPage, pageItems } = usePagination(rows, 6);

  const handleJoin = (session: ApiLiveSession) => {
    setError(null);
    setSuccessMsg(null);
    setActiveSession(session);
    setJoined((prev) => (prev.includes(session.id) ? prev : [...prev, session.id]));
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
        <>
          <SessionTable
            sessions={pageItems}
            extra={(row) => {
              const isCheckedIn = joined.includes(row.session.id);
              const isLoading = loadingJoinId === row.session.id;

              return (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedAttendanceSessionId(row.session.id)}
                    className="gap-1 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
                    title="View session attendees and verification status (governed by admin permission)"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Attendees
                  </Button>

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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {activeSession ? (
        <LiveSessionWorkspace
          open={Boolean(activeSession)}
          onClose={() => setActiveSession(null)}
          session={activeSession}
          courseTitle={activeSession.course?.titleEn || "Course Training"}
          courseCode={activeSession.course?.code || "TRAINING"}
          trainerName={
            activeSession.trainer
              ? `${activeSession.trainer.firstName} ${activeSession.trainer.lastName}`
              : undefined
          }
          userRole="learner"
        />
      ) : null}

      {selectedAttendanceSessionId ? (
        <DynamicAttendanceModal
          open={Boolean(selectedAttendanceSessionId)}
          onClose={() => setSelectedAttendanceSessionId(null)}
          sessionId={selectedAttendanceSessionId}
          userRole="learner"
        />
      ) : null}

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200/60">
        <Video className="h-4 w-4 text-indigo-600 flex-shrink-0" />
        <span>
          Clicking <strong>Join</strong> automatically logs your attendance check-in into the Ministry of Revenues
          official audit log and opens your live classroom session directly inside the LMS.
        </span>
      </div>
    </PageShell>
  );
}