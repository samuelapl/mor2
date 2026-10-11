'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileQuestion,
  GraduationCap,
  PlayCircle,
  Presentation,
  UsersRound,
  Video,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCourseStore } from '@/lib/stores/course-store';
import { useLiveSessionStore } from '@/lib/stores/live-session-store';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { fetchCourseAssessments } from '@/lib/api/quiz';
import { fetchCourseLearnersProgress } from '@/lib/api/progress';
import type { ApiLearnerProgress, ApiLiveSession } from '@/lib/api/types';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Table, Td } from '@/components/ui/Table';
import { CourseCard } from '@/components/features/courses/CourseCard';
import { VerticalBarChart, BarChart } from '@/components/ui/charts';
import { LiveSessionWorkspace } from '@/components/features/sessions/virtual/LiveSessionWorkspace';
import { useQuizReadinessGate } from '@/components/features/prepared-quiz/useQuizReadinessGate';
import { SessionDetailModal } from '@/components/features/sessions/shared/SessionDetailModal';
import { isInPersonSession } from '@/lib/session-mode';
import { formatSessionDate, formatSessionTime } from '@/lib/app-time';

export default function TrainerDashboardPage() {
  const courses = useCourseStore((s) => s.courses);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { lang, t } = useTranslation('dashboard');
  const isAmharic = lang === 'am';

  const assigned = courses.filter((c) => c.trainerId === currentUser?.id);

  const sessionList = useLiveSessionStore((s) => s.sessions);
  const sessionsLoaded = useLiveSessionStore((s) => s.sessionsLoaded);
  const loadSessions = useLiveSessionStore((s) => s.loadSessions);
  const sessionsLoading = !sessionsLoaded;

  // Overlays
  const [activeLiveSession, setActiveLiveSession] = useState<ApiLiveSession | null>(null);
  // The graded quiz must be prepared before the trainer can start or join the session.
  const quizGate = useQuizReadinessGate();
  const startSession = async (session: ApiLiveSession) => {
    if (await quizGate.guard(session.id)) setActiveLiveSession(session);
  };
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    void loadSessions();
  }, [currentUser?.id, loadSessions]);

  const allSessions = useMemo(() => {
    const assignedIds = new Set(assigned.map((c) => c.id));
    return sessionList.filter((s) => assignedIds.has(s.courseId));
  }, [sessionList, assigned]);

  const upcomingSessions = allSessions.filter(
    (s) => s.status === 'SCHEDULED' || s.status === 'LIVE',
  );
  const completedSessions = allSessions.filter((s) => s.status === 'COMPLETED');

  const [quizReady, setQuizReady] = useState<Record<string, boolean>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [learners, setLearners] = useState<ApiLearnerProgress[] | null>(null);
  const [learnersError, setLearnersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        assigned.map(async (course) => {
          try {
            const list = await fetchCourseAssessments(course.id);
            return { id: course.id, hasQuiz: list.length > 0 };
          } catch {
            return { id: course.id, hasQuiz: false };
          }
        }),
      );
      if (cancelled) return;
      setQuizReady(Object.fromEntries(entries.map((entry) => [entry.id, entry.hasQuiz])));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, assigned.length]);

  useEffect(() => {
    if (!selectedCourseId) {
      setLearners(null);
      return;
    }
    let cancelled = false;
    setLearners(null);
    setLearnersError(null);
    fetchCourseLearnersProgress(selectedCourseId)
      .then((res) => {
        if (!cancelled) setLearners(res.learners);
      })
      .catch(() => {
        if (!cancelled)
          setLearnersError(
            t('trainerDashboardPage.unableToLoadLearnerProgress'),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, isAmharic]);

  const quizzes = useMemo(
    () => assigned.filter((course) => quizReady[course.id]),
    [assigned, quizReady],
  );
  const assignedPage = usePagination(assigned, 6);
  const learnersPage = usePagination(learners ?? [], 8);

  const totalEnrolledLearners = useMemo(() => {
    const ids = new Set<string>();
    assigned.forEach((c) => c.enrolledLearnerIds.forEach((id) => ids.add(id)));
    return ids.size;
  }, [assigned]);

  const quickLinks = [
    {
      href: '/trainer/sessions',
      title: t('trainerDashboardPage.myLiveSessions'),
      description: t('trainerDashboardPage.scheduleManageAndFacilitateLiveClasses'),
      icon: Presentation,
    },
    {
      href: '/trainer/question-bank',
      title: t('trainerDashboardPage.questionBankQuizzes'),
      description: t('trainerDashboardPage.authorQuestionsAndAssembleComprehensiveQ'),
      icon: FileQuestion,
    },
    {
      href: '/trainer/attendance',
      title: t('trainerDashboardPage.attendanceTracker'),
      description: t('trainerDashboardPage.trackCheckInsDurationAndAttendance'),
      icon: ClipboardCheck,
    },
  ];

  const sessionStatusSegments = [
    {
      label: t('trainerDashboardPage.upcoming'),
      value: allSessions.filter((s) => s.status === 'SCHEDULED').length,
      color: '#6366f1',
    },
    {
      label: t('trainerDashboardPage.liveNow'),
      value: allSessions.filter((s) => s.status === 'LIVE').length,
      color: '#10b981',
    },
    {
      label: t('trainerDashboardPage.completed'),
      value: completedSessions.length,
      color: '#94a3b8',
    },
    {
      label: t('trainerDashboardPage.cancelled'),
      value: allSessions.filter((s) => s.status === 'CANCELLED').length,
      color: '#f43f5e',
    },
  ];

  const learnerStatusSegments = useMemo(() => {
    if (!learners || learners.length === 0) return [];
    const completed = learners.filter((l) => l.progressPercent >= 100).length;
    const inProg = learners.filter((l) => l.progressPercent > 0 && l.progressPercent < 100).length;
    const notStarted = learners.filter((l) => l.progressPercent === 0).length;
    return [
      { label: t('trainerDashboardPage.completed'), value: completed, color: '#10b981' },
      { label: t('trainerDashboardPage.inProgress'), value: inProg, color: '#6366f1' },
      { label: t('trainerDashboardPage.notStarted'), value: notStarted, color: '#cbd5e1' },
    ];
  }, [learners, isAmharic]);

  const courseEnrollmentBars = useMemo(() => {
    return assigned.slice(0, 5).map((c) => ({
      label: isAmharic && (c as any).titleAm ? (c as any).titleAm : c.title,
      value: c.enrolledLearnerIds.length,
      subLabel: t('trainerDashboardPage.learners', { count: c.enrolledLearnerIds.length }),
      color: '#6366f1',
    }));
  }, [assigned, isAmharic]);

  return (
    <PageShell
      role="trainer"
      title={t('trainerDashboardPage.trainerDashboard')}
      description={
        t('trainerDashboardPage.manageLiveTrainingSessionsMarkStudent')
      }
    >
      {/* Top Stat Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Presentation}
          label={t('trainerDashboardPage.assignedCourses')}
          value={assigned.length}
          hint={t('trainerDashboardPage.coursesYouFacilitate')}
        />
        <StatCard
          icon={Video}
          label={t('trainerDashboardPage.upcomingSessions')}
          value={upcomingSessions.length}
          hint={
            t('trainerDashboardPage.totalScheduled', { count: allSessions.length })
          }
          iconClassName="bg-primary-soft text-primary"
        />
        <StatCard
          icon={UsersRound}
          label={t('trainerDashboardPage.totalLearners')}
          value={totalEnrolledLearners}
          hint={t('trainerDashboardPage.acrossAssignedCourses')}
          iconClassName="bg-info-soft text-info"
        />
        <StatCard
          icon={FileQuestion}
          label={t('trainerDashboardPage.quizzesReady')}
          value={quizzes.length}
          hint={t('trainerDashboardPage.fromQuestionBank')}
          iconClassName="bg-success-soft text-success"
        />
      </div>

      {/* Graphical Section: Session Distribution + Course Enrollments */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Session Distribution Chart */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">
                  {t('trainerDashboardPage.liveSessionDistribution')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('trainerDashboardPage.breakdownOfScheduledAndCompletedTraining')}
                </p>
              </div>
              <Link href="/trainer/sessions">
                <Button variant="outline" size="sm">
                  {t('trainerDashboardPage.sessions')}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <VerticalBarChart
                items={sessionStatusSegments}
                totalValue={allSessions.length}
                unitLabel={t('trainerDashboardPage.sessions')}
                emptyText={t('trainerDashboardPage.noSessionsCreatedInDatabase')}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {t('trainerDashboardPage.completedTraining', { count: completedSessions.length })}
            </span>
            <span className="font-medium text-primary">
              {t('trainerDashboardPage.upcoming2', { count: upcomingSessions.length })}
            </span>
          </div>
        </div>

        {/* Course Enrollment Breakdown */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">
                  {t('trainerDashboardPage.enrollmentByCourse')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('trainerDashboardPage.studentEnrollmentAcrossYourTrainingCatal')}
                </p>
              </div>
              <Badge variant="blue">
                {t('trainerDashboardPage.courses', { count: assigned.length })}
              </Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={courseEnrollmentBars}
                emptyText={t('trainerDashboardPage.noCoursesAssignedYet')}
                barColor="#4f46e5"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {t('trainerDashboardPage.totalEnrolledStudents', { totalEnrolledLearners })}
            </span>
            <Link
              href="/trainer/sessions"
              className="font-semibold text-primary hover:underline"
            >
              {t('trainerDashboardPage.viewSessionsAttendance')}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <PageSection
        title={t('trainerDashboardPage.quickActions')}
        description={t('trainerDashboardPage.directAccessToTrainerWorkflows')}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card interactive className="flex h-full flex-col justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4">
                    <CardTitle>{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-500 transition-transform duration-200 group-hover:translate-x-0.5">
                    {t('trainerDashboardPage.openWorkspace')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageSection>

      {/* Upcoming Sessions List */}
      <PageSection
        title={t('trainerDashboardPage.upcomingLiveSessions')}
        description={
          t('trainerDashboardPage.sessionsScheduledForYourAssignedCourses')
        }
        action={
          <Link href="/trainer/sessions">
            <Button variant="outline" size="sm">
              {t('trainerDashboardPage.allSessions')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-36 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.slice(0, 3).map((session) => {
              const isLive = session.status === 'LIVE';
              // Platform time (EAT), whatever the browser's time zone.
              const locale = isAmharic ? 'am-ET' : undefined;
              const dateStr = formatSessionDate(
                session.scheduledAt,
                { weekday: 'short', month: 'short', day: 'numeric' },
                locale,
              );
              const timeStr = formatSessionTime(session.scheduledAt, locale);

              return (
                <div
                  key={session.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-soft ring-super-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isLive ? 'green' : 'blue'}>
                        {isLive
                          ? t('trainerDashboardPage.liveNow2')
                          : t('trainerDashboardPage.scheduled')}
                      </Badge>
                      <span className="text-[11px] font-medium text-subtle-foreground">
                        {session.durationMinutes} {t('trainerDashboardPage.mins')}
                      </span>
                    </div>

                    <h4 className="mt-3 font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {isAmharic ? session.titleAm || session.titleEn : session.titleEn}
                    </h4>
                    {(() => {
                      const c = courses.find((course) => course.id === session.courseId);
                      const cTitle =
                        isAmharic && (c as any)?.titleAm ? (c as any).titleAm : c?.title;
                      return cTitle ? (
                        <p className="mt-1 text-xs text-muted-foreground truncate">{cTitle}</p>
                      ) : null;
                    })()}

                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-subtle-foreground" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3">
                    {isInPersonSession(session) ? (
                      <Link href="/trainer/attendance" className="flex-1">
                        <Button
                          size="sm"
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {t('trainerDashboardPage.classroomAttendance')}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void startSession(session)}
                        className={
                          isLive
                            ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'flex-1'
                        }
                      >
                        <Video className="h-3.5 w-3.5" />
                        {isLive
                          ? t('trainerDashboardPage.startMeeting')
                          : t('trainerDashboardPage.startSession')}
                      </Button>
                    )}
                    <Link href="/trainer/sessions">
                      <Button
                        size="sm"
                        variant="outline"
                        title={t('trainerDashboardPage.sessionDetailsAttendance')}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-subtle-foreground">
              <Presentation className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-secondary-foreground">
              {t('trainerDashboardPage.noScheduledSessions')}
            </p>
            <p className="mt-1 text-xs text-subtle-foreground">
              {t('trainerDashboardPage.scheduleLiveVideoSessionsForYour')}
            </p>
          </div>
        )}
      </PageSection>

      {/* Assigned Courses Section with Modern Pagination */}
      <PageSection
        title={t('trainerDashboardPage.assignedCourses')}
        description={
          t('trainerDashboardPage.coursesAssignedToYouForInstruction')
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignedPage.pageItems.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              extraBadge={
                quizReady[course.id] ? (
                  <Badge variant="green">{t('trainerDashboardPage.quizReady')}</Badge>
                ) : (
                  <Badge variant="outline">{t('trainerDashboardPage.noQuiz')}</Badge>
                )
              }
            >
              <Link href="/trainer/question-bank">
                <Button size="sm" variant="outline">
                  {t('trainerDashboardPage.questionBank')}
                </Button>
              </Link>
            </CourseCard>
          ))}
        </div>
        <Pagination
          page={assignedPage.page}
          totalPages={assignedPage.totalPages}
          onPageChange={assignedPage.setPage}
          totalItems={assigned.length}
          pageSize={assignedPage.pageSize}
          onPageSizeChange={assignedPage.setPageSize}
          pageSizeOptions={[6, 12, 24, 48]}
        />
      </PageSection>

      {/* Learner Progress & Achievement */}
      <PageSection
        title={t('trainerDashboardPage.learnerProgressPerformance')}
        description={
          t('trainerDashboardPage.inspectStudentCompletionAndProgressAcros')
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-secondary-foreground">
              {t('trainerDashboardPage.filterByCourse')}
            </label>
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
              className="rounded-xl border border-border/90 bg-card px-3 py-2 text-sm text-secondary-foreground shadow-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/10"
            >
              <option value="">{t('trainerDashboardPage.selectACourse')}</option>
              {assigned.map((course) => (
                <option key={course.id} value={course.id}>
                  {isAmharic && (course as any).titleAm ? (course as any).titleAm : course.title}
                </option>
              ))}
            </select>
          </div>

          {learners && learners.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t('trainerDashboardPage.studentsEnrolled', { count: learners.length })}
              </span>
              <span className="font-semibold text-success">
                {t('trainerDashboardPage.completed2', { count: learners.filter((l) => l.progressPercent >= 100).length })}
              </span>
            </div>
          )}
        </div>

        {learnersError ? (
          <p className="text-sm text-red-500">{learnersError}</p>
        ) : learners === null ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-8 text-center">
            <p className="text-xs text-subtle-foreground">
              {t('trainerDashboardPage.chooseACourseAboveToInspect')}
            </p>
          </div>
        ) : learners.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-8 text-center">
            <p className="text-xs text-subtle-foreground">
              {t('trainerDashboardPage.noEnrolledLearnersInThisCourse')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card p-4">
              <h5 className="font-display text-xs font-bold text-foreground mb-2">
                {t('trainerDashboardPage.learnerProgressDistribution')}
              </h5>
              <VerticalBarChart
                items={learnerStatusSegments}
                totalValue={learners.length}
                unitLabel={t('trainerDashboardPage.students')}
                emptyText={t('trainerDashboardPage.noStudentsFoundInDatabase')}
              />
            </div>

            <Table
              columns={[
                t('trainerDashboardPage.learner'),
                t('trainerDashboardPage.email'),
                t('trainerDashboardPage.progress'),
                t('trainerDashboardPage.status'),
              ]}
            >
              {learnersPage.pageItems.map((learner) => (
                <tr key={learner.userId}>
                  <Td>
                    <span className="font-medium text-foreground">
                      {learner.firstName} {learner.lastName}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-sm text-muted-foreground">{learner.email}</span>
                  </Td>
                  <Td className="w-56">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={learner.progressPercent} className="flex-1" />
                      <span className="w-10 text-right text-xs font-medium text-secondary-foreground">
                        {learner.progressPercent}%
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={learner.progressPercent >= 100 ? 'green' : 'blue'}>
                      {learner.progressPercent >= 100
                        ? t('learnerCoursesPage.completed')
                        : t('trainerDashboardPage.active')}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={learnersPage.page}
              totalPages={learnersPage.totalPages}
              onPageChange={learnersPage.setPage}
              totalItems={learners.length}
              pageSize={learnersPage.pageSize}
              onPageSizeChange={learnersPage.setPageSize}
              pageSizeOptions={[8, 16, 32, 64]}
            />
          </div>
        )}
      </PageSection>

      {quizGate.modal}

      {/* Full-Screen Live Meeting Overlay */}
      {activeLiveSession && (
        <LiveSessionWorkspace
          open={activeLiveSession !== null}
          session={activeLiveSession}
          onClose={() => setActiveLiveSession(null)}
        />
      )}

      {/* Full-Screen Session Details Overlay */}
      {detailSessionId && (
        <SessionDetailModal
          open={detailSessionId !== null}
          sessionId={detailSessionId}
          onClose={() => setDetailSessionId(null)}
          onJoin={() => {
            const s = allSessions.find((x) => x.id === detailSessionId);
            setDetailSessionId(null);
            if (s) void startSession(s);
          }}
        />
      )}
    </PageShell>
  );
}
