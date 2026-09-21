"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Sparkles, MonitorPlay, RefreshCw, UserCheck, CalendarDays } from "lucide-react";
import type { Course } from "@/types";
import type { ApiLiveSession, ApiUser } from "@/lib/api/types";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { ApiError } from "@/lib/api/client";
import { updateLiveSession } from "@/lib/api/monitoring";
import { fetchTrainers } from "@/lib/api/users";

interface EditSessionModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  session: ApiLiveSession | null;
  courses: Course[];
}

type PlatformChoice = "LIVEKIT" | "JITSI" | "GOOGLE_MEET" | "ZOOM" | "BIGBLUEBUTTON" | "MS_TEAMS" | "CUSTOM";

export function EditSessionModal({
  open,
  onClose,
  onUpdated,
  session,
  courses,
}: EditSessionModalProps) {
  const [trainerId, setTrainerId] = useState("");
  const [availableTrainers, setAvailableTrainers] = useState<ApiUser[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [platformType, setPlatformType] = useState<PlatformChoice>("LIVEKIT");
  const [titleEn, setTitleEn] = useState("");
  const [titleAm, setTitleAm] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<"SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  const [externalUrl, setExternalUrl] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");
  const [allowViewAttendance, setAllowViewAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prepopulate form when session changes
  useEffect(() => {
    if (!session || !open) return;
    setTitleEn(session.titleEn || "");
    setTitleAm(session.titleAm || "");
    setDescriptionEn(session.descriptionEn || "");
    setTrainerId(session.trainerId || session.trainer?.id || "");
    setDuration(session.durationMinutes || 60);
    setStatus(session.status);
    setExternalUrl(session.externalUrl || "");
    setMeetingPassword(session.meetingPassword || "");
    setAllowViewAttendance(Boolean((session as any).allowViewAttendance));

    // Map platform
    const p = session.platform?.toUpperCase();
    if (p === "LIVEKIT") setPlatformType("LIVEKIT");
    else if (p === "ZOOM") setPlatformType("ZOOM");
    else if (p === "GOOGLE_MEET") setPlatformType("GOOGLE_MEET");
    else if (p === "MS_TEAMS") setPlatformType("MS_TEAMS");
    else if (session.externalUrl?.includes("meet.jit.si") || session.externalUrl?.includes("jitsi")) setPlatformType("JITSI");
    else if (session.externalUrl?.includes("bigbluebutton") || session.meetingId?.startsWith("bbb-")) setPlatformType("BIGBLUEBUTTON");
    else setPlatformType("CUSTOM");

    // Parse date and time
    if (session.scheduledAt) {
      const d = new Date(session.scheduledAt);
      if (!isNaN(d.getTime())) {
        setDate(d.toISOString().split("T")[0]);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setTime(`${hh}:${mm}`);
      }
    }
    setError(null);
  }, [session, open]);

  // Load qualified trainers when modal opens
  useEffect(() => {
    if (!open) return;
    setTrainersLoading(true);
    fetchTrainers()
      .then((res) => {
        setAvailableTrainers(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load trainers for session update:", err);
        setAvailableTrainers([]);
      })
      .finally(() => setTrainersLoading(false));
  }, [open]);

  if (!session) return null;

  const currentCourse = courses.find((c) => c.id === session.courseId);
  const courseTrainerIds = new Set(
    [currentCourse?.trainerId, ...(currentCourse?.trainerIds || [])].filter(Boolean) as string[],
  );

  const courseTrainers = availableTrainers.filter((t) => courseTrainerIds.has(t.id));
  const otherTrainers = availableTrainers.filter((t) => !courseTrainerIds.has(t.id));

  const generateJitsiUrl = () => {
    const code = (currentCourse?.code || session.course?.code || "TRAINING").replace(/[^a-zA-Z0-9]/g, "");
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

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let backendPlatform: "LIVEKIT" | "ZOOM" | "GOOGLE_MEET" | "MS_TEAMS" | "CUSTOM" = "LIVEKIT";
      if (platformType === "LIVEKIT") backendPlatform = "LIVEKIT";
      else if (platformType === "ZOOM") backendPlatform = "ZOOM";
      else if (platformType === "GOOGLE_MEET") backendPlatform = "GOOGLE_MEET";
      else if (platformType === "MS_TEAMS") backendPlatform = "MS_TEAMS";
      else backendPlatform = "CUSTOM";

      const scheduledAtIso = date && time ? new Date(`${date}T${time}`).toISOString() : undefined;

      await updateLiveSession(session.id, {
        titleEn: titleEn.trim(),
        titleAm: titleAm.trim() || titleEn.trim(),
        descriptionEn: descriptionEn.trim() || undefined,
        trainerId: trainerId || undefined,
        platform: backendPlatform,
        externalUrl: externalUrl.trim() || undefined,
        meetingPassword: meetingPassword.trim() || undefined,
        scheduledAt: scheduledAtIso,
        durationMinutes: Number(duration),
        allowViewAttendance,
        ...(status ? { status: status as any } : {}),
      } as any);

      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update session details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title="Edit & Reschedule Live Session"
      subtitle={`Modify parameters, reschedule date/time, or reassign trainer for "${session.titleEn}".`}
    >
      <div className="w-full py-4">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          {/* Associated Course Display (Read-Only) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Course</p>
              <p className="text-sm font-bold text-slate-900">
                {currentCourse?.code || session.course?.code} — {currentCourse?.title || session.course?.titleEn}
              </p>
            </div>
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {session.platform}
            </span>
          </div>

          {/* Assigned Trainer Selection */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
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

            <select
              required
              value={trainerId}
              onChange={(event) => setTrainerId(event.target.value)}
              className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-xs outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            >
              <option value="">Select Trainer to Lead this Session…</option>
              {courseTrainers.length > 0 && (
                <optgroup label="── Recommended: Assigned Course Trainers ──">
                  {courseTrainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      ⭐ {trainer.firstName} {trainer.lastName} ({trainer.email}) — Course Trainer
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="── All LMS Qualified Trainers ──">
                {otherTrainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    👤 {trainer.firstName} {trainer.lastName} ({trainer.email})
                  </option>
                ))}
              </optgroup>
            </select>
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
              label="Session Description & Agenda"
              placeholder="Outline objectives, key discussion topics, required preparation…"
              value={descriptionEn}
              onChange={setDescriptionEn}
              rows={3}
            />
          </div>

          {/* Reschedule Date & Time Section */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-900">Schedule &amp; Timing</p>
            </div>
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Session Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className={inputClass}
              >
                <option value="SCHEDULED">Upcoming / Scheduled</option>
                <option value="LIVE">Live Now</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <p className="mt-1 text-[11px] text-amber-800">
                Updating the date/time reschedules the session for enrolled participants and notifies learners.
              </p>
            </div>
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
                Participants join directly in the ELTMS workspace with WebRTC audio/video and automatic attendance.
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
                    Regenerate room code
                  </button>
                )}
              </div>
              <input
                type="url"
                required={platformType !== "CUSTOM"}
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          )}

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

          {/* Live Attendance Configuration */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <p className="text-xs font-bold text-slate-800">Live Session Attendance Policy</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Attendance calculation and Minimum Active Stay Threshold for &quot;Present&quot; status are governed centrally by institutional policy configured in System Admin Policies.
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={allowViewAttendance}
                onChange={(e) => setAllowViewAttendance(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Permit participants (all actors) to view attendees and attendance modal for this session</span>
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
              {submitting ? "Saving Changes…" : "Update & Reschedule Session"}
            </Button>
          </div>
        </form>
      </div>
    </WorkspaceDetailOverlay>
  );
}

