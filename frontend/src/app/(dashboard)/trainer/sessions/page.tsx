"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, LinkIcon, MonitorPlay, Play, Square, ExternalLink } from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSessions, fetchSessionJoinUrl, setSessionStatus } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { ScheduleSessionModal } from "@/components/features/sessions/ScheduleSessionModal";

export default function TrainerSessionsPage() {
  const { courses, currentUser } = useLms();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const assignedCourses = courses.filter((c) => c.trainerId === currentUser?.id);

  const loadSessions = () => {
    fetchLiveSessions({ limit: 100 })
      .then((res) => setSessions(res.data))
      .catch(() => setSessions([]));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const mySessions = useMemo(
    () => sessions.filter((s) => assignedCourses.some((c) => c.id === s.courseId)),
    [sessions, assignedCourses],
  );
  const upcoming = mySessions.filter(
    (s) => s.status === "SCHEDULED" || s.status === "LIVE",
  );
  const past = mySessions.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED");

  const toRows = (items: ApiLiveSession[]): SessionRow[] =>
    items
      .filter((session) => assignedCourses.some((c) => c.id === session.courseId))
      .map((session) => {
        const course = assignedCourses.find((c) => c.id === session.courseId)!;
        return {
          session,
          courseTitle: course.title,
          courseCode: course.code,
          trainerName: currentUser?.name ?? "—",
        };
      });

  const upcomingRows = usePagination(toRows(upcoming), 5);
  const pastRows = usePagination(toRows(past), 5);

  const handleJoin = async (session: ApiLiveSession) => {
    let url = session.externalUrl;
    try {
      const resolved = await fetchSessionJoinUrl(session.id);
      if (resolved?.joinUrl) {
        url = resolved.joinUrl;
      }
    } catch {
      // fallback
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleToggleLive = async (session: ApiLiveSession) => {
    setStatusUpdatingId(session.id);
    try {
      const nextStatus = session.status === "LIVE" ? "COMPLETED" : "LIVE";
      await setSessionStatus(session.id, nextStatus);
      loadSessions();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <PageShell
      role="trainer"
      title="My Sessions"
      description="Your scheduled live training sessions. Upcoming sessions are highlighted."
    >
      <PageSection
        title="Upcoming sessions"
        description="Sessions still to be delivered."
        action={
          <Button onClick={() => setScheduleOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Schedule session
          </Button>
        }
      >
        <SessionTable
          sessions={upcomingRows.pageItems}
          extra={(row) => (
            <div className="flex items-center justify-end gap-2">
              {row.session.status === "SCHEDULED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusUpdatingId === row.session.id}
                  onClick={() => handleToggleLive(row.session)}
                  className="border-emerald-300 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 shadow-none"
                >
                  <Play className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                  Go Live
                </Button>
              ) : row.session.status === "LIVE" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusUpdatingId === row.session.id}
                  onClick={() => handleToggleLive(row.session)}
                  className="border-red-300 bg-red-50/80 text-red-700 hover:bg-red-100 shadow-none"
                >
                  <Square className="h-3 w-3 fill-red-600 text-red-600" />
                  End Session
                </Button>
              ) : null}

              {row.session.externalUrl ? (
                <Button size="sm" onClick={() => handleJoin(row.session)}>
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Join Room
                  <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                </Button>
              ) : (
                <span
                  title="No meeting link was added when this session was scheduled"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-400"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  No link
                </span>
              )}
            </div>
          )}
        />
        <Pagination
          page={upcomingRows.page}
          totalPages={upcomingRows.totalPages}
          onPageChange={upcomingRows.setPage}
        />
      </PageSection>

      {past.length > 0 ? (
        <PageSection title="Past sessions" description="Completed sessions with attendance records.">
          <SessionTable sessions={pastRows.pageItems} />
          <Pagination
            page={pastRows.page}
            totalPages={pastRows.totalPages}
            onPageChange={pastRows.setPage}
          />
        </PageSection>
      ) : null}

      <ScheduleSessionModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onScheduled={loadSessions}
        courses={assignedCourses}
      />
    </PageShell>
  );
}