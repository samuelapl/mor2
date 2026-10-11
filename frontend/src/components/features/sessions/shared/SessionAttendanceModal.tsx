'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ClipboardList,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Lock,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import type { ApiAttendance, ApiLiveSession, BackendAttendanceStatus } from '@/lib/api/types';
import { bulkMarkAttendance, fetchLiveSession, fetchSessionAttendance, markAttendance, sendSessionAttendanceReport } from '@/lib/api/monitoring';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCourseStore } from '@/lib/stores/course-store';
import { useUserName, useUserStore } from '@/lib/stores/user-store';
import { usePermissions } from '@/lib/usePermissions';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Td } from '@/components/ui/Table';
import { cn } from '@/lib/utils';
import { SessionQuizResultsTab } from './quiz-results/SessionQuizResultsTab';

interface SessionAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

export function SessionAttendanceModal({ open, onClose, sessionId }: SessionAttendanceModalProps) {
  const courses = useCourseStore((s) => s.courses);
  const users = useUserStore((s) => s.users);
  const userName = useUserName();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { can } = usePermissions();

  const [session, setSession] = useState<ApiLiveSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<ApiAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tab, setTab] = useState<'attendance' | 'quiz'>('attendance');

  // Permissions strictly checked:
  // canManage: can change statuses, bulk mark, override
  // canView: can view roster, status, stay time (read-only)
  const canManage = can('attendance.manage');
  const canView = can('attendance.view') || canManage;

  const loadData = async () => {
    if (!sessionId || !open) return;
    setLoading(true);
    try {
      const [sess, records] = await Promise.all([
        fetchLiveSession(sessionId),
        canView ? fetchSessionAttendance(sessionId).catch(() => []) : Promise.resolve([]),
      ]);
      setSession(sess);
      setAttendanceRecords(records);
    } catch (err) {
      console.error('Failed to load session attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !sessionId) {
      setSession(null);
      setAttendanceRecords([]);
      return;
    }
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  const activeCourse = useMemo(() => courses.find((c) => c.id === session?.courseId), [courses, session?.courseId]);

  const enrolledStudentIds = useMemo(() => {
    return (activeCourse?.enrolledLearnerIds ?? []).filter((id) => id !== currentUser?.id);
  }, [activeCourse, currentUser]);

  const attendanceByUser = useMemo(() => {
    const map = new Map<string, ApiAttendance>();
    for (const record of attendanceRecords) {
      map.set(record.userId, record);
    }
    if (session?.attendees) {
      for (const a of session.attendees) {
        if (!map.has(a.userId)) {
          map.set(a.userId, a);
        }
      }
    }
    return map;
  }, [attendanceRecords, session?.attendees]);

  const studentRoster = useMemo(() => {
    const allIds = Array.from(
      new Set([...enrolledStudentIds, ...attendanceRecords.map((r) => r.userId), ...(session?.attendees ?? []).map((a) => a.userId)]),
    );

    return allIds.map((userId) => {
      const record = attendanceByUser.get(userId);
      const userObj = users.find((u) => u.id === userId) || record?.user;
      const displayName = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.email : userName(userId);

      const sessionDur = session?.durationMinutes || 30;
      const stayMin = record?.durationMinutes ?? Math.floor((record?.activeSeconds || 0) / 60);
      const pct = record?.percentage ?? Math.min(100, Math.round((stayMin / sessionDur) * 100));

      return {
        userId,
        name: displayName,
        email: userObj?.email || '—',
        record,
        status: (record?.status ?? 'ABSENT') as BackendAttendanceStatus,
        checkInMethod: record?.checkInMethod || 'VIRTUAL',
        joinedAt: record?.joinedAt,
        durationMinutes: stayMin,
        percentage: pct,
      };
    });
  }, [enrolledStudentIds, attendanceRecords, session?.attendees, attendanceByUser, users, userName, session?.durationMinutes]);

  const filteredRoster = useMemo(() => {
    return studentRoster.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [studentRoster, searchQuery, statusFilter]);

  const presentCount = studentRoster.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentCount = studentRoster.filter((a) => a.status === 'ABSENT').length;
  const lateCount = studentRoster.filter((a) => a.status === 'LATE').length;
  const excusedCount = studentRoster.filter((a) => a.status === 'EXCUSED').length;
  const attendanceRate = studentRoster.length > 0 ? Math.round((presentCount / studentRoster.length) * 100) : 0;

  const handleMarkStatus = async (userId: string, status: BackendAttendanceStatus) => {
    if (!sessionId || !canManage) return;
    setUpdatingUserId(userId);
    try {
      await markAttendance({
        sessionId,
        userId,
        status,
      });
      // Optimistically update
      setAttendanceRecords((prev) => {
        const existingIdx = prev.findIndex((r) => r.userId === userId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], status };
          return updated;
        }
        return [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            sessionId,
            userId,
            status,
            checkInMethod: 'VIRTUAL',
            joinedAt: status === 'PRESENT' ? new Date().toISOString() : undefined,
          } as ApiAttendance,
        ];
      });
      setFlash(`Attendance marked as ${status}.`);
      setTimeout(() => setFlash(null), 3000);
    } catch (err: any) {
      setFlash(err?.message || 'Failed to update attendance status.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!sessionId || studentRoster.length === 0 || !canManage) return;
    setBulkUpdating(true);
    try {
      const records = studentRoster.map((item) => ({
        userId: item.userId,
        status: 'PRESENT' as BackendAttendanceStatus,
      }));
      await bulkMarkAttendance({ sessionId, records });
      await loadData();
      setFlash('All enrolled learners marked as Present.');
      setTimeout(() => setFlash(null), 4000);
    } catch (err: any) {
      setFlash(err?.message || 'Failed to bulk mark attendance.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleSendReport = async () => {
    if (!sessionId || !canManage) return;
    setSendingReport(true);
    try {
      await sendSessionAttendanceReport(sessionId);
      await loadData();
      setFlash('Attendance report calculated and dispatched successfully.');
      setTimeout(() => setFlash(null), 4000);
    } catch {
      setFlash('Failed to dispatch attendance report.');
    } finally {
      setSendingReport(false);
    }
  };

  const handleExportCsv = () => {
    if (studentRoster.length === 0) return;
    const headers = ['Learner Name', 'Email', 'Status', 'Check-in Method', 'Joined At', 'Stay (Minutes)', 'Percentage'];
    const rows = studentRoster.map((r) => [
      `"${r.name}"`,
      `"${r.email}"`,
      r.status,
      r.checkInMethod,
      r.joinedAt ? `"${new Date(r.joinedAt).toLocaleString()}"` : `"Not checked in"`,
      r.durationMinutes,
      `${r.percentage}%`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${session?.course?.code || 'session'}_${sessionId.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users className="h-4 w-4" />
          </span>
          <span className="truncate">{session ? `Attendance: ${session.titleEn}` : 'Session Attendance'}</span>
        </div>
      }
      subtitle={session ? `${session.course?.code || 'COURSE'} · ${session.course?.titleEn || session.course?.code}` : undefined}
      badge={
        canManage ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success border border-success/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Manage Attendance
          </span>
        ) : canView ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-subtle-foreground" />
            View Only
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger border border-danger/30">
            Restricted
          </span>
        )
      }
      actions={
        <div className="flex items-center gap-2">
          {canView && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={studentRoster.length === 0}
              className="h-8 gap-1.5 text-xs text-secondary-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}

          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendReport}
                disabled={sendingReport || studentRoster.length === 0}
                className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary-soft"
              >
                <Send className="h-3.5 w-3.5 text-primary" />
                {sendingReport ? 'Calculating…' : 'Calculate & Send Report'}
              </Button>

              <Button
                size="sm"
                onClick={handleMarkAllPresent}
                disabled={bulkUpdating || studentRoster.length === 0}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {bulkUpdating ? 'Marking All…' : 'Mark All Present'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="w-full space-y-6 pb-8">
        {flash && (
          <div className="rounded-xl border border-success/30 bg-success-soft px-4 py-2 text-sm font-medium text-success animate-fade-in">
            {flash}
          </div>
        )}

        {!canView ? (
          <div className="rounded-2xl border border-border/90 bg-card p-8 shadow-xs text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Attendance Restricted</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You do not currently have the &quot;View attendance&quot; or &quot;Mark attendance&quot; permission. Contact the system administrator if
              you need access to this session&apos;s attendance records.
            </p>
          </div>
        ) : (
          <>
            <div role="tablist" className="flex items-center gap-1 border-b border-border">
              {(
                [
                  ['attendance', 'Attendance', UserCheck],
                  ['quiz', 'Quiz results', ClipboardList],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition',
                    tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'quiz' ? (
              <SessionQuizResultsTab sessionId={sessionId} />
            ) : (
              <>
                {/* Top Attendance Metric Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Enrolled Learners</span>
                      <Users className="h-4 w-4 text-subtle-foreground" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{studentRoster.length}</p>
                    <p className="text-[11px] text-subtle-foreground mt-0.5">Total class roster</p>
                  </div>

                  <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Attendance Rate</span>
                      <UserCheck className="h-4 w-4 text-success" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-success">{attendanceRate}%</p>
                    <p className="text-[11px] text-subtle-foreground mt-0.5">
                      {presentCount} of {studentRoster.length} verified present
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Present / Late</span>
                      <Clock className="h-4 w-4 text-indigo-500" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {presentCount} <span className="text-sm font-normal text-subtle-foreground">({lateCount} late)</span>
                    </p>
                    <p className="text-[11px] text-subtle-foreground mt-0.5">Active or on-time attendees</p>
                  </div>

                  <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Absent / Excused</span>
                      <UserX className="h-4 w-4 text-rose-500" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {absentCount} <span className="text-sm font-normal text-subtle-foreground">({excusedCount} excused)</span>
                    </p>
                    <p className="text-[11px] text-subtle-foreground mt-0.5">Missing participation records</p>
                  </div>
                </div>

                {/* Attendance Roster Section */}
                <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Participant Attendance Roster</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {canManage
                          ? 'Select status pills to mark attendance or click Mark All Present.'
                          : 'Verified attendance statuses, check-in timestamps, and stay calculations (Read-only).'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={loadData} disabled={loading} className="h-8 gap-1 text-xs text-secondary-foreground">
                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative min-w-[200px] flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
                      <input
                        type="text"
                        placeholder="Search learner name or email…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-subtle-foreground focus:border-ring focus:bg-card focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-0.5 text-xs">
                      {(['ALL', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setStatusFilter(filter)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                            statusFilter === filter ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-secondary-foreground hover:text-foreground'
                          }`}
                        >
                          {filter === 'ALL' ? 'All Roster' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  {filteredRoster.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center text-xs text-subtle-foreground">
                      {studentRoster.length === 0
                        ? 'No enrolled learners found for this course session yet.'
                        : 'No learners match the current filter or search criteria.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/80">
                      <Table
                        columns={[
                          'Learner',
                          'Check-in Method',
                          'Stay Duration',
                          'Current Status',
                          // Only show Quick Mark column if the user has attendance.manage!
                          ...(canManage ? ['Manage Attendance Status'] : []),
                        ]}
                      >
                        {filteredRoster.map((item) => {
                          const isUpdating = updatingUserId === item.userId;
                          return (
                            <tr key={item.userId} className="hover:bg-muted/60 transition-colors">
                              <Td className="py-2.5">
                                <div className="font-semibold text-foreground text-xs">{item.name}</div>
                                <div className="text-[11px] text-subtle-foreground">{item.email}</div>
                              </Td>
                              <Td className="py-2.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                                  {item.checkInMethod}
                                </span>
                                {item.joinedAt ? (
                                  <div className="text-[10px] text-subtle-foreground mt-0.5">
                                    {new Date(item.joinedAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                ) : null}
                              </Td>
                              <Td className="py-2.5">
                                <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
                                  <span className="font-medium">{item.durationMinutes}m</span>
                                  <span className="text-[10px] text-subtle-foreground">({item.percentage}%)</span>
                                </div>
                                <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden mt-1">
                                  <div
                                    className={`h-full ${
                                      item.percentage >= (session?.attendanceThreshold ?? 60) ? 'bg-emerald-500' : 'bg-amber-400'
                                    }`}
                                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                                  />
                                </div>
                              </Td>
                              <Td className="py-2.5">
                                <Badge
                                  variant={
                                    item.status === 'PRESENT'
                                      ? 'green'
                                      : item.status === 'LATE'
                                        ? 'blue'
                                        : item.status === 'EXCUSED'
                                          ? 'blue'
                                          : 'slate'
                                  }
                                  dot
                                >
                                  {item.status}
                                </Badge>
                              </Td>
                              {/* ONLY render status changer if actor has attendance.manage! */}
                              {canManage && (
                                <Td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as BackendAttendanceStatus[]).map((targetStatus) => {
                                      const isCurrent = item.status === targetStatus;
                                      return (
                                        <button
                                          key={targetStatus}
                                          type="button"
                                          disabled={isUpdating}
                                          onClick={() => handleMarkStatus(item.userId, targetStatus)}
                                          title={`Mark ${targetStatus}`}
                                          className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                                            isCurrent
                                              ? targetStatus === 'PRESENT'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : targetStatus === 'LATE'
                                                  ? 'bg-amber-500 text-white shadow-xs'
                                                  : targetStatus === 'EXCUSED'
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'bg-secondary-foreground text-background shadow-xs'
                                              : 'border border-border bg-card text-secondary-foreground hover:bg-secondary'
                                          }`}
                                        >
                                          {targetStatus === 'PRESENT'
                                            ? 'Present'
                                            : targetStatus === 'LATE'
                                              ? 'Late'
                                              : targetStatus === 'ABSENT'
                                                ? 'Absent'
                                                : 'Excused'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </Td>
                              )}
                            </tr>
                          );
                        })}
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </WorkspaceDetailOverlay>
  );
}
