'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle,
  ExternalLink,
  MapPin,
  MonitorPlay,
  QrCode,
  RefreshCw,
  Search,
  Info,
  Users,
  Video,
  X,
} from 'lucide-react';
import { selfCheckIn } from '@/lib/api/monitoring';
import { useLiveSessionStore } from '@/lib/stores/live-session-store';
import type { ApiLiveSession } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useLocaleStore } from '@/lib/stores/locale-store';
import { useCourseStore } from '@/lib/stores/course-store';
import { useUserName } from '@/lib/stores/user-store';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SessionTable, type SessionRow } from '@/components/features/sessions/shared/SessionTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { LiveSessionWorkspace } from '@/components/features/sessions/virtual/LiveSessionWorkspace';
import { SessionDetailModal } from '@/components/features/sessions/shared/SessionDetailModal';
import { DynamicAttendanceModal } from '@/components/features/sessions/shared/DynamicAttendanceModal';
import { LearnerCheckInModal } from '@/components/features/sessions/in-person/LearnerCheckInModal';
import { VenueDetailModal } from '@/components/features/sessions/in-person/VenueDetailModal';
import { isInPersonSession } from '@/lib/session-mode';

export default function LearnerLiveSessionsPage() {
  const searchParams = useSearchParams();
  const targetSessionId = searchParams.get('sessionId') || searchParams.get('joinSessionId');
  const lang = useLocaleStore((s) => s.lang);
  const allCourses = useCourseStore((s) => s.courses);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userName = useUserName();
  const { t } = useTranslation('dashboard');
  const me = currentUser?.id ?? '';
  const courses = useMemo(
    () => allCourses.filter((c) => c.enrolledLearnerIds.includes(me)),
    [allCourses, me],
  );
  const sessions = useLiveSessionStore((s) => s.upcoming);
  const loadUpcoming = useLiveSessionStore((s) => s.loadUpcoming);
  const [loadingJoinId, setLoadingJoinId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [joined, setJoined] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<ApiLiveSession | null>(null);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState<string | null>(
    null,
  );
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [checkInSession, setCheckInSession] = useState<ApiLiveSession | null>(null);
  const [inspectVenueSession, setInspectVenueSession] = useState<ApiLiveSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');

  const load = () => {
    void loadUpcoming().then((list) => {
      const { upcomingError } = useLiveSessionStore.getState();
      if (upcomingError) {
        setError(upcomingError instanceof ApiError ? upcomingError.message : 'Failed to load live sessions.');
        return;
      }
      if (targetSessionId) {
        const match = list.find(
          (s) => s.id === targetSessionId || (s as any).sessionId === targetSessionId,
        );
        if (match) {
          setActiveSession(match);
        }
      }
    });
  };

  useEffect(() => {
    load();
  }, [targetSessionId]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedCourseFilter !== 'ALL' && s.courseId !== selectedCourseFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const course = courses.find((c) => c.id === s.courseId);
        const titleMatch = (s.titleEn || '').toLowerCase().includes(q);
        const codeMatch = (course?.code || s.course?.code || '').toLowerCase().includes(q);
        const courseTitleMatch = (course?.title || s.course?.title || s.course?.titleEn || '')
          .toLowerCase()
          .includes(q);
        if (!titleMatch && !codeMatch && !courseTitleMatch) return false;
      }
      return true;
    });
  }, [sessions, selectedCourseFilter, searchQuery, courses]);

  const trainerNameFor = (s: ApiLiveSession) => {
    if (s.trainer) return `${s.trainer.firstName || ''} ${s.trainer.lastName || ''}`.trim();
    if (s.trainerId) {
      const name = userName(s.trainerId);
      if (name && name !== 'Unknown') return name;
    }
    const course = allCourses.find((c) => c.id === s.courseId);
    if (course?.trainerIds && course.trainerIds.length > 0) {
      for (const tId of course.trainerIds) {
        const name = userName(tId);
        if (name && name !== 'Unknown') return name;
      }
    } else if (course?.trainerId) {
      const name = userName(course.trainerId);
      if (name && name !== 'Unknown') return name;
    }
    return 'Assigned Trainer';
  };

  const rows = useMemo(() => {
    return filteredSessions.map<SessionRow>((session) => ({
      session,
      courseTitle: session.course?.title || session.course?.titleEn || 'Course Session',
      courseCode: session.course?.code || 'TRAINING',
      trainerName: trainerNameFor(session),
    }));
  }, [filteredSessions, allCourses, userName]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    rows,
    6,
  );

  const handleJoin = (session: ApiLiveSession) => {
    setError(null);
    setSuccessMsg(null);
    setActiveSession(session);
    setJoined((prev) => (prev.includes(session.id) ? prev : [...prev, session.id]));
  };

  const hasActiveFilters = searchQuery !== '' || selectedCourseFilter !== 'ALL';

  return (
    <PageShell
      role="learner"
      title={t('learnerLiveSessionsPage.liveSessions')}
      description={t('learnerLiveSessionsPage.upcomingLiveSessionsForTheCourses')}
    >
      {/* FILTER BAR */}
      <div className="mb-6 rounded-2xl border border-border/90 bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-3 sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full flex-1 sm:w-auto sm:min-w-[220px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
              <input
                type="text"
                placeholder={t('learnerLiveSessionsPage.searchSessionOrCourseCode')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-subtle-foreground focus:border-ring focus:bg-card focus:outline-none"
              />
            </div>

            {/* Course Filter Dropdown */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              aria-label="Filter by course"
              // Long "code · title" options would otherwise stretch the select past the card.
              className="w-full min-w-0 truncate rounded-xl border sm:w-auto sm:max-w-xs border-border bg-muted/50 px-3 py-1.5 text-xs text-secondary-foreground focus:border-ring focus:bg-card focus:outline-none"
            >
              <option value="ALL">
                {t('learnerCoursesPage.allCourses')} ({courses.length})
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCourseFilter('ALL');
                }}
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                {t('learnerLiveSessionsPage.clear')}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              className="h-8 gap-1 text-xs text-secondary-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('learnerLiveSessionsPage.refresh')}
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-danger-soft border border-danger/30 px-4 py-3 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {successMsg ? (
        <p className="mb-4 rounded-xl bg-success-soft border border-success/30 px-4 py-3 text-xs text-success flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
          {successMsg}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilters
              ? t('learnerLiveSessionsPage.noMatchingLiveSessions')
              : t('learnerLiveSessionsPage.noLiveSessionsScheduled')
          }
          description={
            hasActiveFilters
              ? t('learnerLiveSessionsPage.noLiveClassroomSessionsMatchYour')
              : t('learnerLiveSessionsPage.upcomingVirtualClassroomSessionsAndLive')
          }
        />
      ) : (
        <>
          <SessionTable
            sessions={pageItems}
            extra={(row) => {
              const isCheckedIn = joined.includes(row.session.id);
              const isLoading = loadingJoinId === row.session.id;
              const isPerson = isInPersonSession(row.session);

              return (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedDetailId(row.session.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg shrink-0"
                    title={t('learnerLiveSessionsPage.viewSessionDetails')}
                  >
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Details</span>
                  </Button>

                  {isPerson && row.session.venue && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectVenueSession(row.session)}
                      className="gap-1.5 text-xs text-secondary-foreground border-border hover:bg-muted h-8 px-2.5 rounded-lg shrink-0 font-medium"
                      title="View classroom venue location & directions"
                    >
                      <MapPin className="h-3.5 w-3.5 text-warning" />
                      {t('learnerLiveSessionsPage.venue')}
                    </Button>
                  )}

                  {isCheckedIn && (
                    <Badge variant="green" dot>
                      {t('learnerLiveSessionsPage.present')}
                    </Badge>
                  )}
                  {isPerson ? (
                    <Button
                      size="sm"
                      onClick={() => setCheckInSession(row.session)}
                      className="gap-1.5 text-xs h-8 px-3 rounded-lg shrink-0 font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {isCheckedIn
                        ? t('learnerLiveSessionsPage.checkedIn')
                        : t('learnerLiveSessionsPage.classroomCheckIn')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleJoin(row.session)}
                      className={`gap-1.5 text-xs h-8 px-3 rounded-lg shrink-0 font-medium ${
                        isCheckedIn
                          ? 'bg-primary-soft text-primary hover:bg-primary/15 border border-primary/30'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs'
                      }`}
                    >
                      <MonitorPlay className="h-3.5 w-3.5" />
                      {isLoading
                        ? t('learnerLiveSessionsPage.connecting')
                        : isCheckedIn
                          ? t('learnerLiveSessionsPage.enterRoom')
                          : t('learnerLiveSessionsPage.join')}
                      <ExternalLink className="h-3 w-3 opacity-60 ml-0.5" />
                    </Button>
                  )}
                </div>
              );
            }}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </>
      )}

      {activeSession ? (
        <LiveSessionWorkspace
          open={Boolean(activeSession)}
          onClose={() => setActiveSession(null)}
          session={activeSession}
          courseTitle={activeSession.course?.title || activeSession.course?.titleEn || 'Course Training'}
          courseCode={activeSession.course?.code || 'TRAINING'}
          trainerName={
            activeSession.trainer
              ? `${activeSession.trainer.firstName} ${activeSession.trainer.lastName}`
              : undefined
          }
          userRole="learner"
        />
      ) : null}

      {selectedAttendanceSessionId ? (
        <DynamicAttendanceModal
          open={Boolean(selectedAttendanceSessionId)}
          onClose={() => setSelectedAttendanceSessionId(null)}
          sessionId={selectedAttendanceSessionId}
          userRole="learner"
        />
      ) : null}

      {checkInSession ? (
        <LearnerCheckInModal
          open={Boolean(checkInSession)}
          onClose={() => setCheckInSession(null)}
          session={checkInSession}
          onSuccess={() => {
            if (checkInSession) {
              setJoined((prev) =>
                prev.includes(checkInSession.id) ? prev : [...prev, checkInSession.id],
              );
            }
          }}
        />
      ) : null}

      {inspectVenueSession && inspectVenueSession.venue ? (
        <VenueDetailModal
          open={Boolean(inspectVenueSession)}
          onClose={() => setInspectVenueSession(null)}
          venue={inspectVenueSession.venue}
          session={inspectVenueSession}
          courseTitle={inspectVenueSession.course?.title || inspectVenueSession.course?.titleEn}
          courseCode={inspectVenueSession.course?.code}
        />
      ) : null}

      {selectedDetailId && (
        <SessionDetailModal
          open={Boolean(selectedDetailId)}
          sessionId={selectedDetailId}
          onClose={() => setSelectedDetailId(null)}
          userRole="learner"
          onJoin={() => {
            const target = sessions.find((s) => s.id === selectedDetailId);
            if (target) {
              handleJoin(target);
            }
          }}
        />
      )}

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground border border-border/60">
        <Video className="h-4 w-4 text-primary flex-shrink-0" />
        <span>
          Clicking <strong>Join</strong> automatically logs your attendance check-in into the
          Ministry of Revenues official audit log and opens your live classroom session directly
          inside the LMS.
        </span>
      </div>
    </PageShell>
  );
}
