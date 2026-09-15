"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, MonitorPlay } from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSessions } from "@/lib/api/monitoring";
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
          extra={(row) =>
            row.session.externalUrl ? (
              <a href={row.session.externalUrl} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Join
                </Button>
              </a>
            ) : null
          }
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