"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  ClipboardCheck,
  Edit3,
  ExternalLink,
  Filter,
  Info,
  Link as LinkIcon,
  MonitorPlay,
  Play,
  Presentation,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { deleteLiveSession, fetchLiveSessions, fetchSessionJoinUrl, setSessionStatus } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { ScheduleSessionModal } from "@/components/features/sessions/ScheduleSessionModal";
import { EditSessionModal } from "@/components/features/sessions/EditSessionModal";
import { LiveSessionWorkspace } from "@/components/features/sessions/LiveSessionWorkspace";
import { SessionDetailModal } from "@/components/features/sessions/SessionDetailModal";
import { SessionAttendanceModal } from "@/components/features/sessions/SessionAttendanceModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/lib/toast";

export default function TrainingAdminSessionsPage() {
  const { courses, users, currentUser } = useLms();
  const { can, canAny } = usePermissions();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ApiLiveSession | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ApiLiveSession | null>(null);
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [activeJoinSession, setActiveJoinSession] = useState<ApiLiveSession | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  const canManageAll = can("live_session.manage_all");
  const canViewAttendance = canAny(["attendance.view", "attendance.manage"]);

  const loadSessions = () => {
    setLoading(true);
    fetchLiveSessions({ limit: 100 })
      .then((res) => {
        setSessions(res.data);
      })
      .catch((err) => {
        console.error("Failed to load sessions:", err);
        setSessions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  // Apply filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedCourseFilter !== "ALL" && s.courseId !== selectedCourseFilter) {
        return false;
      }
      if (selectedStatusFilter !== "ALL" && s.status !== selectedStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const course = courseMap.get(s.courseId);
        const titleMatch = (s.titleEn || "").toLowerCase().includes(q);
        const codeMatch = (course?.code || s.course?.code || "").toLowerCase().includes(q);
        const courseTitleMatch = (course?.title || s.course?.titleEn || "").toLowerCase().includes(q);
        const trainer = s.trainerId ? userMap.get(s.trainerId) : s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : "";
        const trainerMatch = (trainer || "").toLowerCase().includes(q);
        if (!titleMatch && !codeMatch && !courseTitleMatch && !trainerMatch) return false;
      }
      return true;
    });
  }, [sessions, selectedCourseFilter, selectedStatusFilter, searchQuery, courseMap, userMap]);

  const upcoming = useMemo(
    () => filteredSessions.filter((s) => s.status === "SCHEDULED" || s.status === "LIVE"),
    [filteredSessions],
  );
  const past = useMemo(
    () => filteredSessions.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED"),
    [filteredSessions],
  );

  const toRows = (items: ApiLiveSession[]): SessionRow[] =>
    items.map((session) => {
      const course = session.courseId ? courseMap.get(session.courseId) : undefined;
      const trainerName = session.trainerId ? userMap.get(session.trainerId) : undefined;
      return {
        session,
        courseTitle: course?.title ?? "General Training",
        courseCode: course?.code ?? "GENERAL",
        trainerName:
          trainerName ??
          (session.trainer
            ? `${session.trainer.firstName} ${session.trainer.lastName}`
            : "Assigned Trainer"),
      };
    });

  const upcomingRows = usePagination(toRows(upcoming), 10);
  const pastRows = usePagination(toRows(past), 10);

  const handleJoin = async (session: ApiLiveSession) => {
    try {
      const { joinUrl } = await fetchSessionJoinUrl(session.id);
      setActiveJoinSession(session);
    } catch (err) {
      console.error("Failed to fetch join URL:", err);
      setActiveJoinSession(session);
    }
  };

  const handleToggleLive = async (session: ApiLiveSession) => {
    setStatusUpdatingId(session.id);
    const newStatus = session.status === "SCHEDULED" ? "LIVE" : "COMPLETED";
    try {
      await setSessionStatus(session.id, newStatus);
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, status: newStatus } : s)),
      );
      toast.success(`Session status updated to ${newStatus}.`);
    } catch {
      toast.error("Failed to update session status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeletingId(sessionToDelete.id);
    try {
      await deleteLiveSession(sessionToDelete.id);
      toast.success(`Session "${sessionToDelete.titleEn}" was deleted successfully.`);
      setSessionToDelete(null);
      loadSessions();
    } catch {
      toast.error("Failed to delete session.");
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = searchQuery !== "" || selectedCourseFilter !== "ALL" || selectedStatusFilter !== "ALL";

  return (
    <PageShell
      role={currentUser?.role ?? "training_admin"}
      title="All Sessions"
      description="Schedule and manage institutional virtual sessions, instructor-led webinars, and platform meetings across courses."
      actions={
        canManageAll ? (
          <Button onClick={() => setScheduleOpen(true)} className="shadow-sm">
            <CalendarPlus className="h-4 w-4" />
            Schedule Session
          </Button>
        ) : undefined
      }
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
                placeholder="Search session, course, trainer…"
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
              <option value="ALL">All Courses ({courses.length})</option>
              {courses.map((c) => (
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
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    selectedStatusFilter === st
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

      <div className="space-y-8">
        {selectedStatusFilter === "ALL" && upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            title="No live sessions found"
            description={
              hasActiveFilters
                ? "No sessions match your search or filter criteria. Try clearing filters."
                : "No live training sessions have been scheduled yet."
            }
          >
            {canManageAll && !hasActiveFilters ? (
              <Button size="sm" onClick={() => setScheduleOpen(true)}>
                <CalendarPlus className="h-4 w-4" />
                Schedule Session
              </Button>
            ) : null}
          </EmptyState>
        ) : null}

        {/* Upcoming & Active Sessions */}
        {(selectedStatusFilter === "ALL" ? (loading || upcoming.length > 0) : selectedStatusFilter === "SCHEDULED" || selectedStatusFilter === "LIVE") ? (
          <PageSection
            title="Upcoming & Active Sessions"
            description="Scheduled webinars and active classroom meetings awaiting or undergoing delivery."
          >
            {loading ? (
              <TableSkeleton rows={4} columns={5} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming sessions found"
                description={hasActiveFilters ? "Try adjusting your search or filters." : "Arrange a new live training session for any course."}
              >
                {canManageAll && !hasActiveFilters ? (
                  <Button size="sm" onClick={() => setScheduleOpen(true)}>
                    <CalendarPlus className="h-4 w-4" />
                    Schedule Session
                  </Button>
                ) : null}
              </EmptyState>
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
                          title="View and manage session attendance"
                          className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 text-indigo-600" />
                          Attendance
                        </Button>
                      )}

                      {/* Go Live / End Session Lifecycle */}
                      {row.session.status === "SCHEDULED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={statusUpdatingId === row.session.id}
                          onClick={() => handleToggleLive(row.session)}
                          className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-none text-xs gap-1 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                        >
                          <Play className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                          Go Live
                        </Button>
                      ) : row.session.status === "LIVE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={statusUpdatingId === row.session.id}
                          onClick={() => handleToggleLive(row.session)}
                          className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-none text-xs gap-1 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                        >
                          <Square className="h-3 w-3 fill-rose-600 text-rose-600" />
                          End Session
                        </Button>
                      ) : null}

                      {/* Primary Call to Action: Join Room */}
                      <Button
                        size="sm"
                        onClick={() => handleJoin(row.session)}
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
        {(selectedStatusFilter === "ALL" ? (loading || past.length > 0) : selectedStatusFilter === "COMPLETED" || selectedStatusFilter === "CANCELLED") ? (
          <PageSection
            title="Past Sessions Archive"
            description="Previously conducted or cancelled training events."
          >
            {loading ? (
              <TableSkeleton rows={4} columns={5} />
            ) : past.length === 0 ? (
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
      </div>

      <ScheduleSessionModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onScheduled={() => {
          setScheduleOpen(false);
          toast.success("Live training session successfully scheduled and persisted.");
          loadSessions();
        }}
        courses={courses}
      />

      <EditSessionModal
        open={Boolean(editingSession)}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onUpdated={() => {
          setEditingSession(null);
          toast.success("Live training session has been updated / rescheduled.");
          loadSessions();
        }}
        courses={courses}
      />

      {activeJoinSession && (
        <LiveSessionWorkspace
          open={Boolean(activeJoinSession)}
          onClose={() => setActiveJoinSession(null)}
          session={activeJoinSession}
          courseTitle={courseMap.get(activeJoinSession.courseId)?.title}
          courseCode={courseMap.get(activeJoinSession.courseId)?.code}
          trainerName={
            activeJoinSession.trainer
              ? `${activeJoinSession.trainer.firstName} ${activeJoinSession.trainer.lastName}`
              : activeJoinSession.trainerId
              ? userMap.get(activeJoinSession.trainerId)
              : courseMap.get(activeJoinSession.courseId)?.trainerId
              ? userMap.get(courseMap.get(activeJoinSession.courseId)!.trainerId!)
              : "Assigned Trainer"
          }
          userRole={currentUser?.role ?? "training_admin"}
        />
      )}

      {/* Pure Session Details Modal */}
      {selectedDetailId && (
        <SessionDetailModal
          open={Boolean(selectedDetailId)}
          onClose={() => setSelectedDetailId(null)}
          sessionId={selectedDetailId}
          userRole={currentUser?.role ?? "training_admin"}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDeleteSession}
        title="Delete Live Session"
        description={
          <>
            Are you sure you want to delete session{" "}
            <span className="font-semibold text-slate-800">
              &quot;{sessionToDelete?.titleEn}&quot;
            </span>
            ? This action cannot be undone and will revoke scheduled room links for all enrolled learners.
          </>
        }
        confirmText="Delete Session"
        variant="danger"
        isLoading={Boolean(deletingId)}
      />
    </PageShell>
  );
}
