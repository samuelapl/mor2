'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Lock,
  Mail,
  Percent,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import {
  fetchSessionAttendanceReport,
  fetchSessionAttendanceVisibility,
  sendSessionAttendanceReport,
} from '@/lib/api/monitoring';
import type { ApiAttendance, ApiAttendanceReport, ApiAttendanceVisibility } from '@/lib/api/types';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Td } from '@/components/ui/Table';

interface DynamicAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle?: string;
  userRole?: string;
}

const formatDateTime = (val?: string | null) => {
  if (!val) return '—';
  return new Date(val).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export function DynamicAttendanceModal({
  open,
  onClose,
  sessionId,
  sessionTitle,
  userRole = 'learner',
}: DynamicAttendanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<ApiAttendanceVisibility | null>(null);
  const [report, setReport] = useState<ApiAttendanceReport | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!sessionId) return;
    setLoading(true);
    setFlashMessage(null);
    try {
      const vis = await fetchSessionAttendanceVisibility(sessionId);
      setVisibility(vis);

      if (vis.canView) {
        const rep = await fetchSessionAttendanceReport(sessionId);
        setReport(rep);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && sessionId) {
      void loadData();
    }
  }, [open, sessionId]);

  const handleSendReport = async () => {
    if (!sessionId) return;
    setSendingReport(true);
    try {
      const res = await sendSessionAttendanceReport(sessionId);
      setReport(res);
      setFlashMessage(
        'Attendance report successfully calculated and notification sent to trainer!',
      );
      setTimeout(() => setFlashMessage(null), 4000);
    } catch {
      setFlashMessage('Failed to dispatch attendance report.');
    } finally {
      setSendingReport(false);
    }
  };

  const handleExportCsv = () => {
    if (!report || !report.attendees.length) return;
    const threshold = report.session.attendanceThreshold ?? 60;
    const headers = [
      'Learner Name',
      'Email',
      'First Joined',
      'Last Left',
      'Rejoin Count',
      'Stay Duration (Minutes)',
      'Percentage',
      'Threshold (%)',
      'Status',
    ];

    const rows = report.attendees.map((a) => {
      const name = a.user
        ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() || a.user.email
        : 'Participant';
      const percentage =
        a.percentage ??
        (a.durationMinutes
          ? Math.min(
              100,
              Math.round((a.durationMinutes / (report.session.durationMinutes || 30)) * 100),
            )
          : 0);
      return [
        `"${name}"`,
        `"${a.user?.email || ''}"`,
        `"${a.joinedAt ? new Date(a.joinedAt).toLocaleString() : 'Did not attend'}"`,
        `"${a.leftAt ? new Date(a.leftAt).toLocaleString() : '—'}"`,
        a.rejoinCount ?? 0,
        a.durationMinutes ?? 0,
        `${percentage}%`,
        `${threshold}%`,
        a.status,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `attendance_${report.session.courseCode || 'session'}_${sessionId.slice(0, 8)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const attendees = report?.attendees ?? [];
  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim()) return attendees;
    const q = searchQuery.toLowerCase();
    return attendees.filter((a) => {
      const name = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.toLowerCase();
      const email = (a.user?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [attendees, searchQuery]);

  if (!open) return null;

  const threshold = report?.session.attendanceThreshold ?? 60;
  const isTrainerOrAdmin =
    userRole === 'trainer' ||
    userRole === 'training_admin' ||
    userRole === 'system_admin' ||
    Boolean(visibility?.isStaff);

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users className="h-4 w-4" />
          </span>
          <span className="truncate">
            {report?.session.titleEn || sessionTitle || 'Session Attendees & Attendance'}
          </span>
        </div>
      }
      subtitle={
        report?.session
          ? `${report.session.courseCode} · ${report.session.courseTitle} · ${report.session.durationMinutes} Minutes Session Duration`
          : 'Real-time attendee stay calculation & attendance verification'
      }
      badge={
        visibility?.canView ? (
          <Badge variant="green" dot>
            Admin Permitted
          </Badge>
        ) : (
          <Badge variant="amber" dot>
            Restricted View
          </Badge>
        )
      }
      actions={
        <div className="flex items-center gap-2">
          {visibility?.canView && (
            <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}

          {isTrainerOrAdmin && visibility?.canView && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={attendees.length === 0}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={handleSendReport}
                disabled={sendingReport}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingReport ? 'Sending Report…' : 'Send Report to Trainer'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6 pb-8">
        {flashMessage && (
          <div className="rounded-2xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            <span>{flashMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
            <p className="mt-3 text-sm font-medium text-secondary-foreground">
              Verifying attendance permissions and calculating session stay metrics…
            </p>
          </div>
        ) : !visibility?.canView ? (
          /* Locked State when Admin does NOT permit viewing */
          <div className="rounded-3xl border border-warning/30 bg-warning-soft/50 p-10 text-center max-w-xl mx-auto my-12 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Session Attendance Viewing Restricted
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary-foreground">
              The system administrator has not permitted session attendance to be viewed by general
              actors for this session.
            </p>
            <div className="mt-6 rounded-2xl border border-warning/25 bg-card p-4 text-xs text-secondary-foreground text-left space-y-2">
              <div className="flex items-center gap-2 font-semibold text-warning">
                <ShieldCheck className="h-4 w-4 text-warning" />
                Administrative Policy Rule:
              </div>
              <p>
                When the system administrator enables{' '}
                <em>&quot;Permit All Actors to View Session Attendees &amp; Attendance&quot;</em> in
                Platform Settings, any participant can inspect real-time join times, stay durations,
                and verification statuses.
              </p>
            </div>
            <div className="mt-6">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Permitted State: Show Full Dynamic Attendance Roster & Calculation */
          <>
            {/* Calculation Rule Banner */}
            <div className="rounded-2xl border border-primary/30 bg-primary-soft/70 p-4 text-xs text-primary flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                  {threshold}%
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Attendance Calculation Rule: $\ge {threshold}\%$ Active Stay = Present
                  </p>
                  <p className="text-secondary-foreground text-[11px] mt-0.5">
                    Total session length is {report?.session.durationMinutes || 30} minutes.
                    Learners staying at least{' '}
                    {Math.round(((report?.session.durationMinutes || 30) * threshold) / 100)}{' '}
                    minutes across their join/rejoin intervals are verified as{' '}
                    <strong>PRESENT</strong>; otherwise <strong>ABSENT</strong>.
                  </p>
                </div>
              </div>
              <Badge variant="indigo" className="text-xs px-2.5 py-1">
                Active Tracking: Join · Leave · Rejoin
              </Badge>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                  <span>Total Enrolled</span>
                  <Users className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {report?.summary.totalEnrolled ?? 0}
                </p>
                <p className="text-[11px] text-subtle-foreground mt-0.5">Registered learners</p>
              </div>

              <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                  <span>Verified Present</span>
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-success">
                  {report?.summary.present ?? 0}
                </p>
                <p className="text-[11px] text-success/80 mt-0.5 font-medium">
                  Stayed $\ge {threshold}\%$ of session
                </p>
              </div>

              <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                  <span>Marked Absent</span>
                  <UserX className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-danger">
                  {report?.summary.absent ?? 0}
                </p>
                <p className="text-[11px] text-subtle-foreground mt-0.5">Stayed &lt; {threshold}%</p>
              </div>

              <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                  <span>Attendance Rate</span>
                  <Percent className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {report?.summary.attendanceRate ?? 0}%
                </p>
                <p className="text-[11px] text-subtle-foreground mt-0.5">Overall qualification</p>
              </div>
            </div>

            {/* Attendee Roster Table */}
            <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Live Session Attendees &amp; Interval Audit
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Shows when each learner joined, left, rejoined, total active minutes, and
                    calculated status.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Filter learner name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-border bg-muted px-3 py-1.5 text-xs text-foreground outline-none focus:border-ring focus:bg-card transition"
                />
              </div>

              {filteredAttendees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/50 py-10 text-center text-xs text-subtle-foreground">
                  No attendees matching filter recorded yet.
                </div>
              ) : (
                <Table
                  columns={[
                    'Learner Name',
                    'Join Time',
                    'Left Time',
                    'Rejoins',
                    'Stay Duration',
                    'Percentage',
                    'Verified Status',
                  ]}
                >
                  {filteredAttendees.map((att) => {
                    const fullName = att.user
                      ? `${att.user.firstName || ''} ${att.user.lastName || ''}`.trim() ||
                        att.user.email
                      : 'Participant';
                    const isPresent = att.status === 'PRESENT';
                    const sessionDur = report?.session.durationMinutes || 30;
                    const stayMin =
                      att.durationMinutes ?? Math.floor((att.activeSeconds || 0) / 60);
                    const pct =
                      att.percentage ?? Math.min(100, Math.round((stayMin / sessionDur) * 100));

                    return (
                      <tr key={att.id} className="hover:bg-muted/80 transition-colors">
                        <Td>
                          <div>
                            <p className="font-semibold text-foreground text-xs">{fullName}</p>
                            <p className="text-[10px] text-subtle-foreground">{att.user?.email || '—'}</p>
                          </div>
                        </Td>
                        <Td className="text-xs text-secondary-foreground font-mono">
                          {formatDateTime(att.joinedAt)}
                        </Td>
                        <Td className="text-xs text-muted-foreground font-mono">
                          {formatDateTime(att.leftAt)}
                        </Td>
                        <Td>
                          {(att.rejoinCount ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning border border-warning/20">
                              Rejoined {att.rejoinCount}x
                            </span>
                          ) : att.joinedAt ? (
                            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                              Single session
                            </span>
                          ) : (
                            <span className="text-[10px] text-subtle-foreground">Never joined</span>
                          )}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-subtle-foreground" />
                            <span className="font-semibold text-foreground text-xs">
                              {stayMin}m / {sessionDur}m
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= threshold ? 'bg-emerald-500' : 'bg-rose-400'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-secondary-foreground">
                              {pct}%
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <Badge
                            variant={isPresent ? 'green' : 'red'}
                            dot
                            className="font-bold tracking-wide"
                          >
                            {att.status}
                          </Badge>
                        </Td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </div>
          </>
        )}
      </div>
    </WorkspaceDetailOverlay>
  );
}
