"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarPlus,
  ClipboardCheck,
  Edit3,
  Info,
  MonitorPlay,
  Play,
  RefreshCw,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import {
  deleteLiveSession,
  fetchLiveSessions,
  sendSessionAttendanceReport,
  setSessionStatus,
} from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import { isInPersonSession } from "@/lib/session-mode";
import { toast } from "@/lib/toast";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SessionTable, type SessionRow } from "./SessionTable";
import { ScheduleSessionModal } from "./ScheduleSessionModal";
import { EditSessionModal } from "./EditSessionModal";
import { SessionDetailModal } from "./SessionDetailModal";
import { SessionAttendanceModal } from "./SessionAttendanceModal";
import { LiveSessionWorkspace } from "../virtual/LiveSessionWorkspace";

/**
 * `all` — every session (admin "All Sessions", can schedule new ones).
 * `own` — the trainer's "My Sessions".
 * Which sessions come back is decided by the server: everything with live_session.manage_all,
 * otherwise only the sessions the user hosts.
 */
export type SessionsScope = "all" | "own";

const SCOPE_CONFIG = {
  all: {
    title: "All Sessions",
    description:
      "Schedule and manage institutional virtual sessions, instructor-led webinars, and platform meetings across courses.",
    defaultRole: "training_admin",
    pageSize: 10,
    canSchedule: true,
    searchPlaceholder: "Search session, course, trainer…",
    emptyTitle: "No live sessions found",
    emptyDescription: "No live training sessions have been scheduled yet.",
    upcomingDescription: "Scheduled webinars and active classroom meetings awaiting or undergoing delivery.",
    upcomingEmptyDescription: "Arrange a new live training session for any course.",
    pastTitle: "Past Sessions Archive",
    pastDescription: "Previously conducted or cancelled training events.",
  },
  own: {
    title: "My Sessions",
    description:
      "View and conduct scheduled live training sessions for your assigned courses, and inspect participant attendance.",
    defaultRole: "trainer",
    pageSize: 6,
    canSchedule: false,
    searchPlaceholder: "Search session, course, trainer…",
    emptyTitle: "No sessions found",
    emptyDescription: "You do not have any assigned course sessions scheduled yet.",
    upcomingDescription: "Sessions scheduled to be delivered. Start the session to go live or review attendance.",
    upcomingEmptyDescription: "No scheduled or live sessions match your filter criteria.",
    pastTitle: "Past Sessions",
    pastDescription: "Completed training sessions with verifiable attendance records.",
  },
} as const;

export function SessionsManager({ scope }: { scope: SessionsScope }) {
  const config = SCOPE_CONFIG[scope];
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
  const canConductSession = canAny(["live_session.manage_all", "live_session.manage_own"]);
  const canViewAttendance = canAny(["attendance.view", "attendance.manage"]);
  const canSchedule = config.canSchedule && canManageAll;
  const role = currentUser?.role ?? config.defaultRole;

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

  const assignedCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.trainerId === currentUser?.id ||
          ((c as any).trainerIds && (c as any).trainerIds.includes(currentUser?.id)),
      ),
    [courses, currentUser],
  );
  // Course dropdown: a trainer sees their assigned courses (falling back to all if none).
  const filterCourses = scope === "own" && assignedCourses.length > 0 ? assignedCourses : courses;

  const trainerNameFor = (s: ApiLiveSession) =>
    (s.trainerId ? userMap.get(s.trainerId) : undefined) ??
    (s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : undefined);

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
        const trainerMatch = (trainerNameFor(s) || "").toLowerCase().includes(q);
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
      return {
        session,
        courseTitle: course?.title ?? session.course?.titleEn ?? "General Training",
        courseCode: course?.code ?? session.course?.code ?? "GENERAL",
        trainerName: trainerNameFor(session) ?? "Assigned Trainer",
      };
    });

  const upcomingRows = usePagination(toRows(upcoming), config.pageSize);
  const pastRows = usePagination(toRows(past), config.pageSize);

  const handleToggleLive = async (session: ApiLiveSession) => {
    setStatusUpdatingId(session.id);
    const newStatus = session.status === "SCHEDULED" ? "LIVE" : "COMPLETED";
    try {
      await setSessionStatus(session.id, newStatus);
      if (newStatus === "COMPLETED") {
        try {
          // Records the final attendance report in the audit log (best effort).
          await sendSessionAttendanceReport(session.id);
        } catch {
          // Best effort report generation
        }
      }
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
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete session.");
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters = searchQuery !== "" || selectedCourseFilter !== "ALL" || selectedStatusFilter !== "ALL";

  const scheduleButton = (size?: "sm") => (
    <Button size={size} onClick={() => setScheduleOpen(true)} className={size ? undefined : "shadow-sm"}>
      <CalendarPlus className="h-4 w-4" />
      Schedule Session
    </Button>
  );

  /** Details / Edit / Delete — shared by both tables. */
  const managementButtons = (session: ApiLiveSession) => (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setSelectedDetailId(session.id)}
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
            onClick={() => setEditingSession(session)}
            title="Edit details or reschedule date/time"
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0"
          >
            <Edit3 className="h-4 w-4" />
            <span className="sr-only">Edit / Reschedule</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={deletingId === session.id}
            onClick={() => setSessionToDelete(session)}
            title="Delete session"
            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </>
      )}
    </>
  );

  return (
    <PageShell
      role={role}
      title={config.title}
      description={config.description}
      actions={canSchedule ? scheduleButton() : undefined}
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
                placeholder={config.searchPlaceholder}
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
              <option value="ALL">All Courses ({filterCourses.length})</option>
              {filterCourses.map((c) => (
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
        {!loading && selectedStatusFilter === "ALL" && upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            title={config.emptyTitle}
            description={
              hasActiveFilters
                ? "No sessions match your search or filter criteria. Try clearing filters."
                : config.emptyDescription
            }
          >
            {canSchedule && !hasActiveFilters ? scheduleButton("sm") : null}
          </EmptyState>
        ) : null}

        {/* Upcoming & Active Sessions */}
        {(selectedStatusFilter === "ALL" ? (loading || upcoming.length > 0) : selectedStatusFilter === "SCHEDULED" || selectedStatusFilter === "LIVE") ? (
          <PageSection title="Upcoming & Active Sessions" description={config.upcomingDescription}>
            {loading ? (
              <TableSkeleton rows={4} columns={5} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming sessions found"
                description={hasActiveFilters ? "Try adjusting your search or filters." : config.upcomingEmptyDescription}
              >
                {canSchedule && !hasActiveFilters ? scheduleButton("sm") : null}
              </EmptyState>
            ) : (
              <>
                <SessionTable
                  sessions={upcomingRows.pageItems}
                  extra={(row) => (
                    <div className="flex items-center justify-end gap-1.5">
                      {managementButtons(row.session)}

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
                      {canConductSession && row.session.status === "SCHEDULED" ? (
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
                      ) : canConductSession && row.session.status === "LIVE" ? (
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

                      {/* Primary Call to Action: Join Room (virtual) / Classroom Attendance (in-person) */}
                      {isInPersonSession(row.session) ? (
                        <Link href="/trainer/attendance">
                          <Button
                            size="sm"
                            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs text-xs h-8 px-3 rounded-lg shrink-0 font-medium"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            Classroom Attendance
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setActiveJoinSession(row.session)}
                          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs text-xs h-8 px-3 rounded-lg shrink-0 font-medium"
                        >
                          <MonitorPlay className="h-3.5 w-3.5" />
                          Join Room
                        </Button>
                      )}
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
          <PageSection title={config.pastTitle} description={config.pastDescription}>
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
                      {managementButtons(row.session)}

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

      {canSchedule ? (
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
      ) : null}

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
          courseTitle={courseMap.get(activeJoinSession.courseId)?.title ?? activeJoinSession.course?.titleEn}
          courseCode={courseMap.get(activeJoinSession.courseId)?.code ?? activeJoinSession.course?.code}
          trainerName={
            scope === "own"
              ? currentUser?.name
              : trainerNameFor(activeJoinSession) ??
                (courseMap.get(activeJoinSession.courseId)?.trainerId
                  ? userMap.get(courseMap.get(activeJoinSession.courseId)!.trainerId!)
                  : "Assigned Trainer")
          }
          // "My Sessions" always hosts as trainer; "All Sessions" uses the viewer's own role.
          userRole={scope === "own" ? "trainer" : role}
        />
      )}

      {/* Pure Session Details Modal */}
      {selectedDetailId && (
        <SessionDetailModal
          open={Boolean(selectedDetailId)}
          onClose={() => setSelectedDetailId(null)}
          sessionId={selectedDetailId}
          userRole={role}
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
        onClose={() => !deletingId && setSessionToDelete(null)}
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
