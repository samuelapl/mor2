"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
  X,
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
import {
  fetchCourseRounds,
  scheduleInPersonRound,
  scheduleMultiBranchRounds,
} from "@/lib/api/venues";
import { fetchTrainers } from "@/lib/api/users";
import {
  appDateTimeToIso,
  appToday,
  formatSessionDate,
  formatSessionTime,
} from "@/lib/app-time";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
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

  // Selected branch venues for multi-branch scheduling
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>(
    venues[0]?.id ? [venues[0].id] : [],
  );

  // Per-venue trainer assignment map: venueId -> trainerId
  const [venueTrainers, setVenueTrainers] = useState<Record<string, string>>({});
  // Per-venue branch trainers cache: venueId -> ApiUser[]
  const [venueBranchTrainers, setVenueBranchTrainers] = useState<
    Record<string, ApiUser[]>
  >({});
  const [loadingBranchTrainers, setLoadingBranchTrainers] = useState<
    Record<string, boolean>
  >({});

  const [sessionRows, setSessionRows] = useState<RoundSessionDraftRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal inspection of a session plan
  const [inspectedPlan, setInspectedPlan] = useState<ApiSessionPlan | null>(null);

  const nextRoundNumber =
    existingRounds.reduce((max, r) => Math.max(max, r.roundNumber), 0) + 1;

  // Initialize selected venue when venues load
  useEffect(() => {
    if (selectedVenueIds.length === 0 && venues.length > 0 && venues[0]?.id) {
      setSelectedVenueIds([venues[0].id]);
    }
  }, [venues, selectedVenueIds.length]);

  // Fetch branch-filtered trainers for a specific venue
  const loadTrainersForVenue = async (targetVenueId: string) => {
    if (!targetVenueId || venueBranchTrainers[targetVenueId]) return;
    setLoadingBranchTrainers((prev) => ({ ...prev, [targetVenueId]: true }));
    try {
      const res = await fetchTrainers({
        deliveryType: "IN_PERSON",
        venueId: targetVenueId,
      });
      const list = res.data || [];
      setVenueBranchTrainers((prev) => ({ ...prev, [targetVenueId]: list }));
      // Set default assigned trainer for this venue if none assigned
      setVenueTrainers((prev) => {
        if (!prev[targetVenueId] && list.length > 0) {
          return { ...prev, [targetVenueId]: list[0].id };
        }
        return prev;
      });
    } catch {
      // Fallback
    } finally {
      setLoadingBranchTrainers((prev) => ({ ...prev, [targetVenueId]: false }));
    }
  };

  // Pre-load branch trainers for all selected venues
  useEffect(() => {
    for (const vId of selectedVenueIds) {
      void loadTrainersForVenue(vId);
    }
  }, [selectedVenueIds]);

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
      setSessionRows(buildRowsFromPlans(plans, defaultTrainerId));
    } finally {
      setLoadingCourseData(false);
    }
  };

  useEffect(() => {
    void loadCourseRoundContext(courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const toggleVenueSelection = (venueId: string) => {
    setSelectedVenueIds((prev) => {
      if (prev.includes(venueId)) {
        return prev.filter((id) => id !== venueId);
      }
      return [...prev, venueId];
    });
  };

  const handleSelectAllVenues = () => {
    setSelectedVenueIds(venues.map((v) => v.id));
  };

  const handleDeselectAllVenues = () => {
    setSelectedVenueIds([]);
  };

  const handleVenueTrainerChange = (venueId: string, trainerId: string) => {
    setVenueTrainers((prev) => ({ ...prev, [venueId]: trainerId }));
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
        trainerId: defaultTrainerId,
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
    if (selectedVenueIds.length === 0) {
      setError("Please select at least one physical branch venue.");
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
        setError(
          `Classroom Session #${i + 1}: Please select both date and start time.`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (selectedVenueIds.length === 1) {
        // Single Branch Scheduling
        const singleVenueId = selectedVenueIds[0];
        const assignedTrainer =
          venueTrainers[singleVenueId] || defaultTrainerId || undefined;

        const res = await scheduleInPersonRound({
          courseId,
          roundNumber: nextRoundNumber,
          venueId: singleVenueId,
          trainerId: assignedTrainer,
          sessions: sessionRows.map((row) => ({
            sessionPlanId: row.sessionPlanId,
            titleEn: row.titleEn.trim(),
            titleAm: row.titleEn.trim(),
            descriptionEn: row.descriptionEn.trim() || undefined,
            objectivesEn: row.objectivesEn.trim() || undefined,
            trainerId: row.trainerId || assignedTrainer,
            scheduledAt: appDateTimeToIso(row.date, row.time),
            durationMinutes: Number(row.durationMinutes) || 120,
          })),
        });

        toast.success(
          `Round ${res.roundNumber} scheduled with ${res.count} classroom session(s)!`,
        );
      } else {
        // Multi-Branch Round Scheduling across selected venues:
        // Each selected branch hosts this same round (e.g. Round 1, Round 2)
        const branchAllocations = selectedVenueIds.map((vId) => {
          const assignedTrainer =
            venueTrainers[vId] || defaultTrainerId || undefined;
          return {
            venueId: vId,
            trainerId: assignedTrainer,
            roundNumber: nextRoundNumber,
            sessions: sessionRows.map((row) => ({
              sessionPlanId: row.sessionPlanId,
              titleEn: row.titleEn.trim(),
              titleAm: row.titleEn.trim(),
              descriptionEn: row.descriptionEn.trim() || undefined,
              objectivesEn: row.objectivesEn.trim() || undefined,
              trainerId: assignedTrainer,
              scheduledAt: appDateTimeToIso(row.date, row.time),
              durationMinutes: Number(row.durationMinutes) || 120,
            })),
          };
        });

        const res = await scheduleMultiBranchRounds({
          courseId,
          branches: branchAllocations,
        });

        toast.success(
          `Successfully scheduled Round ${nextRoundNumber} across ${selectedVenueIds.length} branch venue(s)!`,
        );
      }

      onInvalidateSessions();
      onScheduled?.(courseId);

      if (keepOpenForNextRound) {
        await loadCourseRoundContext(courseId);
      } else {
        onCancel();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to schedule In-Person Round(s).",
      );
    } finally {
      setSubmitting(false);
    }
  };

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
                In-Person Multi-Branch Classroom Round Scheduler
              </h4>
              <Badge variant="amber" className="font-bold">
                Scheduling Round {nextRoundNumber}
                {selectedVenueIds.length > 1
                  ? ` (Across ${selectedVenueIds.length} Selected Branches)`
                  : ""}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select one or multiple physical branch venues to host Round {nextRoundNumber}.
              Each branch will host Round {nextRoundNumber} with its own assigned in-person trainer.
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

      {/* Existing Rounds Summary */}
      {existingRounds.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Already Scheduled Rounds ({existingRounds.length})
            </span>
            <span className="text-[11px] font-semibold text-primary">
              Next round number: {nextRoundNumber}
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
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2"
                    >
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

      {/* Multi-Branch Venue Selection Chips */}
      <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Select Branch Venues to Host Round {nextRoundNumber} *
            </label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Every selected branch venue will host Round {nextRoundNumber} with its own assigned branch trainer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllVenues}
              className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-muted transition"
            >
              Select All Branches ({venues.length})
            </button>
            <button
              type="button"
              onClick={handleDeselectAllVenues}
              className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-danger transition"
            >
              Clear Selection
            </button>
            <span className="text-xs font-bold text-primary pl-1">
              {selectedVenueIds.length} of {venues.length} selected
            </span>
          </div>
        </div>

        {venuesLoading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Loading branch venues…
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((v) => {
              const isSelected = selectedVenueIds.includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVenueSelection(v.id)}
                  className={cn(
                    "relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-card ring-2 ring-primary/20 shadow-xs"
                      : "border-border/80 bg-card/60 hover:bg-card hover:border-input text-muted-foreground",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground truncate">
                        {v.branch}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {v.name}
                      </div>
                      {v.building && (
                        <div className="text-[10px] text-subtle-foreground truncate">
                          {v.building}
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                        isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-input bg-card",
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-secondary-foreground">
                      Capacity: {v.capacity} seats
                    </span>
                    {isSelected && (
                      <span className="text-indigo-600 font-bold">Selected</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Venues & Per-Branch In-Person Trainer Assignments */}
      {selectedVenueIds.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            Branch Trainer Assignments (Filtered by Branch Venue)
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedVenueIds.map((vId, idx) => {
              const v = venues.find((x) => x.id === vId);
              const branchTrainers = venueBranchTrainers[vId] || [];
              const isLoadingTrainers = loadingBranchTrainers[vId] ?? false;
              const assignedTrainerId = venueTrainers[vId] || "";

              return (
                <div
                  key={vId}
                  className="rounded-xl border border-border/90 bg-card p-3 text-xs space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Round {nextRoundNumber}
                      </span>
                      <span>{v?.branch || "Branch"} · {v?.name}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {v?.capacity} seats
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                      Assigned In-Person Trainer *
                    </label>
                    {isLoadingTrainers ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground py-1.5">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        Fetching branch trainers…
                      </div>
                    ) : branchTrainers.length > 0 ? (
                      <select
                        value={assignedTrainerId}
                        onChange={(e) =>
                          handleVenueTrainerChange(vId, e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="">Select branch trainer…</option>
                        {branchTrainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} ({t.email})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={assignedTrainerId}
                          onChange={(e) =>
                            handleVenueTrainerChange(vId, e.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Select general trainer…</option>
                          {trainers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.firstName} {t.lastName} ({t.email})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-warning">
                          No in-person trainers registered specifically for {v?.branch}. Selected general trainer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Classroom Sessions inside this Round */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Classroom Session Schedule Template ({sessionRows.length})
            </h5>
            <p className="text-[11px] text-muted-foreground">
              {plannedSessions.length > 0
                ? `Loaded ${plannedSessions.length} planned classroom session(s) from course preparation.`
                : "Configure the classroom sessions that learners in each branch round will attend."}
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
            {sessionRows.map((row, idx) => {
              const matchingPlan = plannedSessions.find(
                (p) => p.id === row.sessionPlanId,
              );

              return (
                <div
                  key={row.key}
                  className="rounded-xl border border-border/90 bg-card p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                      {matchingPlan && (
                        <button
                          type="button"
                          onClick={() => setInspectedPlan(matchingPlan)}
                          className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-muted/80 transition"
                          title="View Planned Session Details & Objectives"
                        >
                          <Info className="h-3 w-3" />
                          View Objectives &amp; Quizzes
                        </button>
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
              );
            })}
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
          {selectedVenueIds.length === 1 && (
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
                : `Schedule Round ${nextRoundNumber} & Add Next`}
            </Button>
          )}
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmitRound(false)}
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
          >
            <Building2 className="h-3.5 w-3.5" />
            {submitting
              ? "Scheduling…"
              : selectedVenueIds.length > 1
                ? `Schedule Round ${nextRoundNumber} (${selectedVenueIds.length} Branches, ${sessionRows.length} Sessions Each)`
                : `Schedule Round ${nextRoundNumber} (${sessionRows.length} Session${sessionRows.length === 1 ? "" : "s"})`}
          </Button>
        </div>
      </div>

      {/* Session Plan Detail Modal (ℹ️ Info Icon inspection) */}
      <Modal
        open={Boolean(inspectedPlan)}
        onClose={() => setInspectedPlan(null)}
        title={inspectedPlan?.titleEn || "Classroom Session Plan"}
        subtitle="Planned Session Curriculum &amp; Objectives"
        size="md"
      >
        {inspectedPlan && (
          <div className="space-y-4 text-xs text-secondary-foreground">
            <div>
              <span className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                Description
              </span>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {inspectedPlan.descriptionEn || "No description provided."}
              </p>
            </div>

            <div>
              <span className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                Learning Objectives
              </span>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {inspectedPlan.objectivesEn || "No learning objectives defined."}
              </p>
            </div>

            {inspectedPlan.quizzes && inspectedPlan.quizzes.length > 0 && (
              <div>
                <span className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                  Formative In-Session Quizzes ({inspectedPlan.quizzes.length})
                </span>
                <div className="mt-1.5 space-y-1.5">
                  {inspectedPlan.quizzes.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="rounded-lg border border-border bg-muted/40 p-2 text-[11px]"
                    >
                      <div className="font-semibold text-foreground">
                        {qIdx + 1}. {q.titleEn}
                      </div>
                      <div className="text-muted-foreground">
                        {q.questionCount ?? 0} question(s)
                        {q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min limit` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
