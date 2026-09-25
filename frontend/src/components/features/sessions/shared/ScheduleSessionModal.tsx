"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Video,
  Sparkles,
  Building2,
  ArrowRight,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import type { Course } from "@/types";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { ApiError } from "@/lib/api/client";
import { scheduleSession } from "@/lib/api/monitoring";
import { fetchTrainers } from "@/lib/api/users";
import { createBatchLiveSessions, fetchVenues } from "@/lib/api/venues";
import type { ApiUser, ApiVenue, SessionType } from "@/lib/api/types";
import { SearchableCourseSelect } from "./SearchableCourseSelect";
import { SearchableTrainerSelect } from "./SearchableTrainerSelect";
import {
  VenueAllocationStep,
  createVenueRow,
  type InPersonVenueRow,
  type VenueRowDefaults,
} from "../in-person/VenueAllocationStep";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ScheduleSessionModalProps {
  open: boolean;
  onClose: () => void;
  onScheduled?: () => void;
  courses: Course[];
}

type PlatformChoice = "LIVEKIT" | "JITSI" | "GOOGLE_MEET" | "ZOOM" | "BIGBLUEBUTTON" | "MS_TEAMS" | "CUSTOM";

export function ScheduleSessionModal({
  open,
  onClose,
  onScheduled,
  courses,
}: ScheduleSessionModalProps) {
  // Session type: VIRTUAL vs IN_PERSON
  const [sessionType, setSessionType] = useState<SessionType>("VIRTUAL");
  const [inPersonStep, setInPersonStep] = useState<1 | 2>(1);

  // Common Fields
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState("");
  const [availableTrainers, setAvailableTrainers] = useState<ApiUser[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);

  // Virtual Session Fields
  const [platformType, setPlatformType] = useState<PlatformChoice>("LIVEKIT");
  const [titleEn, setTitleEn] = useState("");
  const [titleAm, setTitleAm] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [externalUrl, setExternalUrl] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");
  const [allowViewAttendance, setAllowViewAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // In-Person Venue Allocation Rows (Step 2)
  const [venueRows, setVenueRows] = useState<InPersonVenueRow[]>([]);

  // Sync courseId when courses load
  useEffect(() => {
    if (!courseId && courses.length > 0 && courses[0]?.id) {
      setCourseId(courses[0].id);
    }
  }, [courses, courseId]);

  // Load qualified trainers and active venues when modal opens
  useEffect(() => {
    if (!open) return;
    setTrainersLoading(true);
    setVenuesLoading(true);

    fetchTrainers()
      .then((res) => {
        setAvailableTrainers(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load trainers for session schedule:", err);
        setAvailableTrainers([]);
      })
      .finally(() => setTrainersLoading(false));

    fetchVenues({ isActive: true })
      .then((vList) => {
        setVenues(vList);
      })
      .catch((err) => {
        console.error("Failed to load venues:", err);
        setVenues([]);
      })
      .finally(() => setVenuesLoading(false));
  }, [open]);

  // When courseId changes, auto-select trainer & align sessionType with course.deliveryMode
  const selectedCourse = courses.find((c) => c.id === courseId);
  useEffect(() => {
    if (selectedCourse?.trainerId) {
      setTrainerId(selectedCourse.trainerId);
    }
    if (selectedCourse?.deliveryMode === "IN_PERSON_ONLY") {
      setSessionType("IN_PERSON");
    } else if (selectedCourse?.deliveryMode === "ONLINE_ONLY") {
      setSessionType("VIRTUAL");
    }
  }, [courseId, selectedCourse]);

  const courseTrainerIds = new Set(
    [selectedCourse?.trainerId, ...(selectedCourse?.trainerIds || [])].filter(Boolean) as string[],
  );

  const courseTrainers = availableTrainers.filter((t) => courseTrainerIds.has(t.id));

  // New venue rows start from the step-1 schedule and the course's trainer (if qualified).
  const venueRowDefaults: VenueRowDefaults = {
    date,
    time,
    duration,
    fallbackTrainerId:
      (selectedCourse?.trainerId && courseTrainers.length > 0 ? selectedCourse.trainerId : "") ||
      availableTrainers[0]?.id ||
      "",
  };

  const generateJitsiUrl = () => {
    const course = courses.find((c) => c.id === courseId);
    const code = (course?.code || "TRAINING").replace(/[^a-zA-Z0-9]/g, "");
    return `https://meet.jit.si/MoR-LMS-${code}-${Math.random().toString(36).substring(2, 8)}`;
  };

  const handlePlatformChange = (val: PlatformChoice) => {
    setPlatformType(val);
    if (val === "LIVEKIT") {
      setExternalUrl("");
    } else if (val === "JITSI") {
      setExternalUrl(generateJitsiUrl());
    } else if (val === "BIGBLUEBUTTON") {
      setExternalUrl("https://demo.bigbluebutton.org/gl/");
    } else if (val === "GOOGLE_MEET") {
      setExternalUrl("https://meet.google.com/new");
    } else {
      setExternalUrl("");
    }
  };

  useEffect(() => {
    if (open && platformType === "JITSI" && !externalUrl) {
      setExternalUrl(generateJitsiUrl());
    }
  }, [open, platformType, courseId]);

  // In-Person Navigation
  const handleProceedToVenues = () => {
    setError(null);
    if (!courseId) {
      setError("Please select a course for this session.");
      return;
    }
    if (!titleEn.trim()) {
      setError("Please enter a session title in English.");
      return;
    }

    // Initialize venue rows if empty
    if (venueRows.length === 0) {
      setVenueRows([createVenueRow(venues[0], availableTrainers, venueRowDefaults, 1)]);
    }

    setInPersonStep(2);
  };

  // Submit Handler for Virtual Live Session
  const handleVirtualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!courseId) {
      setError("Please select a course for this session.");
      return;
    }
    if (!trainerId) {
      setError("Please assign a qualified trainer to host this session.");
      return;
    }

    setSubmitting(true);
    try {
      let backendPlatform: "LIVEKIT" | "ZOOM" | "GOOGLE_MEET" | "MS_TEAMS" | "CUSTOM" = "LIVEKIT";
      if (platformType === "LIVEKIT") backendPlatform = "LIVEKIT";
      else if (platformType === "ZOOM") backendPlatform = "ZOOM";
      else if (platformType === "GOOGLE_MEET") backendPlatform = "GOOGLE_MEET";
      else if (platformType === "MS_TEAMS") backendPlatform = "MS_TEAMS";
      else backendPlatform = "CUSTOM";

      let meetingId: string | undefined = undefined;
      if (platformType === "BIGBLUEBUTTON") {
        meetingId = `bbb-${Date.now()}`;
      }

      await scheduleSession(courseId, {
        titleEn: titleEn.trim(),
        titleAm: titleAm.trim() || titleEn.trim(),
        descriptionEn: descriptionEn.trim() || undefined,
        trainerId: trainerId || undefined,
        platform: backendPlatform,
        externalUrl: externalUrl.trim() || undefined,
        meetingId,
        meetingPassword: meetingPassword.trim() || undefined,
        scheduledAt: new Date(`${date}T${time}`).toISOString(),
        durationMinutes: Number(duration),
        allowViewAttendance,
      });

      toast.success("Virtual live session scheduled successfully!");
      resetForm();
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to schedule the session.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handler for In-Person Multi-Venue Session
  const handleInPersonSubmit = async () => {
    setError(null);
    if (!courseId) {
      setError("Please select a course.");
      return;
    }
    if (!titleEn.trim()) {
      setError("Please enter a session title.");
      return;
    }
    if (venueRows.length === 0) {
      setError("At least one physical training venue allocation is required.");
      return;
    }

    // Validate rows
    for (let i = 0; i < venueRows.length; i++) {
      const row = venueRows[i];
      if (!row.venueId) {
        setError(`Row #${i + 1}: Please select a physical classroom venue.`);
        return;
      }
      if (!row.trainerId) {
        setError(`Row #${i + 1}: Please assign an instructor for this venue.`);
        return;
      }
      if (!row.date || !row.time) {
        setError(`Row #${i + 1}: Please specify date and time.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payloadSessions = venueRows.map((r) => ({
        venueId: r.venueId,
        trainerId: r.trainerId || undefined,
        scheduledAt: new Date(`${r.date}T${r.time}`).toISOString(),
        durationMinutes: Number(r.duration),
      }));

      await createBatchLiveSessions({
        courseId,
        titleEn: titleEn.trim(),
        titleAm: titleAm.trim() || titleEn.trim(),
        descriptionEn: descriptionEn.trim() || undefined,
        venueSessions: payloadSessions,
      });

      toast.success(
        `Successfully created ${venueRows.length} in-person sessions across assigned branch venues!`,
      );
      resetForm();
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create in-person sessions.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitleEn("");
    setTitleAm("");
    setDescriptionEn("");
    setTrainerId("");
    setExternalUrl("");
    setMeetingPassword("");
    setVenueRows([]);
    setInPersonStep(1);
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={
        sessionType === "IN_PERSON"
          ? `Schedule In-Person Training Session ${inPersonStep === 2 ? "— Venue Allocation (Step 2/2)" : "— Basic Details (Step 1/2)"}`
          : "Schedule Live Training Session"
      }
      subtitle={
        sessionType === "IN_PERSON"
          ? "Configure physical classroom venues, seat capacities, and branch instructors across the Ministry."
          : "Schedule an interactive virtual classroom or live webinar with automated attendance tracking."
      }
    >
      <div className="w-full py-4">
        {/* ── Delivery Mode Tabs ── */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200/90 bg-slate-50/80 p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setSessionType("VIRTUAL");
              setInPersonStep(1);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition",
              sessionType === "VIRTUAL"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            <Video className="h-4 w-4" />
            <span>Virtual Live Session (LiveKit / Web Video)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSessionType("IN_PERSON");
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition",
              sessionType === "IN_PERSON"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            <Building2 className="h-4 w-4" />
            <span>In-Person Classroom Session (Physical Venues)</span>
          </button>
        </div>

        {/* Course delivery mode advisory badge */}
        {selectedCourse ? (
          <div className="mb-4 flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Course Delivery Setting:</span>
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                selectedCourse.deliveryMode === "ONLINE_ONLY" && "bg-sky-50 text-sky-700 border-sky-200",
                selectedCourse.deliveryMode === "IN_PERSON_ONLY" && "bg-amber-50 text-amber-700 border-amber-200",
                selectedCourse.deliveryMode === "BOTH" && "bg-emerald-50 text-emerald-700 border-emerald-200",
              )}
            >
              {selectedCourse.deliveryMode === "ONLINE_ONLY"
                ? "🌐 Online Only"
                : selectedCourse.deliveryMode === "IN_PERSON_ONLY"
                  ? "🏢 In-Person Only"
                  : "🔄 Flexible (Online & In-Person)"}
            </Badge>
          </div>
        ) : null}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* VIRTUAL SESSION FLOW (EXISTING LIVEKIT/VIDEO PLATFORMS)      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {sessionType === "VIRTUAL" ? (
          <form onSubmit={handleVirtualSubmit} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            {/* Searchable Course Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Course (Search &amp; Select) *
              </label>
              <SearchableCourseSelect
                courses={courses}
                value={courseId}
                onChange={(selectedId) => {
                  setCourseId(selectedId);
                  if (platformType === "JITSI") {
                    const code = (courses.find((c) => c.id === selectedId)?.code || "TRAINING").replace(/[^a-zA-Z0-9]/g, "");
                    setExternalUrl(`https://meet.jit.si/MoR-LMS-${code}-${Math.random().toString(36).substring(2, 8)}`);
                  }
                }}
              />
            </div>

            {/* Searchable Assigned Trainer Selection */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  Assigned Trainer (Instructor &amp; Host) *
                </label>
                {trainersLoading ? (
                  <span className="text-[11px] font-medium text-indigo-600 animate-pulse">Loading trainers…</span>
                ) : availableTrainers.length > 0 ? (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {availableTrainers.length} qualified trainers available
                  </span>
                ) : null}
              </div>

              <SearchableTrainerSelect
                trainers={availableTrainers}
                courseTrainers={courseTrainers}
                value={trainerId}
                onChange={setTrainerId}
                loading={trainersLoading}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Session Title (English) *
              </label>
              <input
                required
                value={titleEn}
                onChange={(event) => setTitleEn(event.target.value)}
                placeholder="e.g. Interactive Q&A: Tax Code Fundamentals"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Session Title (አማርኛ)
              </label>
              <input
                value={titleAm}
                onChange={(event) => setTitleAm(event.target.value)}
                placeholder="e.g. የቀጥታ የጥያቄና መልስ ክፍለ ጊዜ"
                className={inputClass}
              />
            </div>

            <div>
              <RichTextArea
                label="Session Description & Agenda (Interactive Rich Text)"
                placeholder="Outline objectives, key discussion topics, required preparation, or session notes…"
                value={descriptionEn}
                onChange={setDescriptionEn}
                rows={3}
              />
            </div>

            {/* Video Platform Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Virtual Classroom Platform
              </label>
              <select
                value={platformType}
                onChange={(e) => handlePlatformChange(e.target.value as PlatformChoice)}
                className={inputClass}
              >
                <option value="LIVEKIT">⚡ LiveKit (Native In-App WebRTC Classroom)</option>
                <option value="JITSI">🎥 Jitsi Meet (Open-Source / Instant Web Video)</option>
                <option value="BIGBLUEBUTTON">🏛️ BigBlueButton (Dedicated Virtual Classroom)</option>
                <option value="GOOGLE_MEET">🟢 Google Meet</option>
                <option value="ZOOM">🔵 Zoom Meetings</option>
                <option value="MS_TEAMS">🟣 Microsoft Teams</option>
                <option value="CUSTOM">🔗 Other Custom URL</option>
              </select>
            </div>

            {/* Platform URL & Generator */}
            {platformType === "LIVEKIT" ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Native In-LMS LiveKit Room</span>
                </div>
                <p className="text-indigo-700">
                  Participants join directly in the ELTMS workspace with native WebRTC audio, video, screen sharing, and automated attendance tracking.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Meeting URL {platformType === "JITSI" ? "(Auto-generated)" : ""}
                  </label>
                  {platformType === "JITSI" && (
                    <button
                      type="button"
                      onClick={() => setExternalUrl(generateJitsiUrl())}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition"
                    >
                      <RefreshCw className="h-3 w-3" />
                      New room code
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  required={platformType !== "CUSTOM"}
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://meet.jit.si/..."
                  className={inputClass}
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Date *</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Start Time *</label>
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Duration (min) *</label>
                <input
                  required
                  type="number"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Room Passcode (Optional)
              </label>
              <input
                type="text"
                value={meetingPassword}
                onChange={(event) => setMeetingPassword(event.target.value)}
                placeholder="e.g. 849201"
                className={inputClass}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <p className="text-xs font-bold text-slate-800">Live Session Attendance Policy</p>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={allowViewAttendance}
                  onChange={(e) => setAllowViewAttendance(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Permit participants to view attendees and attendance modal for this session</span>
              </label>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Scheduling…" : "Schedule Live Session"}
              </Button>
            </div>
          </form>
        ) : null}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* IN-PERSON SESSION FLOW (2-STEP MULTI-VENUE BATCH SCHEDULER)   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {sessionType === "IN_PERSON" && inPersonStep === 1 ? (
          <div className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="rounded-xl bg-indigo-50/80 border border-indigo-100 p-3.5 flex items-center gap-3 text-xs text-indigo-900">
              <Building2 className="h-5 w-5 text-indigo-600 shrink-0" />
              <div>
                <p className="font-bold">Step 1: In-Person Session Basic Details</p>
                <p className="text-indigo-700 text-[11px]">
                  Fill in the course, title, and default schedule. In Step 2, you will allocate physical classrooms and instructors across MoR branch venues.
                </p>
              </div>
            </div>

            {/* Course Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Course (Search &amp; Select) *
              </label>
              <SearchableCourseSelect
                courses={courses}
                value={courseId}
                onChange={setCourseId}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Session Title (English) *
              </label>
              <input
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Practical Tax Auditing & Declaration Lab"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Session Title (አማርኛ)
              </label>
              <input
                value={titleAm}
                onChange={(e) => setTitleAm(e.target.value)}
                placeholder="e.g. የግብር ኦዲት የተግባር ልምምድ"
                className={inputClass}
              />
            </div>

            <div>
              <RichTextArea
                label="Session Description & Practical Agenda"
                placeholder="List classroom requirements, materials learners must bring, or lab agenda…"
                value={descriptionEn}
                onChange={setDescriptionEn}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Default Date *
                </label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Default Start Time *
                </label>
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Duration (min) *
                </label>
                <input
                  required
                  type="number"
                  min={15}
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            ) : null}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProceedToVenues}
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <span>Continue to Venue Allocation</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* IN-PERSON STEP 2: INTERACTIVE MULTI-VENUE ALLOCATION TABLE    */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {sessionType === "IN_PERSON" && inPersonStep === 2 ? (
          <VenueAllocationStep
            rows={venueRows}
            onRowsChange={setVenueRows}
            venues={venues}
            trainers={availableTrainers}
            defaults={venueRowDefaults}
            error={error}
            submitting={submitting}
            onBack={() => setInPersonStep(1)}
            onCancel={onClose}
            onSubmit={handleInPersonSubmit}
          />
        ) : null}
      </div>
    </WorkspaceDetailOverlay>
  );
}