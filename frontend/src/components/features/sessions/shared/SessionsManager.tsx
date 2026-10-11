"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarPlus,
  HelpCircle,
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
import type { Role } from "@/types";
import { sendSessionAttendanceReport } from "@/lib/api/monitoring";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCourseStore } from "@/lib/stores/course-store";
import { useLiveSessionStore } from "@/lib/stores/live-session-store";
import { useUserStore } from "@/lib/stores/user-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import { isInPersonSession } from "@/lib/session-mode";
import { toast } from "@/lib/toast";
import { useTranslation } from "@/lib/i18n/useTranslation";
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
import { useQuizReadinessGate } from "@/components/features/prepared-quiz/useQuizReadinessGate";

/**
 * `all` — every session (admin "All Sessions", can schedule new ones).
 * `own` — the trainer's "My Sessions".
 * Which sessions come back is decided by the server: everything with live_session.manage_all,
 * otherwise only the sessions the user hosts.
 */
export type SessionsScope = "all" | "own";

/** Page text per scope lives in locales/{en,am}/sessions.json under sessionsManager.scope.<scope>. */
const SCOPE_CONFIG: Record<
  SessionsScope,
  {
    defaultRole: Role;
    pageSize: number;
    pageSizeOptions: number[];
    canSchedule: boolean;
  }
> = {
  all: {
    defaultRole: "training_admin",
    pageSize: 10,
    pageSizeOptions: [5, 10, 20, 50],
    canSchedule: true,
  },
  own: {
    defaultRole: "trainer",
    pageSize: 6,
    pageSizeOptions: [6, 12, 24, 48],
    canSchedule: false,
  },
};

export function SessionsManager({ scope }: { scope: SessionsScope }) {
  const config = SCOPE_CONFIG[scope];
  const courses = useCourseStore((s) => s.courses);
  const users = useUserStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.currentUser);
  const refreshCourse = useCourseStore((s) => s.refreshCourse);
  const { can, canAny } = usePermissions();
  const { t } = useTranslation("sessions");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ApiLiveSession | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ApiLiveSession | null>(null);
  const sessions = useLiveSessionStore((s) => s.sessions);
  const sessionsLoaded = useLiveSessionStore((s) => s.sessionsLoaded);
  const refreshing = useLiveSessionStore((s) => s.loadingSessions);
  const fetchSessions = useLiveSessionStore((s) => s.loadSessions);
  const setSessionStatus = useLiveSessionStore((s) => s.setStatus);
  const deleteLiveSession = useLiveSessionStore((s) => s.deleteSession);
  // Skeletons only until the first list arrives; later refreshes keep showing the list.
  const loading = !sessionsLoaded;
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
  // Staff can't start or join a session whose graded quiz isn't prepared yet.
  const quizGate = useQuizReadinessGate();
  const joinRoom = async (session: ApiLiveSession) => {
    if (canConductSession && !(await quizGate.guard(session.id))) return;
    setActiveJoinSession(session);
  };
  const canViewAttendance = canAny(["attendance.view", "attendance.manage"]);
  // All Sessions: schedulers with manage_all. My Sessions: anyone who conducts sessions can
  // schedule for the courses they're assigned to (incl. the course's planned sessions).
  const canSchedule = (config.canSchedule && canManageAll) || (scope === "own" && canConductSession);
  const role = currentUser?.role ?? config.defaultRole;

  const loadSessions = () => {
    void fetchSessions();
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
  // Scheduling from My Sessions is limited to the user's assigned courses (the server checks it too).
  const scheduleCourses = scope === "own" ? assignedCourses : courses;

  const trainerNameFor = (s: ApiLiveSession) => {
    if (s.trainer) return `${s.trainer.firstName || ''} ${s.trainer.lastName || ''}`.trim();
    if (s.trainerId && userMap.get(s.trainerId)) return userMap.get(s.trainerId);
    const course = s.courseId ? courseMap.get(s.courseId) : undefined;
    if (course?.trainerIds && course.trainerIds.length > 0) {
      for (const tId of course.trainerIds) {
        const name = userMap.get(tId);
        if (name) return name;
      }
    } else if (course?.trainerId) {
      const name = userMap.get(course.trainerId);
      if (name) return name;
    }
    return undefined;
  };

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
        const courseTitleMatch = (course?.title || s.course?.title || s.course?.titleEn || "").toLowerCase().includes(q);
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
        courseTitle: course?.title ?? session.course?.title ?? session.course?.titleEn ?? "General Training",
        courseCode: course?.code ?? session.course?.code ?? "GENERAL",
        trainerName: trainerNameFor(session) ?? "Assigned Trainer",
      };
    });

  const upcomingRows = usePagination(toRows(upcoming), config.pageSize);
  const pastRows = usePagination(toRows(past), config.pageSize);

  const handleToggleLive = async (session: ApiLiveSession) => {
    if (session.status === "SCHEDULED" && !(await quizGate.guard(session.id))) return;
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
      toast.success(`Session status updated to ${newStatus}.`);
    } catch {
      toast.error("Failed to update session status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // A session scheduled from a course plan only goes back to unscheduled; the plan stays.
  const deletingPlanned = Boolean(sessionToDelete?.sessionPlanId);

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeletingId(sessionToDelete.id);
    try {
      await deleteLiveSession(sessionToDelete.id);
      toast.success(
        deletingPlanned
          ? `Session "${sessionToDelete.titleEn}" was removed. Its planned session is unscheduled again and can be rescheduled.`
          : `Session "${sessionToDelete.titleEn}" was deleted successfully.`,
      );
      void refreshCourse(sessionToDelete.courseId);
      setSessionToDelete(null);
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
      {t("sessionsManager.scheduleSession")}
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
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg shrink-0"
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
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary-soft rounded-lg shrink-0"
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
            className="h-8 w-8 p-0 text-subtle-foreground hover:text-danger hover:bg-danger-soft rounded-lg shrink-0"
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
      title={t(`sessionsManager.scope.${scope}.title`)}
      description={t(`sessionsManager.scope.${scope}.description`)}
      actions={canSchedule ? scheduleButton() : undefined}
    >
      {/* FILTER BAR */}
      <div className="mb-6 rounded-2xl border border-border/90 bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
              <input
                type="text"
                placeholder={t(`sessionsManager.scope.${scope}.searchPlaceholder`)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-subtle-foreground focus:border-ring focus:bg-card focus:outline-none"
              />
            </div>

            {/* Course Filter Dropdown */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              aria-label="Filter by course"
              className="rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs text-secondary-foreground focus:border-ring focus:bg-card focus:outline-none"
            >
              <option value="ALL">
                {t("sessionsManager.allCourses")} ({filterCourses.length})
              </option>
              {filterCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
            </select>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-0.5 text-xs">
              {(["ALL", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    selectedStatusFilter === st
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-secondary-foreground hover:text-foreground"
                  }`}
                >
                  {st === "ALL"
                    ? t("sessionsManager.allStatus")
                    : st === "SCHEDULED"
                    ? t("sessionsManager.upcoming")
                    : st === "LIVE"
                    ? t("sessionsManager.live")
                    : st === "COMPLETED"
                    ? t("sessionsManager.completed")
                    : t("sessionsManager.cancelled")}
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
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                {t("sessionsManager.clear")}
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={loadSessions} disabled={refreshing} className="h-8 gap-1 text-xs text-secondary-foreground">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {t("sessionsManager.refresh")}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {!loading && selectedStatusFilter === "ALL" && upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            title={t(`sessionsManager.scope.${scope}.emptyTitle`)}
            description={
              hasActiveFilters
                ? t("sessionsManager.noSessionsMatchYourSearchOr")
                : t(`sessionsManager.scope.${scope}.emptyDescription`)
            }
          >
            {canSchedule && !hasActiveFilters ? scheduleButton("sm") : null}
          </EmptyState>
        ) : null}

        {/* Upcoming & Active Sessions */}
        {(selectedStatusFilter === "ALL" ? (loading || upcoming.length > 0) : selectedStatusFilter === "SCHEDULED" || selectedStatusFilter === "LIVE") ? (
          <PageSection title={t("sessionsManager.upcomingActiveSessions")} description={t(`sessionsManager.scope.${scope}.upcomingDescription`)}>
            {loading ? (
              <TableSkeleton rows={4} columns={5} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                title={t("sessionsManager.noUpcomingSessionsFound")}
                description={hasActiveFilters ? t("sessionsManager.tryAdjustingYourSearchOrFilters") : t(`sessionsManager.scope.${scope}.upcomingEmptyDescription`)}
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

                      {canConductSession && (
                        <Link href={`/trainer/sessions/${row.session.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Prepare live quiz questions before joining"
                            className="gap-1.5 text-xs text-primary hover:text-primary/80 border-primary/30 hover:bg-primary-soft h-8 px-2.5 rounded-lg shrink-0 font-medium"
                          >
                            <HelpCircle className="h-3.5 w-3.5 text-primary" />
                            {t("sessionsManager.prepareQuiz")}
                          </Button>
                        </Link>
                      )}

                      {/* Dedicated Attendance Button */}
                      {canViewAttendance && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAttendanceSessionId(row.session.id)}
                          title="View and manage session attendance"
                          className="gap-1.5 text-xs text-secondary-foreground hover:text-foreground border-border hover:bg-muted h-8 px-2.5 rounded-lg shrink-0 font-medium"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                          {t("sessionsManager.attendance")}
                        </Button>
                      )}

                      {/* Go Live / End Session Lifecycle */}
                      {canConductSession && row.session.status === "SCHEDULED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={statusUpdatingId === row.session.id || quizGate.checkingId === row.session.id}
                          onClick={() => handleToggleLive(row.session)}
                          className="border-success/30 bg-success-soft text-success hover:bg-success/15 shadow-none text-xs gap-1 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                        >
                          <Play className="h-3 w-3 fill-success text-success" />
                          {t("sessionsManager.goLive")}
                        </Button>
                      ) : canConductSession && row.session.status === "LIVE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={statusUpdatingId === row.session.id}
                          onClick={() => handleToggleLive(row.session)}
                          className="border-danger/30 bg-danger-soft text-danger hover:bg-danger/15 shadow-none text-xs gap-1 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                        >
                          <Square className="h-3 w-3 fill-danger text-danger" />
                          {t("sessionsManager.endSession")}
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
                            {t("sessionsManager.classroomAttendance")}
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void joinRoom(row.session)}
                          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs text-xs h-8 px-3 rounded-lg shrink-0 font-medium"
                        >
                          <MonitorPlay className="h-3.5 w-3.5" />
                          {t("sessionsManager.joinRoom")}
                        </Button>
                      )}
                    </div>
                  )}
                />
                <Pagination
                  page={upcomingRows.page}
                  totalPages={upcomingRows.totalPages}
                  onPageChange={upcomingRows.setPage}
                  totalItems={upcomingRows.totalItems}
                  pageSize={upcomingRows.pageSize}
                  onPageSizeChange={upcomingRows.setPageSize}
                  pageSizeOptions={config.pageSizeOptions}
                />
              </>
            )}
          </PageSection>
        ) : null}

        {/* Past Sessions */}
        {(selectedStatusFilter === "ALL" ? (loading || past.length > 0) : selectedStatusFilter === "COMPLETED" || selectedStatusFilter === "CANCELLED") ? (
          <PageSection title={t(`sessionsManager.scope.${scope}.pastTitle`)} description={t(`sessionsManager.scope.${scope}.pastDescription`)}>
            {loading ? (
              <TableSkeleton rows={4} columns={5} />
            ) : past.length === 0 ? (
              <EmptyState
                title={t("sessionsManager.noPastSessionsFound")}
                description={t("sessionsManager.noCompletedOrCancelledSessionsMatch")}
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
                          className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary-soft h-8 px-2.5 rounded-lg shrink-0 font-medium"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          {t("sessionsManager.attendanceRecords")}
                        </Button>
                      )}
                    </div>
                  )}
                />
                <Pagination
                  page={pastRows.page}
                  totalPages={pastRows.totalPages}
                  onPageChange={pastRows.setPage}
                  totalItems={pastRows.totalItems}
                  pageSize={pastRows.pageSize}
                  onPageSizeChange={pastRows.setPageSize}
                  pageSizeOptions={config.pageSizeOptions}
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
          onScheduled={(courseId) => {
            setScheduleOpen(false);
            // The course's planned session is now scheduled: refresh it for the course pages.
            void refreshCourse(courseId);
            toast.success("Live training session successfully scheduled and persisted.");
          }}
          courses={scheduleCourses}
        />
      ) : null}

      <EditSessionModal
        open={Boolean(editingSession)}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onUpdated={() => {
          setEditingSession(null);
          toast.success("Live training session has been updated / rescheduled.");
        }}
        courses={courses}
      />

      {activeJoinSession && (
        <LiveSessionWorkspace
          open={Boolean(activeJoinSession)}
          onClose={() => setActiveJoinSession(null)}
          session={activeJoinSession}
          courseTitle={courseMap.get(activeJoinSession.courseId)?.title ?? activeJoinSession.course?.title ?? activeJoinSession.course?.titleEn}
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
            if (found) void joinRoom(found);
            setSelectedDetailId(null);
          }}
        />
      )}

      {quizGate.modal}

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
        onConfirm={() => confirmDeleteSession()}
        title="Delete Live Session"
        description={
          <>
            Are you sure you want to delete session{" "}
            <span className="font-semibold text-foreground">
              &quot;{sessionToDelete?.titleEn}&quot;
            </span>
            ? This will revoke scheduled room links for all enrolled learners.
            {deletingPlanned &&
              " The course's planned session, its trainer and quizzes are kept: it goes back to unscheduled and can be scheduled again."}
          </>
        }
        confirmText="Delete Session"
        variant="danger"
        isLoading={Boolean(deletingId)}
      />
    </PageShell>
  );
}
