'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatSessionDateTime } from '@/lib/app-time';
import { usePermissions } from '@/lib/usePermissions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import type { ApiInPersonRound, ApiLiveSession, ApiVenue } from '@/lib/api/types';

export interface SessionScheduleInstance {
  sessionId: string;
  roundKey: string;
  roundNumber: number;
  roundLabel: string;
  venue: ApiVenue | null;
  branch: string;
  venueName: string;
  building?: string | null;
  capacity: number;
  bookedSeats: number;
  seatsLeft: number;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

interface InPersonSessionScheduleExplorerProps {
  courseId: string;
  planId: string;
  sessionIndex: number;
  sessionTitle: string;
  rounds: ApiInPersonRound[];
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function InPersonSessionScheduleExplorer({
  courseId,
  planId,
  sessionIndex,
  sessionTitle,
  rounds,
  loading = false,
  onRefresh,
  className,
}: InPersonSessionScheduleExplorerProps) {
  const { isAmharic } = useTranslation('courses');
  const { can } = usePermissions();
  const schedulingHref = can('live_session.manage_all')
    ? '/training-admin/sessions'
    : '/trainer/sessions';

  const [selectedRound, setSelectedRound] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Extract all instances of THIS specific classroom session across every round and branch venue
  const instances = useMemo<SessionScheduleInstance[]>(() => {
    return rounds.flatMap((round) => {
      // Find the session in this round matching this planned session
      const matchingSession = round.sessions.find(
        (s, idx) =>
          (s.originalPlanId && s.originalPlanId === planId) ||
          (s.sessionPlanId && s.sessionPlanId === planId) ||
          (typeof s.plannedOrder === 'number' && s.plannedOrder === sessionIndex) ||
          idx === sessionIndex,
      );

      if (!matchingSession) return [];

      const venue = round.venue;
      const trainer = matchingSession.trainer || round.trainer || null;
      const capacity = venue?.capacity ?? round.capacity ?? 30;
      const booked = matchingSession.bookedSeats ?? round.bookedSeats ?? 0;

      return [
        {
          sessionId: matchingSession.id,
          roundKey: round.roundKey,
          roundNumber: round.roundNumber,
          roundLabel: round.roundLabel,
          venue,
          branch: venue?.branch || 'Branch Venue',
          venueName: venue?.name || 'Classroom Venue',
          building: venue?.building,
          capacity,
          bookedSeats: booked,
          seatsLeft: Math.max(0, capacity - booked),
          scheduledAt: matchingSession.scheduledAt,
          durationMinutes: matchingSession.durationMinutes,
          status: matchingSession.status,
          trainer,
        },
      ];
    });
  }, [rounds, planId, sessionIndex]);

  // Derive available filter options for this specific session
  const availableRounds = useMemo(() => {
    const roundNums = Array.from(new Set(instances.map((i) => i.roundNumber)));
    return roundNums.sort((a, b) => a - b);
  }, [instances]);

  const availableBranches = useMemo(() => {
    const branches = Array.from(new Set(instances.map((i) => i.branch)));
    return branches.sort((a, b) => a.localeCompare(b));
  }, [instances]);

  // Apply active round and branch filters
  const filteredInstances = useMemo(() => {
    return instances.filter((inst) => {
      const matchRound =
        selectedRound === 'ALL' || String(inst.roundNumber) === selectedRound;
      const matchBranch =
        selectedBranch === 'ALL' || inst.branch === selectedBranch;
      return matchRound && matchBranch;
    });
  }, [instances, selectedRound, selectedBranch]);

  const hasActiveFilters = selectedRound !== 'ALL' || selectedBranch !== 'ALL';

  const clearFilters = () => {
    setSelectedRound('ALL');
    setSelectedBranch('ALL');
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border/90 bg-card shadow-xs space-y-4',
        className,
      )}
    >
      {/* Explorer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-warning-soft/70 via-card to-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Classroom Session {sessionIndex + 1} Schedules &amp; Branch Trainers
              </h3>
              {instances.length > 0 && (
                <Badge variant="amber" className="text-[10px] font-bold">
                  {instances.length} Scheduled {instances.length === 1 ? 'Venue' : 'Venues'} Across {availableRounds.length} {availableRounds.length === 1 ? 'Round' : 'Rounds'}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Showing physical branches, scheduled dates, and assigned trainers specifically for{' '}
              <strong className="text-secondary-foreground font-semibold">{sessionTitle}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              icon={<RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />}
              className="text-xs"
            >
              Refresh
            </Button>
          )}
          <Link
            href={schedulingHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            Session Scheduling
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Filter Controls Bar */}
        {instances.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground pr-1">
                <Filter className="h-3.5 w-3.5 text-primary" />
                Filter by:
              </span>

              {/* Branch Filter (First) */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="explorer-branch-select" className="text-[11px] font-medium text-muted-foreground">
                  Branch:
                </label>
                <select
                  id="explorer-branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs outline-none transition focus:border-ring focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="ALL">All Branches ({availableBranches.length})</option>
                  {availableBranches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Round Filter (Second) */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="explorer-round-select" className="text-[11px] font-medium text-muted-foreground">
                  Round:
                </label>
                <select
                  id="explorer-round-select"
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs outline-none transition focus:border-ring focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="ALL">All Rounds ({availableRounds.length})</option>
                  {availableRounds.map((r) => (
                    <option key={r} value={String(r)}>
                      Round {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-danger transition"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>

            <span className="text-[11px] font-semibold text-primary">
              Showing {filteredInstances.length} of {instances.length} branch schedule{instances.length === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {/* Content list */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading Classroom Session {sessionIndex + 1} branch schedules…
          </div>
        ) : instances.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
            <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <h4 className="text-sm font-bold text-foreground">
              Classroom Session {sessionIndex + 1} is Not Scheduled Yet
            </h4>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              This classroom session has not been scheduled at any branch venue or cohort round. Use the Session Scheduling page to schedule rounds and assign branch trainers.
            </p>
            <div className="mt-4 flex justify-center">
              <Link
                href={schedulingHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                Schedule Session &amp; Assign Branch Trainers
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
            <p>No branch schedules found matching the selected round and branch filters.</p>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 text-primary">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredInstances.map((inst) => {
              const trainer = inst.trainer;
              const venue = inst.venue;

              return (
                <div
                  key={`${inst.roundKey}-${inst.sessionId}`}
                  className="flex flex-col justify-between rounded-xl border border-border/90 bg-card p-4 shadow-2xs space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Round & Branch Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shrink-0">
                            {inst.roundLabel}
                          </span>
                          <span className="truncate text-xs font-bold text-foreground">
                            {inst.branch} · {inst.venueName}
                          </span>
                        </div>
                        {inst.building && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0 text-subtle-foreground" />
                            <span className="truncate">{inst.building}</span>
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground shrink-0">
                        <Users className="h-3 w-3" />
                        {inst.capacity} seats ({inst.bookedSeats} booked)
                      </span>
                    </div>

                    {/* Scheduled Date & Time for THIS session */}
                    <div className="rounded-lg border border-border/80 bg-muted/30 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Classroom Schedule
                            </p>
                            <p className="truncate text-xs font-bold text-foreground">
                              {formatSessionDateTime(
                                inst.scheduledAt,
                                isAmharic ? 'am-ET' : undefined,
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="rounded bg-primary-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                            {inst.durationMinutes} min
                          </span>
                          <p className="mt-0.5 text-[9px] uppercase font-bold text-emerald-600">
                            {inst.status}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Assigned In-Person Branch Trainer for THIS branch */}
                    <div className="rounded-lg border border-border/80 bg-muted/30 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                              trainer
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-warning/15 text-warning',
                            )}
                          >
                            {trainer ? (
                              <UserCheck className="h-4 w-4" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Branch Trainer
                            </p>
                            <p className="truncate text-xs font-bold text-foreground">
                              {trainer
                                ? `${trainer.firstName} ${trainer.lastName}`
                                : 'No branch trainer assigned'}
                            </p>
                          </div>
                        </div>
                        {trainer ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success shrink-0">
                            <Check className="h-3 w-3" />
                            Assigned
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-warning shrink-0">
                            Pending
                          </span>
                        )}
                      </div>
                      {trainer?.email && (
                        <p className="mt-1 pl-9 text-[11px] text-muted-foreground truncate">
                          {trainer.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Branch Venue:{' '}
                      <strong className="text-secondary-foreground font-semibold">
                        {inst.branch}
                      </strong>
                    </span>
                    <Link
                      href={schedulingHref}
                      className="font-semibold text-primary hover:text-primary/80"
                    >
                      Manage Schedule
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

