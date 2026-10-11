'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Globe2,
  UsersRound,
  Video,
} from 'lucide-react';
import { useCourseStore } from '@/lib/stores/course-store';
import { useLiveSessionStore } from '@/lib/stores/live-session-store';
import { useDashboardStats } from '@/lib/api/useDashboardStats';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { VerticalBarChart, BarChart } from '@/components/ui/charts';
import { formatSessionDate, formatSessionTime } from '@/lib/app-time';

export default function TrainingAdminDashboardPage() {
  const courses = useCourseStore((s) => s.courses);
  const { stats } = useDashboardStats();
  const { lang, t } = useTranslation('dashboard');
  const isAmharic = lang === 'am';

  const sessionList = useLiveSessionStore((s) => s.sessions);
  const sessionsLoaded = useLiveSessionStore((s) => s.sessionsLoaded);
  const loadSessions = useLiveSessionStore((s) => s.loadSessions);
  // This dashboard showed the first 50 sessions; the server order is the same for any limit.
  const sessions = useMemo(() => sessionList.slice(0, 50), [sessionList]);
  const sessionsLoading = !sessionsLoaded;

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const published = courses.filter((c) => c.published);
  const underReview = courses.filter((c) => c.status === 'under_review');
  const drafts = courses.filter((c) => c.status === 'draft');
  const publishNext = courses.filter((c) => c.status === 'approved' && !c.published);
  const publishNextPage = usePagination(publishNext, 6);

  const totalCourses = stats?.totals.courses ?? courses.length;
  const publishedCourses = stats?.statuses.publishedCourses ?? published.length;
  const activeEnrollments = stats?.statuses.activeEnrollments ?? 0;
  const totalSessions = stats?.totals.liveSessions ?? sessions.length;

  const upcomingSessions = sessions.filter((s) => s.status === 'SCHEDULED' || s.status === 'LIVE');
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');

  const quickLinks = [
    {
      href: '/courses',
      title: t('trainingAdminDashboardPage.courses'),
      description: t('trainingAdminDashboardPage.inspectEveryCoursePublishApprovedOnes'),
      icon: BookOpenCheck,
    },
    {
      href: '/training-admin/enrollments',
      title: t('trainingAdminDashboardPage.learnerEnrollments'),
      description: t('trainingAdminDashboardPage.assignLearnersToCoursesIndividuallyOr'),
      icon: UsersRound,
    },
    {
      href: '/training-admin/sessions',
      title: t('learnerLiveSessionsPage.liveSessions'),
      description: t('trainingAdminDashboardPage.scheduleSessionsAndMonitorFacilitatorAtt'),
      icon: Video,
    },
  ];

  // Donut chart: Course Catalog Pipeline
  const coursePipelineSegments = [
    {
      label: t('trainingAdminDashboardPage.published'),
      value: publishedCourses,
      color: '#10b981',
    },
    {
      label: t('trainingAdminDashboardPage.approvedUnpublished'),
      value: publishNext.length,
      color: '#06b6d4',
    },
    {
      label: t('trainingAdminDashboardPage.underReview'),
      value: underReview.length,
      color: '#6366f1',
    },
    {
      label: t('trainingAdminDashboardPage.drafts'),
      value: drafts.length,
      color: '#94a3b8',
    },
  ];

  // Donut chart: Live Training Sessions
  const sessionSegments = [
    {
      label: t('trainerDashboardPage.upcoming'),
      value: sessions.filter((s) => s.status === 'SCHEDULED').length,
      color: '#6366f1',
    },
    {
      label: t('trainerDashboardPage.liveNow'),
      value: sessions.filter((s) => s.status === 'LIVE').length,
      color: '#10b981',
    },
    {
      label: t('trainerDashboardPage.completed'),
      value: completedSessions.length,
      color: '#94a3b8',
    },
    {
      label: t('trainerDashboardPage.cancelled'),
      value: sessions.filter((s) => s.status === 'CANCELLED').length,
      color: '#f43f5e',
    },
  ];

  return (
    <PageShell
      role="training_admin"
      title={t('trainingAdminDashboardPage.trainingAdministratorDashboard')}
      description={
        t('trainingAdminDashboardPage.manageEnterpriseCoursesOverseeLearnerEnr')
      }
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpenCheck}
          label={t('trainingAdminDashboardPage.totalCourses')}
          value={totalCourses}
          hint={t('trainingAdminDashboardPage.acrossAllLifecycleStages')}
        />
        <StatCard
          icon={Globe2}
          label={t('trainingAdminDashboardPage.publishedCatalog')}
          value={publishedCourses}
          hint={t('trainingAdminDashboardPage.availableToLearners')}
          iconClassName="bg-success-soft text-success"
        />
        <StatCard
          icon={UsersRound}
          label={t('trainingAdminDashboardPage.activeEnrollments')}
          value={activeEnrollments}
          hint={t('trainingAdminDashboardPage.currentlyInProgress')}
          iconClassName="bg-info-soft text-info"
        />
        <StatCard
          icon={Video}
          label={t('trainingAdminDashboardPage.liveSessions2')}
          value={totalSessions}
          hint={
            t('trainingAdminDashboardPage.upcomingScheduled', { count: upcomingSessions.length })
          }
          iconClassName="bg-primary-soft text-primary"
        />
      </div>

      {/* Graphical Insights: Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Pipeline Chart */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">
                  {t('trainingAdminDashboardPage.courseCatalogPipeline')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('trainingAdminDashboardPage.statusOfCoursesAcrossDevelopmentAnd')}
                </p>
              </div>
              <Badge variant="blue">
                {t('trainingAdminDashboardPage.total', { totalCourses })}
              </Badge>
            </div>
            <div className="mt-6">
              <VerticalBarChart
                items={coursePipelineSegments}
                totalValue={totalCourses}
                unitLabel={t('trainingAdminDashboardPage.courses')}
                emptyText={t('trainingAdminDashboardPage.noCoursesFoundInDatabase')}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span className="font-medium text-success">
              {t('trainingAdminDashboardPage.published2', { publishedCourses })}
            </span>
            <span>
              {t('trainingAdminDashboardPage.readyToRelease', { count: publishNext.length })}
            </span>
          </div>
        </div>

        {/* Live Training Sessions Vertical Bar Chart */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">
                  {t('trainingAdminDashboardPage.liveTrainingSchedule')}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t('trainingAdminDashboardPage.overviewOfLiveClassesAndFacilitator')}
                </p>
              </div>
              <Link href="/training-admin/sessions">
                <Button variant="outline" size="sm">
                  {t('trainerDashboardPage.sessions')}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <VerticalBarChart
                items={sessionSegments}
                totalValue={sessions.length}
                unitLabel={t('trainerDashboardPage.sessions')}
                emptyText={t('trainingAdminDashboardPage.noSessionsScheduledInDatabase')}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {t('trainingAdminDashboardPage.completed', { count: completedSessions.length })}
            </span>
            <span className="font-medium text-primary">
              {t('trainingAdminDashboardPage.scheduled', { count: upcomingSessions.length })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <PageSection
        title={t('trainerDashboardPage.quickActions')}
        description={
          t('trainingAdminDashboardPage.operationalControlsForTrainingOperations')
        }
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

      {/* Live Training Sessions List */}
      <PageSection
        title={t('trainingAdminDashboardPage.liveTrainingSchedule2')}
        description={
          t('trainingAdminDashboardPage.upcomingInteractiveSessionsForLearners')
        }
        action={
          <Link href="/training-admin/sessions">
            <Button variant="outline" size="sm">
              {t('trainingAdminDashboardPage.allLiveSessions')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
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
                      {isAmharic && session.titleAm ? session.titleAm : session.titleEn}
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

                  <div className="mt-5 border-t border-border/60 pt-3 flex items-center justify-between">
                    <span className="text-xs text-subtle-foreground">
                      {t('trainingAdminDashboardPage.sessionId')} {session.id.slice(0, 6)}
                    </span>
                    <Link href="/training-admin/sessions">
                      <Button size="sm" variant="outline">
                        {t('trainingAdminDashboardPage.manage')}
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
              <Video className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-secondary-foreground">
              {t('learnerLiveSessionsPage.noLiveSessionsScheduled')}
            </p>
            <p className="mt-1 text-xs text-subtle-foreground">
              {t('trainingAdminDashboardPage.scheduleInteractiveWebinarsOrClassroomSe')}
            </p>
          </div>
        )}
      </PageSection>

      {/* Ready to Publish Section with Modern Pagination */}
      <PageSection
        title={t('trainingAdminDashboardPage.readyToPublish')}
        description={
          t('trainingAdminDashboardPage.coursesApprovedByContentReviewersAwaitin')
        }
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              {t('trainingAdminDashboardPage.publishingCenter')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {publishNext.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {publishNextPage.pageItems.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft ring-super-soft"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="blue">{t('trainingAdminDashboardPage.approved')}</Badge>
                    <span className="text-xs text-subtle-foreground">{course.code}</span>
                  </div>
                  <h4 className="mt-3 font-display text-sm font-bold text-foreground line-clamp-1">
                    {isAmharic && (course as any).titleAm ? (course as any).titleAm : course.title}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {course.description ||
                      (t('trainingAdminDashboardPage.noDescriptionProvided'))}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-xs text-subtle-foreground">{course.category}</span>
                    <Link href="/courses">
                      <Button size="sm" variant="outline">
                        {t('trainingAdminDashboardPage.publishCourse')}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={publishNextPage.page}
              totalPages={publishNextPage.totalPages}
              onPageChange={publishNextPage.setPage}
              totalItems={publishNext.length}
              pageSize={publishNextPage.pageSize}
              onPageSizeChange={publishNextPage.setPageSize}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-8 text-center">
            <p className="text-xs text-subtle-foreground">
              {t('trainingAdminDashboardPage.noCoursesCurrentlyWaitingForPublication')}
            </p>
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}
