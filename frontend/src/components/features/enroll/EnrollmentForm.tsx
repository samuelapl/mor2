'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  Loader2,
  RefreshCw,
  Search,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from '@/lib/toast';
import { useLms } from '@/lib/lms-store';
import { dropEnrollment, fetchCourseEnrollments } from '@/lib/api/enrollments';
import { fetchCourseLearnersProgress } from '@/lib/api/progress';
import { usePagination } from '@/lib/usePagination';
import { cn } from '@/lib/utils';

interface EnrolledLearnerItem {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  enrolledAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED' | string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
}

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-purple-500 to-indigo-600',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] ?? 'from-indigo-500 to-violet-600';
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

export function EnrollmentForm() {
  const { courses, users, enrollLearners } = useLms();

  // Selected Course
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');

  // Roster Data States
  const [roster, setRoster] = useState<EnrolledLearnerItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DROPPED'>(
    'ALL',
  );
  const [sortBy, setSortBy] = useState<'name' | 'progress_desc' | 'progress_asc' | 'date_desc'>(
    'progress_desc',
  );

  // Enroll & Withdraw Modal States
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [userToEnroll, setUserToEnroll] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [withdrawingLearner, setWithdrawingLearner] = useState<EnrolledLearnerItem | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Current selected course object
  const selectedCourse = courses.find((c) => c.id === courseId) ?? courses[0];

  // Map of directory users by ID for fast lookup
  const userMap = useMemo(() => {
    const map = new Map<string, (typeof users)[0]>();
    for (const u of users) {
      map.set(u.id, u);
    }
    return map;
  }, [users]);

  // Set of enrolled user IDs for this course
  const enrolledUserIds = useMemo(() => new Set(roster.map((r) => r.userId)), [roster]);

  // Unenrolled learners eligible for enrollment
  const unenrolledUsers = useMemo(() => {
    return users.filter((u) => u.role === 'learner' && !enrolledUserIds.has(u.id));
  }, [users, enrolledUserIds]);

  // Load enrolled students roster and progress for the active course
  const loadRoster = useCallback(
    async (cId: string) => {
      if (!cId) return;
      setLoadingRoster(true);
      setRosterError(null);

      try {
        const [enrollmentsRes, progressRes] = await Promise.allSettled([
          fetchCourseEnrollments(cId),
          fetchCourseLearnersProgress(cId),
        ]);

        const enrollments = enrollmentsRes.status === 'fulfilled' ? enrollmentsRes.value.data : [];
        const progressList = progressRes.status === 'fulfilled' ? progressRes.value.learners : [];
        const totalLessons =
          progressRes.status === 'fulfilled' ? progressRes.value.totalLessons : 0;

        // Index progress by userId
        const progressMap = new Map<string, (typeof progressList)[0]>();
        for (const p of progressList) {
          progressMap.set(p.userId, p);
        }

        const items: EnrolledLearnerItem[] = enrollments.map((enrollment) => {
          const directoryUser = userMap.get(enrollment.userId);
          const progressItem = progressMap.get(enrollment.userId);

          let resolvedName = enrollment.userId;
          if (directoryUser?.name) {
            resolvedName = directoryUser.name;
          } else if (enrollment.user) {
            resolvedName = `${enrollment.user.firstName} ${enrollment.user.lastName}`.trim();
          } else if (progressItem) {
            resolvedName = `${progressItem.firstName} ${progressItem.lastName}`.trim();
          }

          const resolvedEmail =
            directoryUser?.email ??
            enrollment.user?.email ??
            progressItem?.email ??
            'No email recorded';

          const resolvedDepartment = directoryUser?.department ?? 'General Revenue';

          const resolvedProgress =
            progressItem?.progressPercent ??
            (selectedCourse?.progress ? (selectedCourse.progress[enrollment.userId] ?? 0) : 0);

          const resolvedCompletedLessons = progressItem?.completedLessons ?? 0;

          return {
            enrollmentId: enrollment.id,
            userId: enrollment.userId,
            name: resolvedName,
            email: resolvedEmail,
            department: resolvedDepartment,
            enrolledAt: enrollment.enrolledAt || enrollment.createdAt,
            status: enrollment.status,
            progressPercent: resolvedProgress,
            completedLessons: resolvedCompletedLessons,
            totalLessons: totalLessons || 0,
          };
        });

        setRoster(items);
      } catch (err) {
        setRosterError(
          err instanceof Error ? err.message : 'Failed to load enrolled students roster.',
        );
      } finally {
        setLoadingRoster(false);
      }
    },
    [selectedCourse, userMap],
  );

  // Refetch roster when selected course changes
  useEffect(() => {
    if (selectedCourse?.id) {
      void loadRoster(selectedCourse.id);
    }
  }, [selectedCourse?.id, loadRoster]);

  // Handle single learner enrollment
  const handleEnroll = async () => {
    if (!selectedCourse?.id || !userToEnroll) {
      toast.error('Please select a learner to enroll.');
      return;
    }
    setEnrolling(true);
    try {
      const res = await enrollLearners(selectedCourse.id, [userToEnroll]);
      if (res.ok) {
        toast.success('Learner enrolled successfully!');
        setShowEnrollModal(false);
        setUserToEnroll('');
        void loadRoster(selectedCourse.id);
      } else {
        toast.error(res.message || 'Failed to enroll learner.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enrollment failed.');
    } finally {
      setEnrolling(false);
    }
  };

  // Handle learner drop/withdrawal
  const handleWithdrawConfirm = async () => {
    if (!withdrawingLearner) return;
    setWithdrawing(true);
    try {
      await dropEnrollment(withdrawingLearner.enrollmentId, 'Withdrawn by training admin');
      toast.success(`${withdrawingLearner.name} has been withdrawn from this course.`);
      setWithdrawingLearner(null);
      if (selectedCourse?.id) {
        void loadRoster(selectedCourse.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to withdraw learner.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Metrics for current course roster
  const metrics = useMemo(() => {
    const total = roster.length;
    const active = roster.filter((r) => r.status === 'ACTIVE').length;
    const completed = roster.filter(
      (r) => r.status === 'COMPLETED' || r.progressPercent === 100,
    ).length;
    const avgProgress =
      total > 0
        ? Math.round(roster.reduce((sum, item) => sum + item.progressPercent, 0) / total)
        : 0;
    return { total, active, completed, avgProgress };
  }, [roster]);

  // Filtered and sorted roster
  const filteredRoster = useMemo(() => {
    let result = [...roster];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q),
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'progress_desc') {
        return b.progressPercent - a.progressPercent;
      }
      if (sortBy === 'progress_asc') {
        return a.progressPercent - b.progressPercent;
      }
      if (sortBy === 'date_desc') {
        return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
      }
      return 0;
    });

    return result;
  }, [roster, statusFilter, searchQuery, sortBy]);

  // Pagination for roster
  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    filteredRoster,
    10,
  );

  const formatEnrollDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const plainDescription = stripHtml(selectedCourse?.description);

  return (
    <div className="space-y-6">
      {/* Top Header Card: Course Selector & Summary Metrics */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft">
        <div className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 rounded-full bg-gradient-to-bl from-indigo-500/10 via-violet-500/5 to-transparent blur-xl" />

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Course Selector Dropdown & Info */}
          <div className="max-w-xl space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <BookOpen className="h-4 w-4" />
              </span>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Course Catalog
              </label>
            </div>

            <div className="relative">
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setPage(1);
                  setSearchQuery('');
                }}
                className="w-full appearance-none rounded-xl border border-slate-200/90 bg-white py-2.5 pl-4 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title} ({course.enrolledLearnerIds?.length ?? 0}{' '}
                    enrolled)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </div>

            {plainDescription ? (
              <p className="line-clamp-1 text-xs text-slate-500">{plainDescription}</p>
            ) : null}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              onClick={() => {
                if (unenrolledUsers.length > 0) {
                  setUserToEnroll(unenrolledUsers[0].id);
                }
                setShowEnrollModal(true);
              }}
              className="gap-2 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Enroll Learner
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedCourse?.id && void loadRoster(selectedCourse.id)}
              isLoading={loadingRoster}
              loadingText="Refreshing..."
              className="gap-2 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Roster
            </Button>
          </div>
        </div>

        {/* Course Statistics Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-5">
          <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Enrolled
            </p>
            <p className="mt-1 font-display text-xl font-bold text-slate-900">
              {loadingRoster ? '…' : metrics.total}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-100/60">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Active Learners
            </p>
            <p className="mt-1 font-display text-xl font-bold text-emerald-800">
              {loadingRoster ? '…' : metrics.active}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-100/60">
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              Completed
            </p>
            <p className="mt-1 font-display text-xl font-bold text-blue-800">
              {loadingRoster ? '…' : metrics.completed}
            </p>
          </div>

          <div className="rounded-xl bg-violet-50/70 p-3.5 border border-violet-100/60">
            <p className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">
              Avg. Completion
            </p>
            <p className="mt-1 font-display text-xl font-bold text-violet-800">
              {loadingRoster ? '…' : `${metrics.avgProgress}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Roster Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft ring-super-soft">
        {/* Table Filter & Search Controls */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/40">
          <div className="flex flex-1 items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search enrolled learners by name, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-xs">
              {(['ALL', 'ACTIVE', 'COMPLETED', 'DROPPED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="progress_desc">Highest Progress</option>
              <option value="progress_asc">Lowest Progress</option>
              <option value="name">Name (A–Z)</option>
              <option value="date_desc">Recently Enrolled</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loadingRoster ? (
          <div className="p-6">
            <TableSkeleton columns={5} rows={6} />
          </div>
        ) : rosterError ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800">Error Loading Enrolled Students</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">{rosterError}</p>
            <Button
              variant="outline"
              onClick={() => selectedCourse?.id && void loadRoster(selectedCourse.id)}
              className="mt-4 gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-200/50 mb-4">
              <UsersRound className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {roster.length === 0
                ? `No learners enrolled in "${selectedCourse?.title}" yet`
                : 'No matching learners found'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {roster.length === 0
                ? 'There are currently no learners enrolled in this course.'
                : 'Try clearing or modifying your search filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 pl-6 pr-4">Learner Profile</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Enrolled Date</th>
                    <th className="px-4 py-3.5 min-w-[180px]">Course Progress</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((learner) => {
                    const avatarGradient = getAvatarColor(learner.userId);
                    const initials = getInitials(learner.name);

                    return (
                      <tr
                        key={learner.enrollmentId}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Profile Info */}
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-sm',
                                avatarGradient,
                              )}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {learner.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">{learner.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium text-slate-600">
                            {learner.department}
                          </span>
                        </td>

                        {/* Enrolled Date */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatEnrollDate(learner.enrolledAt)}
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">
                                {learner.progressPercent}%
                              </span>
                              {learner.totalLessons > 0 && (
                                <span className="text-[11px] text-slate-400">
                                  {learner.completedLessons} / {learner.totalLessons} lessons
                                </span>
                              )}
                            </div>
                            <ProgressBar value={learner.progressPercent} className="h-2" />
                          </div>
                        </td>

                        {/* Status & Actions */}
                        <td className="py-3.5 pl-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Badge
                              variant={
                                learner.status === 'COMPLETED' || learner.progressPercent === 100
                                  ? 'blue'
                                  : learner.status === 'ACTIVE'
                                    ? 'green'
                                    : 'slate'
                              }
                              dot
                            >
                              {learner.status === 'COMPLETED' || learner.progressPercent === 100
                                ? 'Completed'
                                : learner.status === 'ACTIVE'
                                  ? 'Active'
                                  : 'Dropped'}
                            </Badge>
                            {learner.status === 'ACTIVE' && (
                              <button
                                type="button"
                                title={`Withdraw ${learner.name}`}
                                onClick={() => setWithdrawingLearner(learner)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Strip */}
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/40">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 25, 50]}
              />
            </div>
          </>
        )}
      </div>

      {/* Enroll Learner Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enroll Learner</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enroll a student into{' '}
                  <span className="font-semibold text-slate-700">{selectedCourse?.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Select Eligible Learner ({unenrolledUsers.length} available)
              </label>
              {unenrolledUsers.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 border border-slate-200">
                  All registered learners are already enrolled in this course.
                </p>
              ) : (
                <select
                  value={userToEnroll}
                  onChange={(e) => setUserToEnroll(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-800 shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                >
                  <option value="">-- Choose a learner --</option>
                  {unenrolledUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — {u.department || 'No Dept'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowEnrollModal(false)}
                disabled={enrolling}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleEnroll}
                disabled={!userToEnroll || unenrolledUsers.length === 0}
                isLoading={enrolling}
                loadingText="Enrolling..."
              >
                Confirm Enrollment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Learner Withdrawal Modal */}
      <ConfirmModal
        open={Boolean(withdrawingLearner)}
        title="Withdraw Learner from Course"
        description={`Are you sure you want to withdraw "${withdrawingLearner?.name}" from "${selectedCourse?.title}"? Their progress will be preserved but their status will change to Dropped.`}
        confirmText="Withdraw Learner"
        variant="danger"
        isLoading={withdrawing}
        onConfirm={handleWithdrawConfirm}
        onClose={() => !withdrawing && setWithdrawingLearner(null)}
      />
    </div>
  );
}
