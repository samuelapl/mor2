import type { ReactNode } from "react";
import type { ApiLiveSession } from "@/lib/api/types";
import { Table, TableRow, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export interface SessionRow {
  session: ApiLiveSession;
  courseTitle: string;
  courseCode: string;
  trainerName: string;
}

interface SessionTableProps {
  sessions: SessionRow[];
  extra?: (row: SessionRow) => ReactNode;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const STATUS_META: Record<ApiLiveSession["status"], { label: string; variant: "blue" | "green" | "slate" | "red" }> = {
  SCHEDULED: { label: "Upcoming", variant: "blue" },
  LIVE: { label: "LIVE", variant: "green" },
  COMPLETED: { label: "Past", variant: "slate" },
  CANCELLED: { label: "Cancelled", variant: "red" },
};

export function SessionTable({ sessions, extra }: SessionTableProps) {
  const sorted = [...sessions].sort((a, b) =>
    a.session.scheduledAt.localeCompare(b.session.scheduledAt),
  );

  return (
    <Table columns={["Date", "Time", "Session", "Course", "Trainer", "Status", ""]}>
      {sorted.length === 0 ? (
        <tr>
          <Td colSpan={7} className="py-10 text-center text-xs text-slate-400">
            No sessions scheduled.
          </Td>
        </tr>
      ) : (
        sorted.map((row) => {
          const meta = STATUS_META[row.session.status];
          const enrolled = row.session.attendees ?? [];
          const present = enrolled.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
          return (
            <TableRow key={row.session.id}>
              <Td className="whitespace-nowrap font-medium text-slate-900">
                {formatDate(row.session.scheduledAt)}
              </Td>
              <Td className="whitespace-nowrap">{formatTime(row.session.scheduledAt)}</Td>
              <Td>
                <span className="font-medium text-slate-900">{row.session.titleEn}</span>
                <span className="block text-[11px] text-slate-400">
                  {row.session.durationMinutes} minutes
                </span>
              </Td>
              <Td>
                <span className="text-slate-700">{row.courseTitle}</span>
                <span className="block text-[11px] text-slate-400">{row.courseCode}</span>
              </Td>
              <Td className="whitespace-nowrap">{row.trainerName}</Td>
              <Td>
                <Badge variant={meta.variant} dot>
                  {meta.label}
                  {row.session.status !== "LIVE" && row.session.status !== "CANCELLED"
                    ? ` · ${present} present`
                    : ""}
                </Badge>
              </Td>
              <Td className="text-right">{extra ? extra(row) : null}</Td>
            </TableRow>
          );
        })
      )}
    </Table>
  );
}