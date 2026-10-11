import type { ReactNode } from 'react';
import type { ApiLiveSession } from '@/lib/api/types';
import { Table, TableRow, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Clock } from 'lucide-react';
import { isInPersonSession } from '@/lib/session-mode';
import { stripHtmlTags } from '@/components/ui/RichContent';
import { formatSessionDate, formatSessionTime } from '@/lib/app-time';
import { StartsInBadge } from './StartsInBadge';

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

// Session times are shown in platform time (EAT), whatever the browser's time zone.
const formatDate = (value: string) => {
  try {
    return formatSessionDate(value);
  } catch {
    return value;
  }
};

const formatTime = (value: string) => {
  try {
    return formatSessionTime(value);
  } catch {
    return '';
  }
};

function getInitials(name: string): string {
  if (!name || name === '—') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const STATUS_META: Record<
  ApiLiveSession['status'],
  { label: string; variant: 'blue' | 'green' | 'slate' | 'red' }
> = {
  SCHEDULED: { label: 'Upcoming', variant: 'blue' },
  LIVE: { label: 'LIVE', variant: 'green' },
  COMPLETED: { label: 'Past', variant: 'slate' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
};

export function SessionTable({ sessions, extra }: SessionTableProps) {
  const sorted = [...sessions].sort((a, b) =>
    a.session.scheduledAt.localeCompare(b.session.scheduledAt),
  );

  return (
    <Table
      columns={[
        { name: 'Schedule', className: 'w-[170px]' },
        { name: 'Session', className: 'min-w-[180px] max-w-[240px]' },
        { name: 'Course', className: 'min-w-[180px] max-w-[240px]' },
        { name: 'Trainer', className: 'w-[150px]' },
        { name: 'Status', className: 'w-[130px]' },
        { name: 'Actions', className: 'text-right' },
      ]}
    >
      {sorted.length === 0 ? (
        <tr>
          <Td colSpan={6} className="py-12 text-center text-xs text-subtle-foreground">
            No sessions scheduled.
          </Td>
        </tr>
      ) : (
        sorted.map((row) => {
          const meta = STATUS_META[row.session.status] ?? {
            label: row.session.status,
            variant: 'slate' as const,
          };
          const enrolled = row.session.attendees ?? [];
          const present = enrolled.filter(
            (a) => a.status === 'PRESENT' || a.status === 'LATE',
          ).length;

          return (
            <TableRow key={row.session.id}>
              {/* Schedule Column (Date, Time, Duration) */}
              <Td className="whitespace-nowrap w-[170px]">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>{formatDate(row.session.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3 text-subtle-foreground shrink-0" />
                    <span>{formatTime(row.session.scheduledAt)}</span>
                    <span className="text-subtle-foreground">•</span>
                    <span className="font-medium text-secondary-foreground">
                      {row.session.durationMinutes}m
                    </span>
                  </div>
                  <StartsInBadge seconds={row.session.startsInSeconds} className="mt-0.5 w-fit" />
                </div>
              </Td>

              {/* Session Title & Description */}
              <Td className="min-w-[180px] max-w-[240px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className="truncate text-xs font-semibold text-foreground"
                      title={stripHtmlTags(row.session.titleEn)}
                    >
                      {stripHtmlTags(row.session.titleEn)}
                    </p>
                    {isInPersonSession(row.session) ? (
                      <span className="shrink-0 rounded bg-warning-soft px-1.5 py-0.5 text-[9px] font-semibold text-warning border border-warning/30">
                        In-Person
                      </span>
                    ) : (
                      <span className="shrink-0 rounded bg-info-soft px-1.5 py-0.5 text-[9px] font-semibold text-info border border-info/30">
                        Virtual
                      </span>
                    )}
                  </div>
                  {isInPersonSession(row.session) && row.session.venue ? (
                    <p
                      className="mt-0.5 truncate text-[11px] font-medium text-warning"
                      title={`${row.session.venue.branch} — ${row.session.venue.name} (${row.session.venue.capacity} seats)`}
                    >
                      📍 {row.session.venue.branch} — {row.session.venue.name}
                    </p>
                  ) : (
                    <p
                      className="mt-0.5 truncate text-[11px] text-muted-foreground"
                      title={stripHtmlTags(row.session.descriptionEn) || 'Live Classroom Session'}
                    >
                      {stripHtmlTags(row.session.descriptionEn) || 'Live Classroom Session'}
                    </p>
                  )}
                </div>
              </Td>

              {/* Course Title & Code Pill */}
              <Td className="min-w-[180px] max-w-[240px]">
                <div className="min-w-0">
                  <p
                    className="truncate text-xs font-medium text-foreground"
                    title={row.courseTitle}
                  >
                    {row.courseTitle}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className="inline-block max-w-[170px] truncate rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-secondary-foreground border border-border/60"
                      title={row.courseCode}
                    >
                      {row.courseCode}
                    </span>
                  </div>
                </div>
              </Td>

              {/* Trainer */}
              <Td className="whitespace-nowrap w-[150px]">
                {(() => {
                  const resolvedTrainer =
                    row.trainerName && row.trainerName !== 'Assigned Trainer'
                      ? row.trainerName
                      : row.session.trainer
                        ? `${row.session.trainer.firstName || ''} ${row.session.trainer.lastName || ''}`.trim()
                        : row.trainerName || 'Assigned Trainer';

                  return (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground border border-border">
                        {getInitials(resolvedTrainer)}
                      </div>
                      <span
                        className="truncate text-xs font-medium text-secondary-foreground max-w-[110px]"
                        title={resolvedTrainer}
                      >
                        {resolvedTrainer}
                      </span>
                    </div>
                  );
                })()}
              </Td>

              {/* Status */}
              <Td className="whitespace-nowrap w-[130px]">
                {row.session.status === 'LIVE' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success border border-success/25">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                ) : (
                  <Badge variant={meta.variant} dot>
                    {meta.label}
                    {row.session.status !== 'CANCELLED' && present > 0
                      ? ` · ${present} present`
                      : ''}
                  </Badge>
                )}
              </Td>

              {/* Actions Column */}
              <Td className="text-right whitespace-nowrap pr-4">{extra ? extra(row) : null}</Td>
            </TableRow>
          );
        })
      )}
    </Table>
  );
}
