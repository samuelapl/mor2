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
import { fetchLiveSessions, setSessionStatus, sendSessionAttendanceReport } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { LiveSessionWorkspace } from "@/components/features/sessions/LiveSessionWorkspace";
import { SessionDetailModal } from "@/components/features/sessions/SessionDetailModal";
import { DynamicAttendanceModal } from "@/components/features/sessions/DynamicAttendanceModal";

export default function TrainerSessionsPage() {
  const { courses, currentUser } = useLms();
  const { can, canAny } = usePermissions();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [activeJoinSession, setActiveJoinSession] = useState<ApiLiveSession | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedReportSessionId, setSelectedReportSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterScope, setFilterScope] = useState<"all" | "assigned">("all");

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

  // Filter sessions: show all sessions (including institutional sessions scheduled by Training Admin) or filter by assigned courses
  const mySessions = useMemo(() => {
    if (filterScope === "assigned" && assignedCourses.length > 0) {
      return sessions.filter(
        (s) =>
          assignedCourses.some((c) => c.id === s.courseId) ||
          (s as any).trainerId === currentUser?.id,
      );
    }
    // "all" shows all scheduled sessions across courses & institutional sessions
    return sessions;
  }, [sessions, assignedCourses, filterScope, currentUser?.id]);

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
      const isMyCourse = assignedCourses.some((c) => c.id === session.courseId);
      return {
        session,
        courseTitle: course?.title ?? session.course?.titleEn ?? session.titleEn ?? "Training Session",
        courseCode: course?.code ?? session.course?.code ?? "TRAINING",
        trainerName: isMyCourse
          ? (currentUser?.name ?? "Assigned Trainer")
          : (session.course?.titleEn ? "Institutional Trainer" : (currentUser?.name ?? "Assigned Trainer")),
      };
    });

  const upcomingRows = usePagination(toRows(upcoming), 6);
  const pastRows = usePagination(toRows(past), 6);

  const handleToggleLive = async (session: ApiLiveSession) => {
    setStatusUpdatingId(session.id);
    try {
      const nextStatus = session.status === "LIVE" ? "COMPLETED" : "LIVE";
      await setSessionStatus(session.id, nextStatus);
      if (nextStatus === "COMPLETED") {
        try {
          await sendSessionAttendanceReport(session.id);
        } catch {
          // Best effort report generation
        }
      }
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={loadSessions} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {assignedCourses.length > 0 && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterScope("all")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterScope === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Sessions ({sessions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterScope("assigned")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterScope === "assigned"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Courses ({sessions.filter((s) => assignedCourses.some((c) => c.id === s.courseId)).length})
              </button>
            </div>
          )}
        </div>
        {canAny(["attendance.view", "attendance.manage", "attendance.override"]) ? (
          <Link href="/trainer/attendance">
            <Button size="sm" variant="outline" className="gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              Full Attendance Sheet
            </Button>
          </Link>
        ) : null}
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

              {can("live_session.manage") && row.session.status === "SCHEDULED" ? (
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
              ) : can("live_session.manage") && row.session.status === "LIVE" ? (
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
                  variant="outline"
                  onClick={() => setSelectedReportSessionId(row.session.id)}
                  className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Attendance Report
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDetailId(row.session.id)}
                  className="gap-1 text-slate-600"
                >
                  <Info className="h-3.5 w-3.5" />
                  Details &amp; Logs
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

      {/* Dynamic Attendance Modal */}
      {selectedReportSessionId && (
        <DynamicAttendanceModal
          open={Boolean(selectedReportSessionId)}
          onClose={() => setSelectedReportSessionId(null)}
          sessionId={selectedReportSessionId}
          userRole="trainer"
        />
      )}
    </PageShell>
  );
}