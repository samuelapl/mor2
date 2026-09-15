"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiAttendance, ApiLiveSession, BackendAttendanceStatus } from "@/lib/api/types";
import { fetchLiveSessions, fetchSessionAttendance, markAttendance } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const statusVariant = (status: BackendAttendanceStatus) =>
  status === "PRESENT" || status === "LATE" ? ("green" as const) : ("slate" as const);

export default function AttendancePage() {
  const { courses, currentUser, userName } = useLms();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [records, setRecords] = useState<Record<string, ApiAttendance[]>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const assignedCourses = useMemo(
    () => courses.filter((c) => c.trainerId === currentUser?.id),
    [courses, currentUser],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLiveSessions({ limit: 100 })
      .then(async (res) => {
        const mine = res.data.filter((s) => assignedCourses.some((c) => c.id === s.courseId));
        if (cancelled) return;
        setSessions(mine);
        const bySession: Record<string, ApiAttendance[]> = {};
        await Promise.all(
          mine.map(async (session) => {
            try {
              bySession[session.id] = await fetchSessionAttendance(session.id);
            } catch {
              bySession[session.id] = [];
            }
          }),
        );
        if (cancelled) return;
        setRecords(bySession);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSession = async (sessionId: string) => {
    try {
      const latest = await fetchSessionAttendance(sessionId);
      setRecords((prev) => ({ ...prev, [sessionId]: latest }));
    } catch {
      // leave as-is
    }
  };

  const mark = async (sessionId: string, userId: string, status: BackendAttendanceStatus) => {
    setErrors((prev) => ({ ...prev, [`${sessionId}:${userId}`]: "" }));
    try {
      await markAttendance({ sessionId, userId, status });
      const latest = await fetchSessionAttendance(sessionId);
      setRecords((prev) => ({ ...prev, [sessionId]: latest }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [`${sessionId}:${userId}`]:
          err instanceof Error ? err.message : "Failed to update attendance.",
      }));
      void refreshSession(sessionId);
    }
  };

  const visible = sessions.filter((s) => s.status === "SCHEDULED" || s.status === "LIVE");

  return (
    <PageShell
      role="trainer"
      title="Attendance"
      description="Mark who attended each of your live training sessions."
    >
      {loading ? (
        <p className="text-sm text-slate-400">Loading sessions…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No sessions" description="Scheduled sessions will appear here." />
      ) : (
        visible.map((session) => {
          const course = assignedCourses.find((c) => c.id === session.courseId);
          const enrolledIds = (course?.enrolledLearnerIds ?? []).filter(
            (id) => id !== currentUser?.id,
          );
          const attendance = records[session.id] ?? [];
          const byUser = new Map(attendance.map((record) => [record.userId, record]));
          const presentCount = attendance.filter(
            (a) => a.status === "PRESENT" || a.status === "LATE",
          ).length;

          return (
            <PageSection
              key={session.id}
              title={session.titleEn}
              description={`${course?.code ?? ""} · ${formatDate(session.scheduledAt)} at ${formatTime(session.scheduledAt)} · ${presentCount}/${enrolledIds.length} present`}
            >
              {enrolledIds.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-indigo-200/60 bg-white/60 px-4 py-8 text-center text-xs text-slate-400">
                  No enrolled learners in this course yet.
                </div>
              ) : (
                <Table columns={["Learner", "Status", ""]}>
                  {enrolledIds.map((userId) => {
                    const record = byUser.get(userId);
                    const status = record?.status ?? "ABSENT";
                    const isPresent = record ? record.status === "PRESENT" || record.status === "LATE" : false;
                    const error = errors[`${session.id}:${userId}`];
                    return (
                      <tr key={userId}>
                        <Td>
                          <span className="font-medium text-slate-900">{userName(userId)}</span>
                          {record?.checkInMethod ? (
                            <span className="ml-2 rounded-md bg-indigo-50/80 px-1.5 py-0.5 text-[10px] text-indigo-600">
                              check-in · {record.checkInMethod.toLowerCase()}
                            </span>
                          ) : null}
                          {error ? <span className="block text-[11px] text-red-500">{error}</span> : null}
                        </Td>
                        <Td>
                          <Badge variant={statusVariant(status)}>{status}</Badge>
                        </Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant={isPresent ? "outline" : "success"}
                              disabled={isPresent}
                              onClick={() => mark(session.id, userId, "PRESENT")}
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={isPresent ? "outline" : "ghost"}
                              disabled={!isPresent}
                              onClick={() => mark(session.id, userId, "ABSENT")}
                            >
                              Absent
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </Table>
              )}
              <p className="mt-3 text-[11px] text-slate-400">
                Learner self-check-ins are immutable; trainers can only record attendance for
                learners who have not checked in.
              </p>
            </PageSection>
          );
        })
      )}
    </PageShell>
  );
}