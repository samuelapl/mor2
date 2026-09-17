"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  FileCheck,
  Info,
  LinkIcon,
  MonitorPlay,
  Play,
  RefreshCw,
  Square,
  Users,
} from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSessions, setSessionStatus } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { LiveSessionWorkspace } from "@/components/features/sessions/LiveSessionWorkspace";
import { SessionDetailModal } from "@/components/features/sessions/SessionDetailModal";

export default function TrainerSessionsPage() {
  const { courses, currentUser } = useLms();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [activeJoinSession, setActiveJoinSession] = useState<ApiLiveSession | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const assignedCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.trainerId === currentUser?.id ||
          ((c as any).trainerIds && (c as any).trainerIds.includes(currentUser?.id)),
      ),
    [courses, currentUser],
  );

  const loadSessions = () => {
    setLoading(true);
    fetchLiveSessions({ limit: 100 })
      .then((res) => setSessions(res.data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Filter sessions: if assigned to specific courses, filter by those; otherwise if trainer has sessions scheduled, show them
  const mySessions = useMemo(() => {
    if (assignedCourses.length > 0) {
      return sessions.filter((s) => assignedCourses.some((c) => c.id === s.courseId));
    }
    // Fallback: all sessions if assigned courses not yet linked in seed data
    return sessions;
  }, [sessions, assignedCourses]);

  const upcoming = useMemo(
    () => mySessions.filter((s) => s.status === "SCHEDULED" || s.status === "LIVE"),
    [mySessions],
  );
  const past = useMemo(
    () => mySessions.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED"),
    [mySessions],
  );

  const toRows = (items: ApiLiveSession[]): SessionRow[] =>
    items.map((session) => {
      const course = courses.find((c) => c.id === session.courseId);
      return {
        session,
        courseTitle: course?.title ?? session.course?.titleEn ?? session.titleEn ?? "Training Session",
        courseCode: course?.code ?? session.course?.code ?? "TRAINING",
        trainerName: currentUser?.name ?? "Assigned Trainer",
      };
    });

  const upcomingRows = usePagination(toRows(upcoming), 6);
  const pastRows = usePagination(toRows(past), 6);

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
      description="Your scheduled live training sessions. Join directly in the LMS and manage attendance."
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadSessions} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Sessions
          </Button>
        </div>
        <Link href="/trainer/attendance">
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileCheck className="h-3.5 w-3.5" />
            Full Attendance Sheet
          </Button>
        </Link>
      </div>

      <PageSection
        title="Upcoming & Active Sessions"
        description="Sessions scheduled to be delivered. Start the session to go live."
      >
        <SessionTable
          sessions={upcomingRows.pageItems}
          extra={(row) => (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedDetailId(row.session.id)}
                title="View Session Details & Attendees"
                className="gap-1 text-slate-600 hover:text-slate-900"
              >
                <Info className="h-3.5 w-3.5" />
                Details
              </Button>

              {row.session.status === "SCHEDULED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusUpdatingId === row.session.id}
                  onClick={() => handleToggleLive(row.session)}
                  className="border-emerald-300 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 shadow-none gap-1"
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
                  className="border-red-300 bg-red-50/80 text-red-700 hover:bg-red-100 shadow-none gap-1"
                >
                  <Square className="h-3 w-3 fill-red-600 text-red-600" />
                  End Session
                </Button>
              ) : null}

              <Button
                size="sm"
                onClick={() => setActiveJoinSession(row.session)}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <MonitorPlay className="h-3.5 w-3.5" />
                Join Room
              </Button>
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
        <PageSection
          title="Past Sessions"
          description="Completed training sessions with verifiable attendance history."
        >
          <SessionTable
            sessions={pastRows.pageItems}
            extra={(row) => (
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDetailId(row.session.id)}
                  className="gap-1 text-slate-600"
                >
                  <Info className="h-3.5 w-3.5" />
                  Details & Logs
                </Button>
              </div>
            )}
          />
          <Pagination
            page={pastRows.page}
            totalPages={pastRows.totalPages}
            onPageChange={pastRows.setPage}
          />
        </PageSection>
      ) : null}

      {/* Embedded Live Workspace */}
      {activeJoinSession && (
        <LiveSessionWorkspace
          open={Boolean(activeJoinSession)}
          onClose={() => setActiveJoinSession(null)}
          session={activeJoinSession}
          courseTitle={activeJoinSession.course?.titleEn || "Training Course"}
          courseCode={activeJoinSession.course?.code || "TRAINING"}
          trainerName={currentUser?.name}
          userRole="trainer"
        />
      )}

      {/* Full-Screen Session Detail Workspace */}
      {selectedDetailId && (
        <SessionDetailModal
          open={Boolean(selectedDetailId)}
          onClose={() => setSelectedDetailId(null)}
          sessionId={selectedDetailId}
          userRole="trainer"
          onJoin={() => {
            const found = sessions.find((s) => s.id === selectedDetailId);
            if (found) setActiveJoinSession(found);
            setSelectedDetailId(null);
          }}
        />
      )}
    </PageShell>
  );
}