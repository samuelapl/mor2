"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Filter,
  Info,
  LinkIcon,
  MonitorPlay,
  Play,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { deleteLiveSession, fetchLiveSessions, setSessionStatus, sendSessionAttendanceReport } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { EditSessionModal } from "@/components/features/sessions/EditSessionModal";
import { LiveSessionWorkspace } from "@/components/features/sessions/LiveSessionWorkspace";
import { SessionDetailModal } from "@/components/features/sessions/SessionDetailModal";
import { SessionAttendanceModal } from "@/components/features/sessions/SessionAttendanceModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/lib/toast";

export default function TrainerSessionsPage() {
  const { courses, currentUser } = useLms();
  const { can, canAny } = usePermissions();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [editingSession, setEditingSession] = useState<ApiLiveSession | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [activeJoinSession, setActiveJoinSession] = useState<ApiLiveSession | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  const canManageAll = can("live_session.manage_all");

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

  // Filter sessions: if user only has view_own (not manage_all), strictly show only their assigned course sessions
  const mySessions = useMemo(() => {
    return sessions.filter((s) => {
      // Base ownership check if actor does not have manage_all
      if (!canManageAll) {
        const isAssigned =
          assignedCourses.some((c) => c.id === s.courseId) ||
          (s as any).trainerId === currentUser?.id ||
          s.trainer?.id === currentUser?.id;
        if (!isAssigned) return false;
      }

      // Course filter
      if (selectedCourseFilter !== "ALL" && s.courseId !== selectedCourseFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== "ALL" && s.status !== selectedStatusFilter) {
        return false;
      }

      // Search query (matches session title, course code, course title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const course = courses.find((c) => c.id === s.courseId);
        const titleMatch = (s.titleEn || "").toLowerCase().includes(q);
        const codeMatch = (course?.code || s.course?.code || "").toLowerCase().includes(q);
        const courseTitleMatch = (course?.title || s.course?.titleEn || "").toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !courseTitleMatch) return false;
      }

      return true;
    });
  }, [sessions, assignedCourses, currentUser?.id, canManageAll, selectedCourseFilter, selectedStatusFilter, searchQuery, courses]);

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

  const [sessionToDelete, setSessionToDelete] = useState<ApiLiveSession | null>(null);

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeletingId(sessionToDelete.id);
    try {
      await deleteLiveSession(sessionToDelete.id);
      toast.success(`Session "${sessionToDelete.titleEn}" deleted successfully.`);
      setSessionToDelete(null);
      loadSessions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete session.");
    } finally {
      setDeletingId(null);
    }
  };

  const canConductSession = canAny(["live_session.manage_all", "live_session.manage_own"]);
  const canViewAttendance = canAny(["attendance.view", "attendance.manage"]);

  const hasActiveFilters = searchQuery !== "" || selectedCourseFilter !== "ALL" || selectedStatusFilter !== "ALL";

  return (
    <PageShell
      role={currentUser?.role ?? "trainer"}
      title="My Sessions"
      description="View and conduct scheduled live training sessions for your assigned courses, and inspect participant attendance."
    >
      {/* FILTER BAR */}
      <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search session title, course code…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Course Filter Dropdown */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              aria-label="Filter by course"
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Courses ({assignedCourses.length > 0 ? assignedCourses.length : courses.length})</option>
              {(assignedCourses.length > 0 ? assignedCourses : courses).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
            </select>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {(["ALL", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${selectedStatusFilter === st
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {st === "ALL"
                    ? "All Status"
                    : st === "SCHEDULED"
                      ? "Upcoming"
                      : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCourseFilter("ALL");
                  setSelectedStatusFilter("ALL");
                }}
                className="h-8 gap-1 text-xs text-slate-500 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={loadSessions} disabled={loading} className="h-8 gap-1 text-xs text-slate-600">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* SECTIONS RENDERING ACCORDING TO STATUS FILTER */}
      {selectedStatusFilter === "ALL" && upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          title="No sessions found"
          description={
            hasActiveFilters
              ? "No scheduled or past sessions match your current filters. Try resetting the search or course selector."
              : "You do not have any assigned course sessions scheduled yet."
          }
        />
      ) : null}

      {/* Upcoming & Active Sessions */}
      {(selectedStatusFilter === "ALL" ? upcoming.length > 0 : selectedStatusFilter === "SCHEDULED" || selectedStatusFilter === "LIVE") ? (
        <PageSection
          title="Upcoming & Active Sessions"
          description="Sessions scheduled to be delivered. Start the session to go live or review attendance."
        >
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming sessions found"
              description="No scheduled or live sessions match your filter criteria."
            />
          ) : (
            <>
              <SessionTable
                sessions={upcomingRows.pageItems}
                extra={(row) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Secondary Management: Details, Edit, Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedDetailId(row.session.id)}
                      title="View Session Details"
                      className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0"
                    >
                      <Info className="h-4 w-4" />
                      <span className="sr-only">Details</span>
                    </Button>

                    {canManageAll && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSession(row.session)}
                          title="Edit details or reschedule date/time"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="sr-only">Edit / Reschedule</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingId === row.session.id}
                          onClick={() => setSessionToDelete(row.session)}
                          title="Delete session"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </>
                    )}

                    {/* Dedicated Attendance Button */}
                    {canViewAttendance && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAttendanceSessionId(row.session.id)}
                        title="View and inspect session attendance"
                        className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 text-indigo-600" />
                        Attendance
                      </Button>
                    )}

                    {/* Go Live / End Session Lifecycle */}
                    {canConductSession && row.session.status === "SCHEDULED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusUpdatingId === row.session.id}
                        onClick={() => handleToggleLive(row.session)}
                        className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-none gap-1 text-xs h-8 px-2.5 rounded-lg shrink-0 font-medium"
                      >
                        <Play className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                        Go Live
                      </Button>
                    ) : canConductSession && row.session.status === "LIVE" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusUpdatingId === row.session.id}
                        onClick={() => handleToggleLive(row.session)}
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-none gap-1 text-xs h-8 px-2.5 rounded-lg shrink-0 font-medium"
                      >
                        <Square className="h-3 w-3 fill-rose-600 text-rose-600" />
                        End Session
                      </Button>
                    ) : null}

                    {/* Primary Call to Action: Join Room */}
                    <Button
                      size="sm"
                      onClick={() => setActiveJoinSession(row.session)}
                      className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs text-xs h-8 px-3 rounded-lg shrink-0 font-medium"
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
            </>
          )}
        </PageSection>
      ) : null}

      {/* Past Sessions */}
      {(selectedStatusFilter === "ALL" ? past.length > 0 : selectedStatusFilter === "COMPLETED" || selectedStatusFilter === "CANCELLED") ? (
        <PageSection
          title="Past Sessions"
          description="Completed training sessions with verifiable attendance records."
        >
          {past.length === 0 ? (
            <EmptyState
              title="No past sessions found"
              description="No completed or cancelled sessions match your filter criteria."
            />
          ) : (
            <>
              <SessionTable
                sessions={pastRows.pageItems}
                extra={(row) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Secondary Management: Details, Edit, Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedDetailId(row.session.id)}
                      title="View Session Details"
                      className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg shrink-0"
                    >
                      <Info className="h-4 w-4" />
                      <span className="sr-only">Details</span>
                    </Button>

                    {canManageAll && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSession(row.session)}
                          title="Edit details or reschedule date/time"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="sr-only">Edit / Reschedule</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingId === row.session.id}
                          onClick={() => setSessionToDelete(row.session)}
                          title="Delete session"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </>
                    )}

                    {canViewAttendance && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAttendanceSessionId(row.session.id)}
                        className="gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Attendance Records
                      </Button>
                    )}
                  </div>
                )}
              />
              <Pagination
                page={pastRows.page}
                totalPages={pastRows.totalPages}
                onPageChange={pastRows.setPage}
              />
            </>
          )}
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

      {/* Pure Session Details Modal */}
      {selectedDetailId && (
        <SessionDetailModal
          open={Boolean(selectedDetailId)}
          onClose={() => setSelectedDetailId(null)}
          sessionId={selectedDetailId}
          userRole={currentUser?.role ?? "trainer"}
          onOpenAttendance={() => {
            setSelectedAttendanceSessionId(selectedDetailId);
            setSelectedDetailId(null);
          }}
          onJoin={() => {
            const found = sessions.find((s) => s.id === selectedDetailId);
            if (found) setActiveJoinSession(found);
            setSelectedDetailId(null);
          }}
        />
      )}

      {/* Dedicated Session Attendance Modal */}
      {selectedAttendanceSessionId && (
        <SessionAttendanceModal
          open={Boolean(selectedAttendanceSessionId)}
          onClose={() => setSelectedAttendanceSessionId(null)}
          sessionId={selectedAttendanceSessionId}
        />
      )}

      {/* Edit / Reschedule Modal (when canManageAll) */}
      <EditSessionModal
        open={Boolean(editingSession)}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onUpdated={() => {
          setEditingSession(null);
          loadSessions();
        }}
        courses={courses}
      />

      {/* Confirm Session Deletion Modal */}
      <ConfirmModal
        open={Boolean(sessionToDelete)}
        title="Delete Live Training Session"
        description={`Are you sure you want to delete session "${sessionToDelete?.titleEn}"? This action cannot be undone.`}
        confirmText="Delete Session"
        variant="danger"
        isLoading={Boolean(deletingId)}
        onConfirm={confirmDeleteSession}
        onClose={() => !deletingId && setSessionToDelete(null)}
      />
    </PageShell>
  );
}