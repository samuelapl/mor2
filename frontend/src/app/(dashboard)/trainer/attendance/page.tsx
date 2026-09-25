'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
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
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  UserX,
  X,
  Send,
} from 'lucide-react';
import type { ApiAttendance, ApiLiveSession, BackendAttendanceStatus } from '@/lib/api/types';
import {
  bulkMarkAttendance,
  fetchLiveSessions,
  fetchSessionAttendance,
  markAttendance,
  overrideAttendance,
  sendSessionAttendanceReport,
} from '@/lib/api/monitoring';
import { useLms } from '@/lib/lms-store';
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
import { toast } from '@/lib/toast';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export default function TrainerAttendancePage() {
  const { courses, currentUser, users, userName } = useLms();
  const { can } = usePermissions();
  const { tBilingual } = useTranslation();
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<ApiAttendance[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  // Load live sessions
  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetchLiveSessions({ limit: 100 });
      let my = res.data;
      if (assignedCourses.length > 0) {
        my = res.data.filter((s) => assignedCourses.some((c) => c.id === s.courseId));
      }
      setSessions(my);
      if (my.length > 0 && !selectedSessionId) {
        setSelectedSessionId(my[0].id);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

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
      title={tBilingual('Attendance Management Workspace', 'የተሳትፎ እና የክትትል አስተዳደር')}
      description={tBilingual(
        'Track, verify, and manage participant attendance across your scheduled live training sessions.',
        'በታቀዱ የቀጥታ ስልጠና ክፍለ-ጊዜዎችዎ የተሳታፊዎችን ክትትል ይከታተሉ፣ ያረጋግጡ እና ያስተዳድሩ።',
      )}
    >
      <div className="space-y-6">
        {/* Session Selector & Context Bar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {tBilingual('Select Session:', 'ክፍለ-ጊዜ ይምረጡ:')}
              </span>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none max-w-md"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course?.code || 'COURSE'} · {s.titleEn} ({formatDate(s.scheduledAt)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendReport}
                disabled={sendingReport || !selectedSessionId}
                className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingReport
                  ? tBilingual('Generating…', 'በማመንጨት ላይ…')
                  : tBilingual('Send Report to Trainer', 'ሪፖርት ለአሰልጣኝ ላክ')}
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
                {tBilingual('Refresh Roster', 'ዝርዝር አድስ')}
              </Button>
            </div>
          </div>

          {activeSession && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                {formatDate(activeSession.scheduledAt)} at {formatTime(activeSession.scheduledAt)}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {activeSession.durationMinutes} min
              </span>
              <span>·</span>
              <Badge variant={activeSession.status === 'LIVE' ? 'green' : 'blue'} dot>
                {activeSession.status}
              </Badge>
              <span>·</span>
              <span>Platform: {activeSession.platform || 'JITSI'}</span>
            </div>
          )}
        </div>

        {/* Attendance Statistics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {tBilingual('Enrolled Students', 'የተመዘገቡ ተማሪዎች')}
              </span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totalStudents}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {tBilingual('Total eligible', 'ጠቅላላ ብቁ')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {tBilingual('Present', 'የተገኙ')}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{presentCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {tBilingual('Confirmed check-ins', 'የተረጋገጡ መግቢያዎች')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {tBilingual('Late', 'የዘገዩ')}
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600">{lateCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {tBilingual('Checked in after start', 'ከመጀመሪያ በኋላ የገቡ')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {tBilingual('Excused Absence', 'ፈቃድ ያላቸው')}
              </span>
              <Award className="h-4 w-4 text-sky-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-sky-600">{excusedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {tBilingual('Authorized permits', 'የተፈቀደላቸው')}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {tBilingual('Attendance Rate', 'የተሳትፎ ምጣኔ')}
              </span>
              <FileCheck className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-600">{attendanceRate}%</p>
            <div className="mt-2">
              <ProgressBar value={attendanceRate} />
            </div>
          </div>
        </div>

        {/* Toolbar & Bulk Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="relative min-w-[260px] flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tBilingual('Search learner by name or email…', 'ተማሪ በስም ወይም ኢሜይል ይፈልጉ…')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                <option value="ALL">
                  {tBilingual('All Statuses', 'ሁሉም ሁኔታዎች')} ({studentRoster.length})
                </option>
                <option value="PRESENT">
                  {tBilingual('Present', 'የተገኙ')} ({presentCount})
                </option>
                <option value="LATE">
                  {tBilingual('Late', 'የዘገዩ')} ({lateCount})
                </option>
                <option value="ABSENT">
                  {tBilingual('Absent', 'የቀሩ')} ({absentCount})
                </option>
                <option value="EXCUSED">
                  {tBilingual('Excused', 'ፈቃድ')} ({excusedCount})
                </option>
              </select>
            </div>

            {/* Quick Bulk Actions */}
            {can('attendance.manage') ? (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkMarkAll('PRESENT')}
                  disabled={loadingAttendance || studentRoster.length === 0}
                  className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Mark All Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkMarkAll('ABSENT')}
                  disabled={loadingAttendance || studentRoster.length === 0}
                  className="text-xs text-slate-600 hover:text-red-700"
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Reset All Absent
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Detailed Attendance Roster Table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {loadingAttendance ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-medium">Loading session roster and check-ins…</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {tBilingual('No learners found', 'ምንም ተማሪዎች አልተገኙም')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {tBilingual(
                  'No learners match the current filter or are enrolled in this course session.',
                  'ከአሁኑ ማጣሪያ ጋር የሚዛመድ ወይም በዚህ ክፍለ-ጊዜ የተመዘገበ ተማሪ የለም።',
                )}
              </p>
            </div>
          ) : (
            <Table
              columns={[
                tBilingual('Learner Name', 'የተማሪ ስም'),
                tBilingual('Account / Email', 'መለያ / ኢሜይል'),
                tBilingual('Check-in Details', 'የመግቢያ ዝርዝር'),
                tBilingual('Stay & %', 'የቆይታ ጊዜ እና %'),
                tBilingual('Current Status', 'የአሁን ሁኔታ'),
                tBilingual('Manage Attendance', 'ክትትል አስተዳድር'),
              ]}
            >
              {pageItems.map((learner) => {
                const isLoading = actionLoadingId === learner.userId;
                const sessionDur = activeSession?.durationMinutes || 30;

                return (
                  <tr key={learner.userId} className="hover:bg-slate-50/70 transition-colors">
                    <Td className="font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {learner.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{learner.name}</p>
                          <p className="text-[11px] text-slate-400 sm:hidden">{learner.email}</p>
                        </div>
                      </div>
                    </Td>

                    <Td className="text-xs text-slate-500 font-mono hidden sm:table-cell">
                      {learner.email}
                    </Td>

                    <Td className="text-xs">
                      {learner.checkInMethod ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            {learner.checkInMethod === 'VIRTUAL' ? (
                              <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                            ) : (
                              <MapPin className="h-3 w-3 text-indigo-600" />
                            )}
                            {learner.checkInMethod}
                          </span>
                          {learner.joinedAt && (
                            <p className="text-[10px] text-slate-400">
                              Joined: {formatTime(learner.joinedAt)}
                            </p>
                          )}
                          {learner.rejoinCount > 0 && (
                            <p className="text-[10px] font-semibold text-amber-700">
                              Rejoined {learner.rejoinCount}x
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Manual tracking</span>
                      )}
                    </Td>

                    <Td className="text-xs">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          {learner.durationMinutes}m / {sessionDur}m
                        </span>
                        <span className="text-[11px] text-slate-500 font-sans">
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
                                learner.status === 'ABSENT' ? 'bg-slate-700 text-white' : ''
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
                            className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-700"
                          >
                            <ShieldAlert className="h-3 w-3" />
                          </Button>
                        ) : null}

                        {!can('attendance.manage') && !can('attendance.override') ? (
                          <span className="text-xs text-slate-400 italic">View only</span>
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Override Attendance Record</h3>
            <p className="mt-1 text-xs text-slate-500">
              Applying an override to{' '}
              <span className="font-semibold text-slate-800">{overrideTarget.name}</span> will
              update their verified status with an audit log.
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">Override Status</label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value as BackendAttendanceStatus)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
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
    </PageShell>
  );
}
