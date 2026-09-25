'use client';

import { useEffect, useState } from 'react';
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
import { useLms } from '@/lib/lms-store';
import { useDashboardStats } from '@/lib/api/useDashboardStats';
import { fetchLiveSessions } from '@/lib/api/monitoring';
import type { ApiLiveSession } from '@/lib/api/types';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { DonutChart, BarChart } from '@/components/ui/charts';

export default function TrainingAdminDashboardPage() {
  const { courses } = useLms();
  const { stats } = useDashboardStats();
  const { lang } = useTranslation();
  const isAmharic = lang === 'am';

  const [sessions, setSessions] = useState<ApiLiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    fetchLiveSessions({ limit: 50 })
      .then((res) => {
        if (!cancelled) {
          setSessions(res.data);
          setSessionsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          setSessionsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      title: isAmharic ? 'ኮርሶች' : 'Courses',
      description: isAmharic
        ? 'ኮርሶችን ይመርምሩ፣ የጸደቁትን ያትሙ እና የህይወት ዑደትን ያስተዳድሩ።'
        : 'Inspect every course, publish approved ones, and manage lifecycle states.',
      icon: BookOpenCheck,
    },
    {
      href: '/training-admin/enrollments',
      title: isAmharic ? 'የተማሪዎች ምዝገባ' : 'Learner Enrollments',
      description: isAmharic
        ? 'ተማሪዎችን በተናጠል ወይም በጅምላ ወደ ኮርሶች ይመድቡ።'
        : 'Assign learners to courses individually or in batches.',
      icon: UsersRound,
    },
    {
      href: '/training-admin/sessions',
      title: isAmharic ? 'የቀጥታ ስልጠናዎች' : 'Live Sessions',
      description: isAmharic
        ? 'ስልጠናዎችን ያቅዱ እና የአሰልጣኞችን ክትትል ይቆጣጠሩ።'
        : 'Schedule sessions and monitor facilitator attendance.',
      icon: Video,
    },
  ];

  // Donut chart: Course Catalog Pipeline
  const coursePipelineSegments = [
    {
      label: isAmharic ? 'የታተሙ' : 'Published',
      value: publishedCourses,
      color: '#10b981',
    },
    {
      label: isAmharic ? 'የጸደቁ (ያልታተሙ)' : 'Approved (Unpublished)',
      value: publishNext.length,
      color: '#06b6d4',
    },
    {
      label: isAmharic ? 'በግምገማ ላይ' : 'Under Review',
      value: underReview.length,
      color: '#6366f1',
    },
    {
      label: isAmharic ? 'ረቂቆች' : 'Drafts',
      value: drafts.length,
      color: '#94a3b8',
    },
  ];

  // Donut chart: Live Training Sessions
  const sessionSegments = [
    {
      label: isAmharic ? 'የመጪ' : 'Upcoming',
      value: sessions.filter((s) => s.status === 'SCHEDULED').length,
      color: '#6366f1',
    },
    {
      label: isAmharic ? 'በቀጥታ ስርጭት ላይ' : 'Live Now',
      value: sessions.filter((s) => s.status === 'LIVE').length,
      color: '#10b981',
    },
    {
      label: isAmharic ? 'የተጠናቀቁ' : 'Completed',
      value: completedSessions.length,
      color: '#94a3b8',
    },
    {
      label: isAmharic ? 'የተሰረዙ' : 'Cancelled',
      value: sessions.filter((s) => s.status === 'CANCELLED').length,
      color: '#f43f5e',
    },
  ];

  return (
    <PageShell
      role="training_admin"
      title={isAmharic ? 'የስልጠና አስተዳዳሪ ዳሽቦርድ' : 'Training Administrator Dashboard'}
      description={
        isAmharic
          ? 'የስልጠና ክፍለ-ጊዜዎችን ያቀናብሩ፣ የተማሪዎችን ምዝገባ ይቆጣጠሩ፣ የኮርሶችን ህትመት ይቆጣጠሩ እና የቀን መቁጠሪያዎችን ይከታተሉ።'
          : 'Manage enterprise courses, oversee learner enrollments, release approved content, and schedule interactive training.'
      }
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpenCheck}
          label={isAmharic ? 'ጠቅላላ ኮርሶች' : 'Total courses'}
          value={totalCourses}
          hint={isAmharic ? 'በሁሉም ደረጃዎች ያሉ' : 'Across all lifecycle stages'}
        />
        <StatCard
          icon={Globe2}
          label={isAmharic ? 'የታተሙ ኮርሶች' : 'Published catalog'}
          value={publishedCourses}
          hint={isAmharic ? 'ለተማሪዎች ዝግጁ የሆኑ' : 'Available to learners'}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={UsersRound}
          label={isAmharic ? 'ንቁ ምዝገባዎች' : 'Active enrollments'}
          value={activeEnrollments}
          hint={isAmharic ? 'በመማር ሂደት ላይ ያሉ' : 'Currently in progress'}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Video}
          label={isAmharic ? 'የቀጥታ ስልጠናዎች' : 'Live sessions'}
          value={totalSessions}
          hint={
            isAmharic
              ? `${upcomingSessions.length} የታቀዱ`
              : `${upcomingSessions.length} upcoming scheduled`
          }
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Graphical Insights: Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Pipeline Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {isAmharic ? 'የኮርስ ካታሎግ ሂደት' : 'Course Catalog Pipeline'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAmharic
                    ? 'የኮርሶች ወቅታዊ የህትመት እና የግምገማ ሁኔታ'
                    : 'Status of courses across development and release'}
                </p>
              </div>
              <Badge variant="blue">
                {isAmharic ? `ጠቅላላ ${totalCourses}` : `Total ${totalCourses}`}
              </Badge>
            </div>
            <div className="mt-6 flex justify-center">
              <DonutChart
                segments={coursePipelineSegments}
                centerLabel={isAmharic ? 'ኮርሶች' : 'Courses'}
                centerValue={totalCourses}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-medium text-emerald-600">
              {isAmharic ? `${publishedCourses} የታተሙ` : `${publishedCourses} published`}
            </span>
            <span>
              {isAmharic
                ? `${publishNext.length} ለመታተም ዝግጁ`
                : `${publishNext.length} ready to release`}
            </span>
          </div>
        </div>

        {/* Live Training Sessions Donut Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {isAmharic ? 'የቀጥታ ስልጠናዎች ሁኔታ' : 'Live Training Schedule'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isAmharic
                    ? 'የተመደቡ እና የተካሄዱ ስልጠናዎች ክፍፍል'
                    : 'Overview of live classes and facilitator sessions'}
                </p>
              </div>
              <Link href="/training-admin/sessions">
                <Button variant="outline" size="sm">
                  {isAmharic ? 'ክፍለ-ጊዜዎች' : 'Sessions'}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex justify-center">
              <DonutChart
                segments={sessionSegments}
                centerLabel={isAmharic ? 'ክፍለ-ጊዜዎች' : 'Sessions'}
                centerValue={sessions.length}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {isAmharic
                ? `የተጠናቀቁ: ${completedSessions.length}`
                : `Completed: ${completedSessions.length}`}
            </span>
            <span className="font-medium text-indigo-600">
              {isAmharic
                ? `${upcomingSessions.length} የታቀዱ`
                : `${upcomingSessions.length} scheduled`}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <PageSection
        title={isAmharic ? 'ፈጣን ተግባራት' : 'Quick actions'}
        description={
          isAmharic ? 'የስልጠና አስተዳደር ዋና ተግባራት' : 'Operational controls for training operations.'
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
                    {isAmharic ? 'ክፈት' : 'Open workspace'}
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
        title={isAmharic ? 'የቀጥታ ስልጠና መርሐግብር' : 'Live training schedule'}
        description={
          isAmharic
            ? 'በቅርብ ጊዜ የታቀዱ የቀጥታ የቪዲዮ ስልጠናዎች።'
            : 'Upcoming interactive sessions for learners.'
        }
        action={
          <Link href="/training-admin/sessions">
            <Button variant="outline" size="sm">
              {isAmharic ? 'ሁሉንም ስልጠናዎች እይ' : 'All live sessions'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        {sessionsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.slice(0, 3).map((session) => {
              const isLive = session.status === 'LIVE';
              const dateStr = new Date(session.scheduledAt).toLocaleDateString(
                isAmharic ? 'am-ET' : undefined,
                {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                },
              );
              const timeStr = new Date(session.scheduledAt).toLocaleTimeString(
                isAmharic ? 'am-ET' : undefined,
                {
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );

              return (
                <div
                  key={session.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isLive ? 'green' : 'blue'}>
                        {isLive
                          ? isAmharic
                            ? '● የቀጥታ ስርጭት'
                            : '● LIVE NOW'
                          : isAmharic
                            ? 'የታቀደ'
                            : 'SCHEDULED'}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-400">
                        {session.durationMinutes} {isAmharic ? 'ደቂቃ' : 'mins'}
                      </span>
                    </div>

                    <h4 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {isAmharic && session.titleAm ? session.titleAm : session.titleEn}
                    </h4>
                    {(() => {
                      const c = courses.find((course) => course.id === session.courseId);
                      const cTitle =
                        isAmharic && (c as any)?.titleAm ? (c as any).titleAm : c?.title;
                      return cTitle ? (
                        <p className="mt-1 text-xs text-slate-500 truncate">{cTitle}</p>
                      ) : null;
                    })()}

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {timeStr}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {isAmharic ? 'ክፍለ-ጊዜ ቁጥር:' : 'Session ID:'} {session.id.slice(0, 6)}
                    </span>
                    <Link href="/training-admin/sessions">
                      <Button size="sm" variant="outline">
                        {isAmharic ? 'አስተዳድር' : 'Manage'}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Video className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-700">
              {isAmharic ? 'ምንም የታቀደ የቀጥታ ስልጠና የለም' : 'No live sessions scheduled'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {isAmharic
                ? 'ለኮርሶች የቀጥታ ስልጠና ክፍለ-ጊዜዎችን ያቅዱ እና አስተባባሪዎችን ይመድቡ።'
                : 'Schedule interactive webinars or classroom sessions for learners.'}
            </p>
          </div>
        )}
      </PageSection>

      {/* Ready to Publish Section with Modern Pagination */}
      <PageSection
        title={isAmharic ? 'ለመታተም ዝግጁ የሆኑ' : 'Ready to publish'}
        description={
          isAmharic
            ? 'በይዘት አጽዳቂዎች የጸደቁ እና ይፋዊ ህትመት የሚጠብቁ ኮርሶች።'
            : 'Courses approved by content reviewers awaiting public release.'
        }
        action={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              {isAmharic ? 'የህትመት ማዕከል' : 'Publishing center'}
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
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="blue">{isAmharic ? 'የጸደቀ' : 'Approved'}</Badge>
                    <span className="text-xs text-slate-400">{course.code}</span>
                  </div>
                  <h4 className="mt-3 font-display text-sm font-bold text-slate-900 line-clamp-1">
                    {isAmharic && (course as any).titleAm ? (course as any).titleAm : course.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {course.description ||
                      (isAmharic ? 'ምንም መግለጫ አልተሰጠም።' : 'No description provided.')}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">{course.category}</span>
                    <Link href="/courses">
                      <Button size="sm" variant="outline">
                        {isAmharic ? 'ኮርስ አትም' : 'Publish course'}
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
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center">
            <p className="text-xs text-slate-400">
              {isAmharic
                ? 'በአሁኑ ጊዜ ህትመት የሚጠብቅ ኮርስ የለም።'
                : 'No courses currently waiting for publication.'}
            </p>
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}
