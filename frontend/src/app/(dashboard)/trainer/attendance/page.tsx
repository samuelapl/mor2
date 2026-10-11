'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Filter,
  History,
  Info,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  UserX,
  X,
  Send,
} from 'lucide-react';
import type { ApiAttendance, BackendAttendanceStatus } from '@/lib/api/types';
import {
  bulkMarkAttendance,
  fetchSessionAttendance,
  markAttendance,
  overrideAttendance,
  sendSessionAttendanceReport,
} from '@/lib/api/monitoring';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCourseStore } from '@/lib/stores/course-store';
import { useLiveSessionStore } from '@/lib/stores/live-session-store';
import { useUserName, useUserStore } from '@/lib/stores/user-store';
import { usePermissions } from '@/lib/usePermissions';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, Td } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ClassroomQrModal } from '@/components/features/sessions/in-person/ClassroomQrModal';
import { toast } from '@/lib/toast';
import { isInPersonSession } from '@/lib/session-mode';
import { formatSessionDate, formatSessionTime } from '@/lib/app-time';

// Platform time (EAT), whatever the browser's time zone.
const formatDate = (value: string) =>
  formatSessionDate(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (value: string) => formatSessionTime(value);

export default function TrainerAttendancePage() {
  const courses = useCourseStore((s) => s.courses);
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useUserStore((s) => s.users);
  const userName = useUserName();
  const { can } = usePermissions();
  const { t } = useTranslation('sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<ApiAttendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // QR Check-in modal
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Override dialog
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{ id: string; name: string } | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<BackendAttendanceStatus>('PRESENT');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // Filter courses assigned to trainer
  const assignedCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          c.trainerId === currentUser?.id ||
          ((c as any).trainerIds && (c as any).trainerIds.includes(currentUser?.id)),
      ),
    [courses, currentUser],
  );

  // Live sessions for the trainer's assigned courses (all sessions when none are assigned)
  const sessionList = useLiveSessionStore((s) => s.sessions);
  const fetchSessions = useLiveSessionStore((s) => s.loadSessions);
  const sessions = useMemo(
    () =>
      assignedCourses.length > 0
        ? sessionList.filter((s) => assignedCourses.some((c) => c.id === s.courseId))
        : sessionList,
    [sessionList, assignedCourses],
  );

  const loadSessions = async () => {
    await fetchSessions();
  };

  // Pick the first session once the list arrives
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    void loadSessions();
  }, []);

  // Load attendance records for active session
  const loadAttendanceForSession = async (sessionId: string) => {
    if (!sessionId) return;
    setLoadingAttendance(true);
    try {
      const records = await fetchSessionAttendance(sessionId);
      setAttendanceRecords(records);
    } catch {
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      void loadAttendanceForSession(selectedSessionId);
    }
  }, [selectedSessionId]);

  const activeSession = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0];
  const activeCourse = courses.find((c) => c.id === activeSession?.courseId);

  // All enrolled students for this course
  const enrolledStudentIds = useMemo(() => {
    return (activeCourse?.enrolledLearnerIds ?? []).filter((id) => id !== currentUser?.id);
  }, [activeCourse, currentUser]);

  // Map of studentId -> Attendance Record
  const attendanceByUser = useMemo(() => {
    const map = new Map<string, ApiAttendance>();
    for (const record of attendanceRecords) {
      map.set(record.userId, record);
    }
    return map;
  }, [attendanceRecords]);

  // Combined list of all learners for roster
  const studentRoster = useMemo(() => {
    // Include both enrolled student IDs and any user IDs present in records
    const allIds = Array.from(
      new Set([...enrolledStudentIds, ...attendanceRecords.map((r) => r.userId)]),
    );

    return allIds.map((userId) => {
      const record = attendanceByUser.get(userId);
      const userObj = users.find((u) => u.id === userId) || record?.user;
      const displayName = userObj
        ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.email
        : userName(userId);

      const sessionDur = activeSession?.durationMinutes || 30;
      const stayMin = record?.durationMinutes ?? Math.floor((record?.activeSeconds || 0) / 60);
      const pct = record?.percentage ?? Math.min(100, Math.round((stayMin / sessionDur) * 100));

      return {
        userId,
        name: displayName,
        email: userObj?.email || '—',
        record,
        status: (record?.status ?? 'ABSENT') as BackendAttendanceStatus,
        checkInMethod: record?.checkInMethod,
        joinedAt: record?.joinedAt,
        leftAt: record?.leftAt,
        durationMinutes: stayMin,
        activeSeconds: record?.activeSeconds ?? 0,
        rejoinCount: record?.rejoinCount ?? 0,
        percentage: pct,
      };
    });
  }, [enrolledStudentIds, attendanceRecords, attendanceByUser, users, userName, activeSession]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return studentRoster.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [studentRoster, searchQuery, statusFilter]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    filteredRoster,
    10,
  );

  // Stats calculation
  const totalStudents = studentRoster.length;
  const presentCount = studentRoster.filter((s) => s.status === 'PRESENT').length;
  const lateCount = studentRoster.filter((s) => s.status === 'LATE').length;
  const excusedCount = studentRoster.filter((s) => s.status === 'EXCUSED').length;
  const absentCount = studentRoster.filter((s) => s.status === 'ABSENT').length;
  const attendanceRate =
    totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  // Actions
  const handleMarkStatus = async (userId: string, status: BackendAttendanceStatus) => {
    if (!activeSession) return;
    setActionLoadingId(userId);

    try {
      await markAttendance({
        sessionId: activeSession.id,
        userId,
        status,
      });
      toast.success(`Updated attendance status to ${status}.`);
      await loadAttendanceForSession(activeSession.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record attendance status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBulkMarkAll = async (status: BackendAttendanceStatus) => {
    if (!activeSession || studentRoster.length === 0) return;
    setLoadingAttendance(true);

    try {
      const records = studentRoster.map((s) => ({
        userId: s.userId,
        status,
      }));
      await bulkMarkAttendance({
        sessionId: activeSession.id,
        records,
      });
      toast.success(`Successfully marked all learners as ${status}.`);
      await loadAttendanceForSession(activeSession.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to bulk update attendance.');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleOpenOverride = (recordId: string, studentName: string) => {
    setOverrideTarget({ id: recordId, name: studentName });
    setOverrideStatus('PRESENT');
    setOverrideModalOpen(true);
  };

  const handleExecuteOverride = async () => {
    if (!overrideTarget) return;
    setOverrideSubmitting(true);
    try {
      await overrideAttendance(overrideTarget.id, overrideStatus);
      toast.success(`Attendance record overridden to ${overrideStatus}.`);
      setOverrideModalOpen(false);
      if (activeSession) await loadAttendanceForSession(activeSession.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to override attendance.');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleSendReport = async () => {
    if (!selectedSessionId) return;
    setSendingReport(true);
    try {
      await sendSessionAttendanceReport(selectedSessionId);
      toast.success('Attendance report calculated and official notification delivered to trainer!');
      await loadAttendanceForSession(selectedSessionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to dispatch attendance report.');
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <PageShell
      role="trainer"
      title={t('trainerAttendancePage.attendanceManagementWorkspace')}
      description={t('trainerAttendancePage.trackVerifyAndManageParticipantAttendanc')}
    >
      <div className="space-y-6">
        {/* Session Selector & Context Bar */}
        <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('trainerAttendancePage.selectSession')}
              </span>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="rounded-xl border border-border bg-muted px-3.5 py-2 text-sm font-semibold text-foreground focus:border-ring focus:bg-card focus:outline-none max-w-md"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course?.code || 'COURSE'} · {s.titleEn} ({formatDate(s.scheduledAt)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {isInPersonSession(activeSession) && (
                <Button
                  size="sm"
                  onClick={() => setQrModalOpen(true)}
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Classroom QR & PIN Check-In
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleSendReport}
                disabled={sendingReport || !selectedSessionId}
                className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary-soft"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingReport
                  ? t('trainerAttendancePage.generating')
                  : t('trainerAttendancePage.sendReportToTrainer')}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  loadSessions();
                  if (selectedSessionId) loadAttendanceForSession(selectedSessionId);
                }}
                disabled={loadingAttendance}
                className="text-xs gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingAttendance ? 'animate-spin' : ''}`} />
                {t('trainerAttendancePage.refreshRoster')}
              </Button>
            </div>
          </div>

          {activeSession && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/60 text-xs text-secondary-foreground">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                {formatDate(activeSession.scheduledAt)} at {formatTime(activeSession.scheduledAt)}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
                {activeSession.durationMinutes} min
              </span>
              <span>·</span>
              <Badge variant={activeSession.status === 'LIVE' ? 'green' : 'blue'} dot>
                {activeSession.status}
              </Badge>
              <span>·</span>
              <span>Platform: {activeSession.platform || 'JITSI'}</span>

              {isInPersonSession(activeSession) && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-warning bg-warning-soft px-2.5 py-1 rounded-lg border border-warning/30">
                    <Building2 className="h-3.5 w-3.5 text-warning" />
                    <span>In-Person Classroom:</span>
                    <span className="font-bold text-foreground">
                      {activeSession.venue?.branch || 'Ministry Center'} ·{' '}
                      {activeSession.venue?.name || 'Classroom'} (Max:{' '}
                      {activeSession.venue?.capacity ?? 30} seats)
                    </span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Attendance Statistics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t('trainerAttendancePage.enrolledStudents')}
              </span>
              <Users className="h-4 w-4 text-subtle-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalStudents}</p>
            <p className="text-[11px] text-subtle-foreground mt-0.5">
              {t('trainerAttendancePage.totalEligible')}
            </p>
          </div>

          <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t('trainerAttendancePage.present')}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-success">{presentCount}</p>
            <p className="text-[11px] text-subtle-foreground mt-0.5">
              {t('trainerAttendancePage.confirmedCheckIns')}
            </p>
          </div>

          <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t('trainerAttendancePage.late')}
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-warning">{lateCount}</p>
            <p className="text-[11px] text-subtle-foreground mt-0.5">
              {t('trainerAttendancePage.checkedInAfterStart')}
            </p>
          </div>

          <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t('trainerAttendancePage.excusedAbsence')}
              </span>
              <Award className="h-4 w-4 text-sky-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-info">{excusedCount}</p>
            <p className="text-[11px] text-subtle-foreground mt-0.5">
              {t('trainerAttendancePage.authorizedPermits')}
            </p>
          </div>

          <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {t('trainerAttendancePage.attendanceRate')}
              </span>
              <FileCheck className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-primary">{attendanceRate}%</p>
            <div className="mt-2">
              <ProgressBar value={attendanceRate} />
            </div>
          </div>
        </div>

        {/* Toolbar & Bulk Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
          <div className="relative min-w-[260px] flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('trainerAttendancePage.searchLearnerByNameOrEmail')}
              className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-2 text-xs font-medium text-foreground placeholder:text-subtle-foreground focus:border-ring focus:bg-card focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-subtle-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-secondary-foreground focus:border-ring focus:bg-card focus:outline-none"
              >
                <option value="ALL">
                  {t('trainerAttendancePage.allStatuses')} ({studentRoster.length})
                </option>
                <option value="PRESENT">
                  {t('trainerAttendancePage.present')} ({presentCount})
                </option>
                <option value="LATE">
                  {t('trainerAttendancePage.late')} ({lateCount})
                </option>
                <option value="ABSENT">
                  {t('trainerAttendancePage.absent')} ({absentCount})
                </option>
                <option value="EXCUSED">
                  {t('trainerAttendancePage.excused')} ({excusedCount})
                </option>
              </select>
            </div>

            {/* Quick Bulk Actions */}
            {can('attendance.manage') ? (
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkMarkAll('PRESENT')}
                  disabled={loadingAttendance || studentRoster.length === 0}
                  className="text-xs text-success border-success/30 bg-success-soft/50 hover:bg-success-soft"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Mark All Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkMarkAll('ABSENT')}
                  disabled={loadingAttendance || studentRoster.length === 0}
                  className="text-xs text-secondary-foreground hover:text-danger"
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Reset All Absent
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Detailed Attendance Roster Table */}
        <div className="rounded-2xl border border-border/90 bg-card shadow-xs overflow-hidden">
          {loadingAttendance ? (
            <div className="flex flex-col items-center justify-center py-16 text-subtle-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-medium">Loading session roster and check-ins…</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-16 text-center text-subtle-foreground">
              <Users className="h-10 w-10 mx-auto text-subtle-foreground mb-2" />
              <p className="text-sm font-semibold text-secondary-foreground">
                {t('trainerAttendancePage.noLearnersFound')}
              </p>
              <p className="text-xs text-subtle-foreground mt-0.5">
                {t('trainerAttendancePage.noLearnersMatchTheCurrentFilter')}
              </p>
            </div>
          ) : (
            <Table
              columns={[
                t('trainerAttendancePage.learnerName'),
                t('trainerAttendancePage.accountEmail'),
                t('trainerAttendancePage.checkInDetails'),
                t('trainerAttendancePage.stay'),
                t('trainerAttendancePage.currentStatus'),
                t('trainerAttendancePage.manageAttendance'),
              ]}
            >
              {pageItems.map((learner) => {
                const isLoading = actionLoadingId === learner.userId;
                const sessionDur = activeSession?.durationMinutes || 30;

                return (
                  <tr key={learner.userId} className="hover:bg-muted/70 transition-colors">
                    <Td className="font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                          {learner.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{learner.name}</p>
                          <p className="text-[11px] text-subtle-foreground sm:hidden">{learner.email}</p>
                        </div>
                      </div>
                    </Td>

                    <Td className="text-xs text-muted-foreground font-mono hidden sm:table-cell">
                      {learner.email}
                    </Td>

                    <Td className="text-xs">
                      {learner.checkInMethod ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {learner.checkInMethod === 'VIRTUAL' ? (
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            ) : (
                              <MapPin className="h-3 w-3 text-primary" />
                            )}
                            {learner.checkInMethod}
                          </span>
                          {learner.joinedAt && (
                            <p className="text-[10px] text-subtle-foreground">
                              Joined: {formatTime(learner.joinedAt)}
                            </p>
                          )}
                          {learner.rejoinCount > 0 && (
                            <p className="text-[10px] font-semibold text-warning">
                              Rejoined {learner.rejoinCount}x
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-subtle-foreground text-xs italic">Manual tracking</span>
                      )}
                    </Td>

                    <Td className="text-xs">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="h-3 w-3 text-subtle-foreground" />
                        <span className="font-semibold text-foreground">
                          {learner.durationMinutes}m / {sessionDur}m
                        </span>
                        <span className="text-[11px] text-muted-foreground font-sans">
                          ({learner.percentage}%)
                        </span>
                      </div>
                    </Td>

                    <Td>
                      <Badge
                        variant={
                          learner.status === 'PRESENT'
                            ? 'green'
                            : learner.status === 'LATE'
                              ? 'amber'
                              : learner.status === 'EXCUSED'
                                ? 'blue'
                                : 'slate'
                        }
                        dot
                      >
                        {learner.status}
                      </Badge>
                    </Td>

                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {can('attendance.manage') ? (
                          <>
                            <Button
                              size="sm"
                              variant={learner.status === 'PRESENT' ? 'primary' : 'outline'}
                              disabled={isLoading}
                              onClick={() => handleMarkStatus(learner.userId, 'PRESENT')}
                              className={`h-7 px-2.5 text-xs ${
                                learner.status === 'PRESENT'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : ''
                              }`}
                            >
                              Present
                            </Button>

                            <Button
                              size="sm"
                              variant={learner.status === 'LATE' ? 'primary' : 'outline'}
                              disabled={isLoading}
                              onClick={() => handleMarkStatus(learner.userId, 'LATE')}
                              className={`h-7 px-2.5 text-xs ${
                                learner.status === 'LATE'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : ''
                              }`}
                            >
                              Late
                            </Button>

                            <Button
                              size="sm"
                              variant={learner.status === 'ABSENT' ? 'primary' : 'outline'}
                              disabled={isLoading}
                              onClick={() => handleMarkStatus(learner.userId, 'ABSENT')}
                              className={`h-7 px-2.5 text-xs ${
                                learner.status === 'ABSENT' ? 'bg-secondary-foreground text-background' : ''
                              }`}
                            >
                              Absent
                            </Button>

                            <Button
                              size="sm"
                              variant={learner.status === 'EXCUSED' ? 'primary' : 'outline'}
                              disabled={isLoading}
                              onClick={() => handleMarkStatus(learner.userId, 'EXCUSED')}
                              className={`h-7 px-2.5 text-xs ${
                                learner.status === 'EXCUSED' ? 'bg-sky-600 text-white' : ''
                              }`}
                            >
                              Excused
                            </Button>
                          </>
                        ) : null}

                        {can('attendance.override') && learner.record?.id ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenOverride(learner.record!.id, learner.name)}
                            title="Attendance Override"
                            className="h-7 px-2 text-[11px] text-subtle-foreground hover:text-secondary-foreground"
                          >
                            <ShieldAlert className="h-3 w-3" />
                          </Button>
                        ) : null}

                        {!can('attendance.manage') && !can('attendance.override') ? (
                          <span className="text-xs text-subtle-foreground italic">View only</span>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </div>
        {!loadingAttendance && filteredRoster.length > 0 ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 25, 50, 100]}
          />
        ) : null}
      </div>

      {/* Override Modal */}
      {overrideModalOpen && overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl border border-border">
            <h3 className="text-base font-bold text-foreground">Override Attendance Record</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Applying an override to{' '}
              <span className="font-semibold text-foreground">{overrideTarget.name}</span> will
              update their verified status with an audit log.
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-secondary-foreground block">Override Status</label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value as BackendAttendanceStatus)}
                className="w-full rounded-xl border border-border p-2.5 text-sm"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="EXCUSED">EXCUSED</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOverrideModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleExecuteOverride} disabled={overrideSubmitting}>
                {overrideSubmitting ? 'Overriding…' : 'Confirm Override'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom QR & PIN Modal */}
      {activeSession && qrModalOpen ? (
        <ClassroomQrModal
          open={qrModalOpen}
          onClose={() => {
            setQrModalOpen(false);
            if (activeSession) void loadAttendanceForSession(activeSession.id);
          }}
          session={activeSession}
          totalStudents={totalStudents}
          presentCount={presentCount}
        />
      ) : null}
    </PageShell>
  );
}
