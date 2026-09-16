"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ExternalLink, Link as LinkIcon, MonitorPlay, Play, Presentation, RefreshCw, Square, Video } from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSessions, fetchSessionJoinUrl, setSessionStatus } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { ScheduleSessionModal } from "@/components/features/sessions/ScheduleSessionModal";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TrainingAdminSessionsPage() {
  const { courses, users } = useLms();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

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

  const upcoming = useMemo(
    () => sessions.filter((s) => s.status === "SCHEDULED" || s.status === "LIVE"),
    [sessions],
  );
  const past = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED"),
    [sessions],
  );

  const toRows = (items: ApiLiveSession[]): SessionRow[] =>
    items.map((session) => {
      const course = courseMap.get(session.courseId);
      const trainerName = course?.trainerId
        ? userMap.get(course.trainerId) ?? "Assigned Trainer"
        : "Unassigned";
      return {
        session,
        courseTitle: course?.title ?? session.titleEn ?? "Training Session",
        courseCode: course?.code ?? "MoR-TRN",
        trainerName,
      };
    });

  const upcomingRows = usePagination(toRows(upcoming), 6);
  const pastRows = usePagination(toRows(past), 6);

  const handleJoin = async (session: ApiLiveSession) => {
    let url = session.externalUrl;
    try {
      const resolved = await fetchSessionJoinUrl(session.id);
      if (resolved?.joinUrl) {
        url = resolved.joinUrl;
      }
    } catch {
      // fallback to externalUrl
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
      setFlash(`Session status updated to ${nextStatus}.`);
      loadSessions();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <PageShell
      role="training_admin"
      title="Training Sessions"
      description="Schedule and manage institutional virtual sessions, instructor-led webinars, and platform meetings across courses."
      actions={
        <Button onClick={() => setScheduleOpen(true)} className="shadow-sm">
          <CalendarPlus className="h-4 w-4" />
          Schedule Session
        </Button>
      }
    >
      {flash ? (
        <div className="mb-5 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700">
          {flash}
        </div>
      ) : null}

      <div className="space-y-8">
        <PageSection
          title="Upcoming & Active Sessions"
          description="Scheduled webinars and active classroom meetings awaiting or undergoing delivery."
        >
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming sessions scheduled"
              description="Click '+ Schedule Session' to arrange a new live training session for any course."
            >
              <Button size="sm" onClick={() => setScheduleOpen(true)}>
                <CalendarPlus className="h-4 w-4" />
                Schedule Session
              </Button>
            </EmptyState>
          ) : (
            <>
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
            </>
          )}
        </PageSection>

        {past.length > 0 ? (
          <PageSection
            title="Past Sessions Archive"
            description="Previously conducted or cancelled training events."
          >
            <SessionTable
              sessions={pastRows.pageItems}
              extra={(row) =>
                row.session.externalUrl ? (
                  <Button size="sm" variant="ghost" onClick={() => handleJoin(row.session)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Recording / Link
                  </Button>
                ) : null
              }
            />
            <Pagination
              page={pastRows.page}
              totalPages={pastRows.totalPages}
              onPageChange={pastRows.setPage}
            />
          </PageSection>
        ) : null}
      </div>

      <ScheduleSessionModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onScheduled={() => {
          setScheduleOpen(false);
          setFlash("Live training session successfully scheduled and persisted.");
          loadSessions();
        }}
        courses={courses}
      />
    </PageShell>
  );
}
