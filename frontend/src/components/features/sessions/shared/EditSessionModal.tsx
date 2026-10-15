'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { MonitorPlay, RefreshCw, UserCheck, CalendarDays } from 'lucide-react';
import type { Course } from '@/types';
import type { ApiLiveSession, ApiUser } from '@/lib/api/types';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Button } from '@/components/ui/Button';
import { RichTextArea } from '@/components/ui/RichTextArea';
import { ApiError } from '@/lib/api/client';
import { useLiveSessionStore } from '@/lib/stores/live-session-store';
import { fetchTrainers } from '@/lib/api/users';
import { SearchableTrainerSelect } from './SearchableTrainerSelect';
import { SessionStartNotice } from './SessionStartNotice';
import { appDateTimeToIso, isoToAppDateTime, useServerNow } from '@/lib/app-time';

interface EditSessionModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  session: ApiLiveSession | null;
  courses: Course[];
}

type PlatformChoice =
  'LIVEKIT' | 'JITSI' | 'GOOGLE_MEET' | 'ZOOM' | 'BIGBLUEBUTTON' | 'MS_TEAMS' | 'CUSTOM';

export function EditSessionModal({
  open,
  onClose,
  onUpdated,
  session,
  courses,
}: EditSessionModalProps) {
  const updateLiveSession = useLiveSessionStore((s) => s.updateSession);
  const [trainerId, setTrainerId] = useState('');
  const [availableTrainers, setAvailableTrainers] = useState<ApiUser[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [platformType, setPlatformType] = useState<PlatformChoice>('LIVEKIT');
  const [titleEn, setTitleEn] = useState('');
  const [titleAm, setTitleAm] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [objectivesEn, setObjectivesEn] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const serverNow = useServerNow(open);
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'>(
    'SCHEDULED',
  );
  const [externalUrl, setExternalUrl] = useState('');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [allowViewAttendance, setAllowViewAttendance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prepopulate form when session changes
  useEffect(() => {
    if (!session || !open) return;
    setTitleEn(session.titleEn || '');
    setTitleAm(session.titleAm || '');
    setDescriptionEn(session.descriptionEn || '');
    setObjectivesEn(session.objectivesEn || '');
    setTrainerId(session.trainerId || session.trainer?.id || '');
    setDuration(session.durationMinutes || 60);
    setStatus(session.status);
    setExternalUrl(session.externalUrl || '');
    setMeetingPassword(session.meetingPassword || '');
    setAllowViewAttendance(Boolean((session as any).allowViewAttendance));

    // Map platform
    const p = session.platform?.toUpperCase();
    if (p === 'LIVEKIT') setPlatformType('LIVEKIT');
    else if (p === 'ZOOM') setPlatformType('ZOOM');
    else if (p === 'GOOGLE_MEET') setPlatformType('GOOGLE_MEET');
    else if (p === 'MS_TEAMS') setPlatformType('MS_TEAMS');
    else if (session.externalUrl?.includes('meet.jit.si') || session.externalUrl?.includes('jitsi'))
      setPlatformType('JITSI');
    else if (
      session.externalUrl?.includes('bigbluebutton') ||
      session.meetingId?.startsWith('bbb-')
    )
      setPlatformType('BIGBLUEBUTTON');
    else setPlatformType('CUSTOM');

    // Date and time in platform time (EAT), whatever the browser's time zone.
    if (session.scheduledAt && !isNaN(new Date(session.scheduledAt).getTime())) {
      const local = isoToAppDateTime(session.scheduledAt);
      setDate(local.date);
      setTime(local.time);
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
        console.error('Failed to load trainers for session update:', err);
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
    const code = (currentCourse?.code || session.course?.code || 'TRAINING').replace(
      /[^a-zA-Z0-9]/g,
      '',
    );
    return `https://meet.jit.si/MoR-LMS-${code}-${Math.random().toString(36).substring(2, 8)}`;
  };

  const handlePlatformChange = (val: PlatformChoice) => {
    setPlatformType(val);
    if (val === 'LIVEKIT') {
      setExternalUrl('');
    } else if (val === 'JITSI') {
      setExternalUrl(generateJitsiUrl());
    } else if (val === 'BIGBLUEBUTTON') {
      setExternalUrl('https://demo.bigbluebutton.org/gl/');
    } else if (val === 'GOOGLE_MEET') {
      setExternalUrl('https://meet.google.com/new');
    } else {
      setExternalUrl('');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let backendPlatform: 'LIVEKIT' | 'ZOOM' | 'GOOGLE_MEET' | 'MS_TEAMS' | 'CUSTOM' = 'LIVEKIT';
      if (platformType === 'LIVEKIT') backendPlatform = 'LIVEKIT';
      else if (platformType === 'ZOOM') backendPlatform = 'ZOOM';
      else if (platformType === 'GOOGLE_MEET') backendPlatform = 'GOOGLE_MEET';
      else if (platformType === 'MS_TEAMS') backendPlatform = 'MS_TEAMS';
      else backendPlatform = 'CUSTOM';

      const scheduledAtIso = date && time ? appDateTimeToIso(date, time) : undefined;

      await updateLiveSession(session.id, {
        titleEn: titleEn.trim(),
        titleAm: titleAm.trim() || titleEn.trim(),
        descriptionEn: descriptionEn.trim() || undefined,
        objectivesEn: objectivesEn.trim() || undefined,
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
      setError(err instanceof ApiError ? err.message : 'Failed to update session details.');
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
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border/90 bg-card p-6 shadow-xs"
        >
          {/* Associated Course Display (Read-Only) */}
          <div className="rounded-xl border border-border bg-muted/60 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Course
              </p>
              <p className="text-sm font-bold text-foreground">
                {currentCourse?.code || session.course?.code} —{' '}
                {currentCourse?.title || session.course?.title || session.course?.titleEn}
              </p>
            </div>
            <span className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
              {session.platform}
            </span>
          </div>

          {/* Searchable Assigned Trainer Selection */}
          <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <UserCheck className="h-4 w-4 text-primary" />
                Assigned Trainer (Instructor &amp; Host) *
              </label>
              {trainersLoading ? (
                <span className="text-[11px] font-medium text-primary animate-pulse">
                  Loading trainers…
                </span>
              ) : availableTrainers.length > 0 ? (
                <span className="text-[11px] text-muted-foreground font-medium">
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
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
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
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
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
              label="Session Description"
              placeholder="What the session covers, required preparation, or session notes…"
              value={descriptionEn}
              onChange={setDescriptionEn}
              rows={3}
            />
          </div>

          <div>
            <RichTextArea
              label="Session Objectives"
              placeholder="What learners will be able to do after this session…"
              value={objectivesEn}
              onChange={setObjectivesEn}
              rows={3}
            />
          </div>

          {/* Reschedule Date & Time Section */}
          <div className="rounded-xl border border-warning/30 bg-warning-soft/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-warning" />
              <p className="text-xs font-bold text-warning">Schedule &amp; Timing</p>
            </div>
            <SessionStartNotice date={date} time={time} now={serverNow} />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">Date *</label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  Start Time (EAT) *
                </label>
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                  Duration (min) *
                </label>
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
              <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                Session Status
              </label>
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
              <p className="mt-1 text-[11px] text-warning">
                Updating the date/time reschedules the session for enrolled participants and
                notifies learners.
              </p>
            </div>
          </div>

          {/* Video Platform Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
              Virtual Classroom Platform
            </label>
            <select
              value={platformType}
              onChange={(e) => handlePlatformChange(e.target.value as PlatformChoice)}
              className={inputClass}
            >
              <option value="LIVEKIT">LiveKit (Native In-App WebRTC Classroom)</option>
              <option value="JITSI">Jitsi Meet (Open-Source Instant Video)</option>
              <option value="BIGBLUEBUTTON">BigBlueButton (Virtual Classroom)</option>
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="ZOOM">Zoom Meetings</option>
              <option value="MS_TEAMS">Microsoft Teams</option>
              <option value="CUSTOM">Custom External URL</option>
            </select>
          </div>

          {/* Platform URL & Generator */}
          {platformType === 'LIVEKIT' ? (
            <div className="rounded-xl border border-primary/30 bg-primary-soft/70 p-3.5 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <MonitorPlay className="h-3.5 w-3.5 text-primary" />
                <span>Native In-LMS LiveKit Room</span>
              </div>
              <p className="text-primary">
                Participants join directly in the ELTMS workspace with WebRTC audio/video and
                automatic attendance.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-secondary-foreground">
                  Meeting URL {platformType === 'JITSI' ? '(Auto-generated)' : ''}
                </label>
                {platformType === 'JITSI' && (
                  <button
                    type="button"
                    onClick={() => setExternalUrl(generateJitsiUrl())}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate room code
                  </button>
                )}
              </div>
              <input
                type="url"
                required={platformType !== 'CUSTOM'}
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
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
          <div className="rounded-xl border border-border bg-muted/70 p-4 space-y-2.5">
            <p className="text-xs font-bold text-foreground">Live Session Attendance Policy</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Attendance calculation and Minimum Active Stay Threshold for &quot;Present&quot;
              status are governed centrally by institutional policy configured in System Admin
              Policies.
            </p>
            <label className="flex items-center gap-2 text-xs text-secondary-foreground cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={allowViewAttendance}
                onChange={(e) => setAllowViewAttendance(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-ring border-input"
              />
              <span>
                Permit participants (all actors) to view attendees and attendance modal for this
                session
              </span>
            </label>
          </div>

          {error ? (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving Changes…' : 'Update & Reschedule Session'}
            </Button>
          </div>
        </form>
      </div>
    </WorkspaceDetailOverlay>
  );
}
