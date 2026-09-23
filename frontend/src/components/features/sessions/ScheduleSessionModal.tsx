"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Video, Sparkles, Shield, MonitorPlay, Link as LinkIcon, RefreshCw, UserCheck } from "lucide-react";
import type { Course } from "@/types";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { ApiError } from "@/lib/api/client";
import { scheduleSession } from "@/lib/api/monitoring";
import { fetchTrainers } from "@/lib/api/users";
import type { ApiUser } from "@/lib/api/types";
import { SearchableCourseSelect } from "./SearchableCourseSelect";
import { SearchableTrainerSelect } from "./SearchableTrainerSelect";

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
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [trainerId, setTrainerId] = useState("");
  const [availableTrainers, setAvailableTrainers] = useState<ApiUser[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
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

  // Sync courseId when courses load
  useEffect(() => {
    if (!courseId && courses.length > 0 && courses[0]?.id) {
      setCourseId(courses[0].id);
    }
  }, [courses, courseId]);

  // Load qualified trainers when modal opens
  useEffect(() => {
    if (!open) return;
    setTrainersLoading(true);
    fetchTrainers()
      .then((res) => {
        setAvailableTrainers(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load trainers for session schedule:", err);
        setAvailableTrainers([]);
      })
      .finally(() => setTrainersLoading(false));
  }, [open]);

  // When courseId changes, auto-select the course's default trainer if available
  useEffect(() => {
    const selectedCourse = courses.find((c) => c.id === courseId);
    if (selectedCourse?.trainerId) {
      setTrainerId(selectedCourse.trainerId);
    }
  }, [courseId, courses]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const courseTrainerIds = new Set(
    [selectedCourse?.trainerId, ...(selectedCourse?.trainerIds || [])].filter(Boolean) as string[],
  );

  const courseTrainers = availableTrainers.filter((t) => courseTrainerIds.has(t.id));
  const otherTrainers = availableTrainers.filter((t) => !courseTrainerIds.has(t.id));

  const generateJitsiUrl = () => {
    const course = courses.find((c) => c.id === courseId);
    const code = (course?.code || "TRAINING").replace(/[^a-zA-Z0-9]/g, "");
    return `https://meet.jit.si/MoR-LMS-${code}-${Math.random().toString(36).substring(2, 8)}`;
  };

  // Automatically pre-populate Jitsi URL when switching to JITSI if empty
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
    } else if (val === "ZOOM") {
      setExternalUrl("");
    } else {
      setExternalUrl("");
    }
  };

  // Initialize Jitsi URL on initial open if not set
  useEffect(() => {
    if (open && platformType === "JITSI" && !externalUrl) {
      setExternalUrl(generateJitsiUrl());
    }
  }, [open, platformType, courseId]);

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  const handleSubmit = async (event: FormEvent) => {
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

      setTitleEn("");
      setTitleAm("");
      setDescriptionEn("");
      setTrainerId("");
      setExternalUrl("");
      setMeetingPassword("");
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to schedule the session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title="Schedule Live Training Session"
      subtitle="Schedule an interactive virtual classroom or live webinar. Sessions will be visible to assigned trainers and enrolled learners."
    >
      <div className="w-full py-4">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
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

          <p className="text-[11px] text-slate-600 leading-relaxed">
            The assigned trainer will be designated as the session speaker, appear with verified host credentials in the video classroom, and receive direct scheduling reminders.
          </p>
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

        {/* Interactive Rich Text for Agenda & Description */}
        <div>
          <RichTextArea
            label="Session Description & Agenda (Interactive Rich Text)"
            placeholder="Outline objectives, key discussion topics, required preparation, or session notes (supports bold, lists, headings)…"
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
              No external links or apps required. Participants join directly in the ELTMS workspace with native WebRTC audio, video, screen sharing, and automated attendance tracking.
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
            <div className="flex gap-2">
              <input
                type="url"
                required={platformType !== "CUSTOM"}
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://meet.jit.si/..."
                className={inputClass}
              />
            </div>
            {platformType === "JITSI" && (
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                Instant, zero-install WebRTC video room with screen sharing and chat.
              </p>
            )}
            {platformType === "BIGBLUEBUTTON" && (
              <p className="flex items-center gap-1.5 text-[11px] text-indigo-700">
                <MonitorPlay className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                Integrated with MoR LMS BigBlueButton provider checksum security.
              </p>
            )}
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
            {submitting ? "Scheduling…" : "Schedule Live Session"}
          </Button>
        </div>
      </form>
    </div>
  </WorkspaceDetailOverlay>
  );
}