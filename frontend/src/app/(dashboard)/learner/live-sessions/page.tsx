"use client";

import { useEffect, useState } from "react";
import { Video, MonitorPlay } from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchUpcomingSessions, selfCheckIn } from "@/lib/api/monitoring";
import { ApiError } from "@/lib/api/client";
import { useLms } from "@/lib/lms-store";
import { tr } from "@/constants/labels";
import PageShell from "@/components/shared/PageShell";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { EmptyState } from "@/components/ui/EmptyState";

export default function LiveSessionsPage() {
  const { lang, currentUser } = useLms();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [joined, setJoined] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchUpcomingSessions()
      .then((res) => setSessions(res.data))
      .catch(() => setSessions([]));
  };

  useEffect(() => {
    load();
  }, []);

  const rows = sessions.map<SessionRow>((session) => ({
    session,
    courseTitle: session.course.titleEn,
    courseCode: session.course.code,
    trainerName: "—",
  }));

  const join = async (id: string) => {
    setError(null);
    try {
      await selfCheckIn(id, "VIRTUAL");
      setJoined((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to join this session.");
    }
  };

  return (
    <PageShell
      role="learner"
      title={tr(lang, "liveSessions")}
      description="Upcoming live sessions for the courses you are enrolled in."
    >
      <div className="mb-6 flex justify-between">
        <div />
        <LanguageToggle />
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No live sessions" description="New sessions will appear here." />
      ) : (
        <SessionTable
          sessions={rows}
          extra={(row) => {
            if (joined.includes(row.session.id) || currentUser?.id === undefined) {
              return <Badge variant="green">Joined</Badge>;
            }
            return (
              <Button size="sm" onClick={() => join(row.session.id)}>
                <MonitorPlay className="h-3.5 w-3.5" />
                {tr(lang, "join")}
              </Button>
            );
          }}
        />
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <Video className="h-4 w-4" />
        Joining a session records your attendance (check-in); sessions are delivered live in
        production.
      </div>
    </PageShell>
  );
}