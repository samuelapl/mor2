"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import type { ApiLiveSession } from "@/lib/api/types";
import { fetchLiveSessions } from "@/lib/api/monitoring";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { SessionTable, type SessionRow } from "@/components/features/sessions/SessionTable";
import { SessionDetailModal } from "@/components/features/sessions/SessionDetailModal";

export default function CalendarPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLiveSessions({ limit: 100 })
      .then((res) => {
        if (!cancelled) {
          setSessions(
            res.data.filter((s) => s.status === "SCHEDULED" || s.status === "LIVE"),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = sessions.map<SessionRow>((session) => ({
    session,
    courseTitle: session.course.titleEn,
    courseCode: session.course.code,
    trainerName: "—",
  }));
  const { page, totalPages, setPage, pageItems } = usePagination(rows, 5);

  return (
    <PageShell
      role="training_admin"
      title="Training Calendar"
      description="Upcoming live training sessions across all courses."
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <TableSkeleton columns={6} rows={5} />
        </div>
      ) : (
        <>
          <SessionTable
            sessions={pageItems}
            extra={(row) => (
              <Button size="sm" variant="outline" onClick={() => setSelectedId(row.session.id)}>
                <Eye className="h-3.5 w-3.5" />
                Details
              </Button>
            )}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <SessionDetailModal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        sessionId={selectedId ?? ""}
      />
    </PageShell>
  );
}