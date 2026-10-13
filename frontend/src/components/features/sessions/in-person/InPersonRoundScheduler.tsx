"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { Course } from "@/types";
import type {
  ApiInPersonRound,
  ApiSessionPlan,
  ApiUser,
  ApiVenue,
} from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { fetchSessionPlans } from "@/lib/api/session-plans";
import { fetchCourseRounds, scheduleInPersonRound } from "@/lib/api/venues";
import {
  appDateTimeToIso,
  appToday,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/app-time";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableCourseSelect } from "../shared/SearchableCourseSelect";
import { SearchableTrainerSelect } from "../shared/SearchableTrainerSelect";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export interface RoundSessionDraftRow {
  key: string;
  sessionPlanId?: string;
  titleEn: string;
  descriptionEn: string;
  objectivesEn: string;
  quizCount: number;
  trainerId: string;
  date: string;
  time: string;
  durationMinutes: number;
}

interface InPersonRoundSchedulerProps {
  courseId: string;
  onCourseChange: (courseId: string) => void;
  courses: Course[];
  venues: ApiVenue[];
  venuesLoading: boolean;
  trainers: ApiUser[];
  courseTrainers: ApiUser[];
  trainersLoading: boolean;
  canPickTrainer: boolean;
  defaultTrainerId: string;
  onCancel: () => void;
  onScheduled?: (courseId: string) => void;
  onInvalidateSessions: () => void;
}

export function InPersonRoundScheduler({
  courseId,
  onCourseChange,
  courses,
  venues,
  venuesLoading,
  trainers,
  courseTrainers,
  trainersLoading,
  canPickTrainer,
  defaultTrainerId,
  onCancel,
  onScheduled,
  onInvalidateSessions,
}: InPersonRoundSchedulerProps) {
  const [existingRounds, setExistingRounds] = useState<ApiInPersonRound[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<ApiSessionPlan[]>([]);
  const [loadingCourseData, setLoadingCourseData] = useState(false);

  const [venueId, setVenueId] = useState<string>(venues[0]?.id ?? "");
  const [roundTrainerId, setRoundTrainerId] = useState<string>(defaultTrainerId);
  const [sessionRows, setSessionRows] = useState<RoundSessionDraftRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextRoundNumber =
    existingRounds.reduce((max, r) => Math.max(max, r.roundNumber), 0) + 1;

  // Keep default venue synced when venues load
  useEffect(() => {
    if (!venueId && venues.length > 0 && venues[0]?.id) {
      setVenueId(venues[0].id);
    }
  }, [venues, venueId]);

  // Keep default trainer synced
  useEffect(() => {
    if (!roundTrainerId && defaultTrainerId) {
      setRoundTrainerId(defaultTrainerId);
    }
  }, [defaultTrainerId, roundTrainerId]);

  const buildRowsFromPlans = (
    plans: ApiSessionPlan[],
    fallbackTrainer: string,
  ): RoundSessionDraftRow[] => {
    if (plans.length > 0) {
      return plans.map((plan, idx) => ({
        key: `plan-${plan.id}-${idx}`,
        sessionPlanId: plan.id,
        titleEn: plan.titleEn || `Classroom session ${idx + 1}`,
        descriptionEn: plan.descriptionEn || "",
        objectivesEn: plan.objectivesEn || "",
        quizCount: plan.quizzes?.length ?? 0,
        trainerId: plan.trainerId || fallbackTrainer,
        date: appToday(idx + 1),
        time: "09:00",
        durationMinutes: 120,
      }));
    }
    return [
      {
        key: `custom-${Date.now()}-1`,
        titleEn: "Classroom session 1",
        descriptionEn: "",
        objectivesEn: "",
        quizCount: 0,
        trainerId: fallbackTrainer,
        date: appToday(1),
        time: "09:00",
        durationMinutes: 120,
      },
    ];
  };

  const loadCourseRoundContext = async (targetCourseId: string) => {
    if (!targetCourseId) return;
    setLoadingCourseData(true);
    setError(null);
    try {
      const [plans, rounds] = await Promise.all([
        fetchSessionPlans(targetCourseId).catch(() => [] as ApiSessionPlan[]),
        fetchCourseRounds(targetCourseId).catch(() => [] as ApiInPersonRound[]),
      ]);
      setPlannedSessions(plans);
      setExistingRounds(rounds);
      setSessionRows(buildRowsFromPlans(plans, roundTrainerId || defaultTrainerId));
    } finally {
      setLoadingCourseData(false);
    }
  };

  useEffect(() => {
    void loadCourseRoundContext(courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleVenueChange = (nextVenueId: string) => {
    setVenueId(nextVenueId);
    const affiliated = trainers.find(
      (t) => (t as any).primaryVenueId === nextVenueId,
    );
    if (affiliated && canPickTrainer) {
      setRoundTrainerId(affiliated.id);
      setSessionRows((prev) =>
        prev.map((row) => ({
          ...row,
          trainerId: row.trainerId || affiliated.id,
        })),
      );
    }
  };

  const handleRoundTrainerChange = (nextTrainerId: string) => {
    setRoundTrainerId(nextTrainerId);
    setSessionRows((prev) =>
      prev.map((row) => ({
        ...row,
        trainerId: nextTrainerId,
      })),
    );
  };

  const updateRow = (key: string, patch: Partial<RoundSessionDraftRow>) => {
    setSessionRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  };

  const addCustomSessionRow = () => {
    setSessionRows((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}-${prev.length + 1}`,
        titleEn: `Classroom session ${prev.length + 1}`,
        descriptionEn: "",
        objectivesEn: "",
        quizCount: 0,
        trainerId: roundTrainerId || defaultTrainerId,
        date: appToday(prev.length + 1),
        time: "09:00",
        durationMinutes: 120,
      },
    ]);
  };

  const removeSessionRow = (key: string) => {
    if (sessionRows.length <= 1) {
      toast.error("A Round must contain at least 1 classroom session.");
      return;
    }
    setSessionRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleSubmitRound = async (keepOpenForNextRound = false) => {
    setError(null);
    if (!courseId) {
      setError("Please select a course.");
      return;
    }
    if (!venueId) {
      setError("Please select a physical branch venue for this Round.");
      return;
    }
    if (sessionRows.length === 0) {
      setError("At least one classroom session is required in this Round.");
      return;
    }

    for (let i = 0; i < sessionRows.length; i++) {
      const row = sessionRows[i];
      if (!row.titleEn.trim()) {
        setError(`Classroom Session #${i + 1}: Please enter a session title.`);
        return;
      }
      if (!row.date || !row.time) {
        setError(`Classroom Session #${i + 1}: Please select both date and start time.`);
        return;
      }
      if (!row.trainerId && !roundTrainerId) {
        setError(`Classroom Session #${i + 1}: Please assign a trainer.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await scheduleInPersonRound({
        courseId,
        roundNumber: nextRoundNumber,
        venueId,
        trainerId: roundTrainerId || undefined,
        sessions: sessionRows.map((row) => ({
          sessionPlanId: row.sessionPlanId,
          titleEn: row.titleEn.trim(),
          titleAm: row.titleEn.trim(),
          descriptionEn: row.descriptionEn.trim() || undefined,
          objectivesEn: row.objectivesEn.trim() || undefined,
          trainerId: row.trainerId || roundTrainerId || undefined,
          scheduledAt: appDateTimeToIso(row.date, row.time),
          durationMinutes: Number(row.durationMinutes) || 120,
        })),
      });

      onInvalidateSessions();
      onScheduled?.(courseId);
      toast.success(
        `Round ${res.roundNumber} scheduled with ${res.count} classroom session(s)!`,
      );

      if (keepOpenForNextRound) {
        await loadCourseRoundContext(courseId);
      } else {
        onCancel();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to schedule In-Person Round.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVenue = venues.find((v) => v.id === venueId);
  const inputClass =
    "w-full rounded-xl border border-border/90 bg-card px-3.5 py-2 text-xs text-secondary-foreground shadow-2xs outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-2 focus:ring-ring/10";

  return (
    <div className="space-y-5 rounded-2xl border border-border/90 bg-card p-6 shadow-xs">
      {/* Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft/60 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                In-Person Classroom Round Scheduler
              </h4>
              <Badge variant="amber" className="font-bold">
                Scheduling Round {nextRoundNumber}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Each Round schedules the course&apos;s planned Classroom Sessions
              for a learner cohort at a physical branch venue. Schedule Round 1
              first, then add Round 2, Round 3, etc. as needed.
            </p>
          </div>
        </div>
      </div>

      {/* Course Selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
          Course (Search &amp; Select) *
        </label>
        <SearchableCourseSelect
          courses={courses}
          value={courseId}
          onChange={onCourseChange}
        />
      </div>

      {/* Existing Rounds Summary (Round 1, Round 2, ...) */}
      {existingRounds.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Already Scheduled Rounds ({existingRounds.length})
            </span>
            <span className="text-[11px] font-semibold text-primary">
              Next up: Round {nextRoundNumber}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {existingRounds.map((round) => (
              <div
                key={round.roundKey}
                className="rounded-lg border border-border/80 bg-card p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {round.roundLabel}
                    </span>
                    <span className="truncate">
                      {round.venue
                        ? `${round.venue.branch} · ${round.venue.name}`
                        : "Branch Venue"}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {round.sessions.length} session
                    {round.sessions.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                  {round.sessions.map((s, idx) => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {idx + 1}. {s.titleEn}
                      </span>
                      <span className="shrink-0">
                        {formatSessionDate(s.scheduledAt, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {formatSessionTime(s.scheduledAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Venue & Default Trainer Selection for This Round */}
      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-border/80 bg-muted/30 p-4">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Branch Venue for Round {nextRoundNumber} *
          </label>
          <select
            value={venueId}
            onChange={(e) => handleVenueChange(e.target.value)}
            disabled={venuesLoading}
            className={inputClass}
          >
            <option value="">Select physical branch venue…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.branch} — {v.name} ({v.capacity} seats)
              </option>
            ))}
          </select>
          {selectedVenue && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Capacity: <strong>{selectedVenue.capacity} seats</strong>
              {selectedVenue.building ? ` · ${selectedVenue.building}` : ""}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            Default Round Trainer *
          </label>
          {canPickTrainer ? (
            <SearchableTrainerSelect
              trainers={trainers}
              courseTrainers={courseTrainers}
              value={roundTrainerId}
              onChange={handleRoundTrainerChange}
              loading={trainersLoading}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">
              Assigned to you
            </div>
          )}
        </div>
      </div>

      {/* Classroom Sessions inside this Round */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Classroom Sessions in Round {nextRoundNumber} ({sessionRows.length})
            </h5>
            <p className="text-[11px] text-muted-foreground">
              {plannedSessions.length > 0
                ? `Loaded ${plannedSessions.length} planned classroom session(s) from course preparation.`
                : "Configure the classroom sessions that learners in this Round will attend."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomSessionRow}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Classroom Session
          </Button>
        </div>

        {loadingCourseData ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading planned classroom sessions…
          </div>
        ) : (
          <div className="space-y-3">
            {sessionRows.map((row, idx) => (
              <div
                key={row.key}
                className="rounded-xl border border-border/90 bg-card p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-warning-soft text-xs font-bold text-warning">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      Classroom Session {idx + 1}
                    </span>
                    {row.sessionPlanId && (
                      <span className="rounded-full border border-info/30 bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">
                        Planned in Course
                      </span>
                    )}
                    {row.quizCount > 0 && (
                      <span className="rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {row.quizCount} Formative Quiz{row.quizCount === 1 ? "" : "zes"}
                      </span>
                    )}
                  </div>
                  {sessionRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSessionRow(row.key)}
                      className="rounded p-1 text-subtle-foreground hover:bg-danger-soft hover:text-danger transition"
                      title="Remove classroom session from round"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      Classroom Session Title *
                    </label>
                    <input
                      type="text"
                      value={row.titleEn}
                      onChange={(e) =>
                        updateRow(row.key, { titleEn: e.target.value })
                      }
                      placeholder={`Classroom session ${idx + 1}`}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Date *
                    </label>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) =>
                        updateRow(row.key, { date: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Time *
                      </label>
                      <input
                        type="time"
                        value={row.time}
                        onChange={(e) =>
                          updateRow(row.key, { time: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                        Min *
                      </label>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={row.durationMinutes}
                        onChange={(e) =>
                          updateRow(row.key, {
                            durationMinutes: Number(e.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {/* Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => void handleSubmitRound(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {submitting
              ? "Scheduling…"
              : `Schedule Round ${nextRoundNumber} & Add Round ${nextRoundNumber + 1}`}
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmitRound(false)}
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
          >
            <Building2 className="h-3.5 w-3.5" />
            {submitting
              ? "Scheduling…"
              : `Schedule Round ${nextRoundNumber} (${sessionRows.length} Session${sessionRows.length === 1 ? "" : "s"})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

