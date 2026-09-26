'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle,
  ExternalLink,
  MapPin,
  MonitorPlay,
  QrCode,
  RefreshCw,
  Search,
  Users,
  Video,
  X,
} from 'lucide-react';
import { fetchUpcomingSessions, selfCheckIn } from '@/lib/api/monitoring';
import type { ApiLiveSession } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { tr } from '@/constants/labels';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLms } from '@/lib/lms-store';
import PageShell from '@/components/shared/PageShell';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SessionTable, type SessionRow } from '@/components/features/sessions/shared/SessionTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { LiveSessionWorkspace } from '@/components/features/sessions/virtual/LiveSessionWorkspace';
import { DynamicAttendanceModal } from '@/components/features/sessions/shared/DynamicAttendanceModal';
import { LearnerCheckInModal } from '@/components/features/sessions/in-person/LearnerCheckInModal';
import { VenueDetailModal } from '@/components/features/sessions/in-person/VenueDetailModal';
import { isInPersonSession } from '@/lib/session-mode';

export default function LearnerLiveSessionsPage() {
  const { lang, courses: allCourses, currentUser } = useLms();
  const { tBilingual } = useTranslation();
  const me = currentUser?.id ?? '';
  const courses = useMemo(
    () => allCourses.filter((c) => c.enrolledLearnerIds.includes(me)),
    [allCourses, me],
  );
  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [loadingJoinId, setLoadingJoinId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [joined, setJoined] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<ApiLiveSession | null>(null);
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState<string | null>(
    null,
  );
  const [checkInSession, setCheckInSession] = useState<ApiLiveSession | null>(null);
  const [inspectVenueSession, setInspectVenueSession] = useState<ApiLiveSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');

  const load = () => {
    fetchUpcomingSessions()
      .then((res) => setSessions(res.data))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load live sessions.'),
      );
  };

  useEffect(() => {
    load();
  }, []);

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
        const courseTitleMatch = (course?.title || s.course?.titleEn || '')
          .toLowerCase()
          .includes(q);
        if (!titleMatch && !codeMatch && !courseTitleMatch) return false;
      }
      return true;
    });
  }, [sessions, selectedCourseFilter, searchQuery, courses]);

  const rows = useMemo(() => {
    return filteredSessions.map<SessionRow>((session) => ({
      session,
      courseTitle: session.course?.titleEn || 'Course Session',
      courseCode: session.course?.code || 'TRAINING',
      trainerName: 'Assigned Trainer',
    }));
  }, [filteredSessions]);

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
      title={tBilingual('Live Sessions', 'የቀጥታ ክፍለ-ጊዜዎች')}
      description={tBilingual(
        'Upcoming live sessions for the courses you are enrolled in.',
        'ለተመዘገቡባቸው ኮርሶች የሚካሄዱ መጪ የቀጥታ ስልጠናዎች።',
      )}
    >
      {/* FILTER BAR */}
      <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={tBilingual(
                  'Search session or course code…',
                  'ክፍለ-ጊዜ ወይም የኮርስ ኮድ ይፈልጉ…',
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Course Filter Dropdown */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              aria-label="Filter by course"
              className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">
                {tBilingual('All Courses', 'ሁሉም ኮርሶች')} ({courses.length})
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
                className="h-8 gap-1 text-xs text-slate-500 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                {tBilingual('Clear', 'አጽዳ')}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              className="h-8 gap-1 text-xs text-slate-600"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {tBilingual('Refresh', 'አድስ')}
            </Button>
            <LanguageToggle />
          </div>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {successMsg ? (
        <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilters
              ? tBilingual('No matching live sessions', 'ምንም የሚዛመዱ የቀጥታ ክፍለ-ጊዜዎች የሉም')
              : tBilingual('No live sessions scheduled', 'ምንም የታቀዱ የቀጥታ ክፍለ-ጊዜዎች የሉም')
          }
          description={
            hasActiveFilters
              ? tBilingual(
                  'No live classroom sessions match your current search or course filter. Try resetting filters.',
                  'ከአሁኑ ፍለጋ ወይም ማጣሪያ ጋር የሚዛመድ የቀጥታ ስልጠና የለም።',
                )
              : tBilingual(
                  'Upcoming virtual classroom sessions and live lectures for your enrolled courses will appear here.',
                  'ለተመዘገቡባቸው ኮርሶች መጪ የቀጥታ ክፍለ-ጊዜዎች እዚህ ይታያሉ።',
                )
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
                    variant="outline"
                    onClick={() => setSelectedAttendanceSessionId(row.session.id)}
                    className="gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                    title="View session attendees and verification status"
                  >
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    {tBilingual('Attendees', 'ተሳታፊዎች')}
                  </Button>

                  {isPerson && row.session.venue && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectVenueSession(row.session)}
                      className="gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 h-8 px-2.5 rounded-lg shrink-0 font-medium"
                      title="View classroom venue location & directions"
                    >
                      <MapPin className="h-3.5 w-3.5 text-amber-600" />
                      {tBilingual('Venue', 'ቦታ')}
                    </Button>
                  )}

                  {isCheckedIn && (
                    <Badge variant="green" dot>
                      {tBilingual('Present', 'የተገኘ')}
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
                        ? tBilingual('Checked In', 'ተገኝቷል')
                        : tBilingual('Classroom Check-In', 'የመማሪያ ክፍል መገኘት ማረጋገጫ')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleJoin(row.session)}
                      className={`gap-1.5 text-xs h-8 px-3 rounded-lg shrink-0 font-medium ${
                        isCheckedIn
                          ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs'
                      }`}
                    >
                      <MonitorPlay className="h-3.5 w-3.5" />
                      {isLoading
                        ? tBilingual('Connecting…', 'በመገናኘት ላይ…')
                        : isCheckedIn
                          ? tBilingual('Enter Room', 'ወደ ክፍሉ ግባ')
                          : tBilingual('Join', 'ተቀላቀል')}
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
          courseTitle={activeSession.course?.titleEn || 'Course Training'}
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
          courseTitle={inspectVenueSession.course?.titleEn}
          courseCode={inspectVenueSession.course?.code}
        />
      ) : null}

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 border border-slate-200/60">
        <Video className="h-4 w-4 text-indigo-600 flex-shrink-0" />
        <span>
          Clicking <strong>Join</strong> automatically logs your attendance check-in into the
          Ministry of Revenues official audit log and opens your live classroom session directly
          inside the LMS.
        </span>
      </div>
    </PageShell>
  );
}
