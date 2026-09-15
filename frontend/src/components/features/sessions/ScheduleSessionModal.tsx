"use client";

import { useState, type FormEvent } from "react";
import type { Course } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { scheduleSession } from "@/lib/api/monitoring";

interface ScheduleSessionModalProps {
  open: boolean;
  onClose: () => void;
  onScheduled?: () => void;
  courses: Course[];
}

export function ScheduleSessionModal({
  open,
  onClose,
  onScheduled,
  courses,
}: ScheduleSessionModalProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [titleEn, setTitleEn] = useState("");
  const [titleAm, setTitleAm] = useState("");
  const [date, setDate] = useState("2026-09-25");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [externalUrl, setExternalUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!courseId) {
      setError("Please choose a course.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await scheduleSession(courseId, {
        titleEn: titleEn.trim(),
        titleAm: titleAm.trim() || titleEn.trim(),
        platform: "GOOGLE_MEET",
        externalUrl: externalUrl.trim() || undefined,
        scheduledAt: new Date(`${date}T${time}`).toISOString(),
        durationMinutes: Number(duration),
      });
      setTitleEn("");
      setTitleAm("");
      setExternalUrl("");
      onScheduled?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to schedule the session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule Live Session"
      subtitle="The session will be added to the training calendar."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Course</label>
          <select
            required
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className={inputClass}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Session title (English)
          </label>
          <input
            required
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            placeholder="e.g. Monthly Q&A Session"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Session title (አማርኛ)
          </label>
          <input
            value={titleAm}
            onChange={(event) => setTitleAm(event.target.value)}
            placeholder="e.g. የወርሃዊ ጥያቄና መልስ ክፍለ ጊዜ"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Start time</label>
            <input
              required
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Duration (min)</label>
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
            Meeting link (optional)
          </label>
          <input
            type="url"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            placeholder="e.g. https://meet.example.com/session"
            className={inputClass}
          />
        </div>
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule session"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}