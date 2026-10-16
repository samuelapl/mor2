'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  Link2,
  MonitorPlay,
  Play,
  Radio,
  Users,
  Video,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  UserCheck,
  ClipboardCheck,
  BookOpen,
  User,
  Key,
} from 'lucide-react';
import { formatSessionDate, formatSessionTime } from '@/lib/app-time';
import { StartsInBadge } from './StartsInBadge';
import type { ApiLiveSession } from '@/lib/api/types';
import { fetchLiveSession } from '@/lib/api/monitoring';
import { useCourseStore } from '@/lib/stores/course-store';
import { useUserName, useUserStore } from '@/lib/stores/user-store';
import { usePermissions } from '@/lib/usePermissions';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichContent } from '@/components/ui/RichContent';
import { toast } from '@/lib/toast';
import { LiveSessionWorkspace } from '../virtual/LiveSessionWorkspace';
import { SessionAttendanceModal } from './SessionAttendanceModal';
import { isInPersonSession } from '@/lib/session-mode';

interface SessionDetailModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  userRole?: string;
  onOpenAttendance?: () => void;
  onJoin?: () => void;
}

// Platform time (EAT), whatever the browser's time zone.
const formatDate = (value: string) =>
  formatSessionDate(value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const formatTime = (value: string) => formatSessionTime(value);

const STATUS_META: Record<
  ApiLiveSession['status'],
  { label: string; variant: 'blue' | 'green' | 'slate' | 'red' }
> = {
  SCHEDULED: { label: 'Upcoming', variant: 'blue' },
  LIVE: { label: 'LIVE NOW', variant: 'green' },
  COMPLETED: { label: 'Completed', variant: 'slate' },
  CANCELLED: { label: 'Cancelled', variant: 'red' },
};

export function SessionDetailModal({
  open,
  onClose,
  sessionId,
  userRole = 'trainer',
  onOpenAttendance,
  onJoin,
}: SessionDetailModalProps) {
  const courses = useCourseStore((s) => s.courses);
  const users = useUserStore((s) => s.users);
  const userName = useUserName();
  const { can, canAny } = usePermissions();
  const [session, setSession] = useState<ApiLiveSession | null>(null);
  const [liveWorkspaceOpen, setLiveWorkspaceOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

  const canViewAttendance = can('attendance.view') || can('attendance.manage');

  useEffect(() => {
    if (!open || !sessionId) {
      setSession(null);
      return;
    }
    let cancelled = false;
    fetchLiveSession(sessionId)
      .then((res) => {
        if (!cancelled) setSession(res);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  if (!open || !session) return null;

  const meta = STATUS_META[session.status];
  const course = courses.find((c) => c.id === session.courseId) || session.course;
  const courseTitle = (course as any)?.title || (course as any)?.titleEn || 'Training Program';
  const trainerObj = session.trainerId
    ? users.find((u) => u.id === session.trainerId) || session.trainer
    : session.trainer;
  const trainerDisplayName = trainerObj
    ? `${trainerObj.firstName || ''} ${trainerObj.lastName || ''}`.trim() || trainerObj.email
    : session.trainerId
      ? userName(session.trainerId)
      : 'Institutional Trainer';

      const isEnded = session.status === 'COMPLETED' || session.status === 'CANCELLED';

    return (
    <>
      <WorkspaceDetailOverlay
        open={open && !liveWorkspaceOpen}
        onClose={onClose}
        title={session.titleEn || 'Session Details'}
        subtitle={`${course?.code || 'COURSE'} · ${courseTitle}`}
        badge={
          <Badge variant={meta.variant} dot>
            {meta.label}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {!isEnded &&
              (userRole === 'trainer' ||
                can('live_session.manage_own') ||
                can('live_session.manage_all')) && (
                <Link href={`/trainer/sessions/${sessionId}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary-soft"
                  >
                    <FileCheck className="h-3.5 w-3.5 text-primary" />
                    Prepare Quiz
                  </Button>
                </Link>
              )}

            {canViewAttendance && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (onOpenAttendance) {
                    onClose();
                    onOpenAttendance();
                  } else {
                    setAttendanceModalOpen(true);
                  }
                }}
                className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary-soft"
              >
                <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                View Attendance
              </Button>
            )}

            {!isEnded &&
              (isInPersonSession(session) ? (
                <Badge
                  variant="outline"
                  className="bg-warning-soft text-warning border-warning/30 text-xs py-1 px-2.5"
                >
                  📍 Physical Venue Session
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    const FIVE_MINUTES_MS = 5 * 60 * 1000;
                    const isTimeReached =
                      session.status === 'LIVE' ||
                      (session.scheduledAt &&
                        Date.now() >= new Date(session.scheduledAt).getTime() - FIVE_MINUTES_MS);
                    if (!isTimeReached) {
                      toast.info(
                        'This live session is coming soon. You can join the room 5 minutes before the scheduled start time.',
                      );
                      return;
                    }
                    if (onJoin) {
                      onJoin();
                      onClose();
                    } else {
                      setLiveWorkspaceOpen(true);
                    }
                  }}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs text-xs"
                >
                  <MonitorPlay className="h-4 w-4" />
                  Join Session Room
                </Button>
              ))}
          </div>
        }
      >
        <div className="w-full space-y-6 pb-8">
          {/* Key Schedule & Delivery Information */}
          <div className="rounded-2xl border border-border/90 bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
              Schedule &amp; Delivery Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl bg-muted p-3.5 border border-border/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-subtle-foreground">Scheduled Time</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {formatDate(session.scheduledAt)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{formatTime(session.scheduledAt)}</p>
                  <StartsInBadge seconds={session.startsInSeconds} className="mt-1" />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-muted p-3.5 border border-border/60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-subtle-foreground">Session Duration</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">
                    {session.durationMinutes} Minutes
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Threshold: {session.attendanceThreshold ?? 60}% required
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-muted p-3.5 border border-border/60">
                {isInPersonSession(session) ? (
                  <>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-subtle-foreground">
                        Physical Training Venue
                      </p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">
                        {session.venue?.name || 'In-Person Classroom'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {session.venue
                          ? `${session.venue.branch} • ${session.venue.capacity} Seats`
                          : 'Classroom Venue'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Video className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-subtle-foreground">
                        Conferencing Platform
                      </p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">
                        {session.platform || 'IN-LMS (LiveKit / WebRTC)'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Interactive live classroom</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Course & Assigned Instructor */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
                  Course
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">{courseTitle}</p>
              <p className="text-xs text-muted-foreground">
                Course Code: <span className="font-semibold text-secondary-foreground">{course?.code}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
                  Designated Trainer / Instructor
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">{trainerDisplayName}</p>
              <p className="text-xs text-muted-foreground">
                {trainerObj?.email || 'Platform Assigned Instructor'}
              </p>
            </div>
          </div>

          {/* Meeting Room Access Credentials */}
          <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
              Meeting Room Access
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {session.meetingId && (
                <div className="rounded-xl bg-muted px-3.5 py-2.5 border border-border/60">
                  <span className="text-[11px] text-subtle-foreground font-medium">Meeting ID</span>
                  <p className="text-xs font-mono font-semibold text-foreground mt-0.5">
                    {session.meetingId}
                  </p>
                </div>
              )}
              {session.meetingPassword && (
                <div className="rounded-xl bg-muted px-3.5 py-2.5 border border-border/60">
                  <span className="text-[11px] text-subtle-foreground font-medium">Meeting Password</span>
                  <p className="text-xs font-mono font-semibold text-foreground mt-0.5">
                    {session.meetingPassword}
                  </p>
                </div>
              )}
            </div>

            {session.externalUrl ? (
              <div className="pt-2">
                <span className="text-[11px] text-subtle-foreground font-medium">External Join Link</span>
                <div className="mt-1 flex items-center gap-2">
                  <a
                    href={session.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 underline break-all font-mono"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {session.externalUrl}
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          {/* Session Description and Objectives (separate, as in course preparation) */}
          {session.descriptionEn && (
            <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">Session Description</h3>
              <div className="text-xs leading-relaxed text-secondary-foreground">
                <RichContent html={session.descriptionEn} />
              </div>
            </div>
          )}
          {session.objectivesEn && (
            <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">Session Objectives</h3>
              <div className="text-xs leading-relaxed text-secondary-foreground">
                <RichContent html={session.objectivesEn} />
              </div>
            </div>
          )}

          {/* Amharic Title & Description if present */}
          {session.titleAm && (
            <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
                የርዕስ መረጃ (Amharic)
              </h3>
              <p className="text-xs font-semibold text-foreground">{session.titleAm}</p>
              {session.descriptionAm && (
                <div className="text-xs text-secondary-foreground">
                  <RichContent html={session.descriptionAm} />
                </div>
              )}
            </div>
          )}
        </div>
      </WorkspaceDetailOverlay>

      {/* Embedded Live Workspace */}
      {liveWorkspaceOpen && (
        <LiveSessionWorkspace
          open={liveWorkspaceOpen}
          onClose={() => setLiveWorkspaceOpen(false)}
          session={session}
          courseTitle={courseTitle}
          courseCode={course?.code}
          trainerName={trainerDisplayName}
          userRole={userRole}
        />
      )}

      {/* Embedded Attendance Modal */}
      {attendanceModalOpen && (
        <SessionAttendanceModal
          open={attendanceModalOpen}
          onClose={() => setAttendanceModalOpen(false)}
          sessionId={session.id}
        />
      )}
    </>
  );
}
