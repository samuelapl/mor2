'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ScrollText,
  Settings,
  ShieldCheck,
  UsersRound,
  Video,
} from 'lucide-react';
import type { ApiAuditLog } from '@/lib/api/types';
import { fetchAuditLogs } from '@/lib/api/monitoring';
import { useLiveSessionStore } from '@/lib/stores/live-session-store';
import { useDashboardStats } from '@/lib/api/useDashboardStats';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VerticalBarChart, BarChart } from '@/components/ui/charts';

const ROLE_COLORS: Record<string, string> = {
  SYSTEM_ADMIN: '#ef4444',
  TRAINING_ADMIN: '#f59e0b',
  COURSE_OWNER: '#8b5cf6',
  CONTENT_APPROVER: '#06b6d4',
  TRAINER: '#3b82f6',
  LEARNER: '#10b981',
};

export default function SystemAdminDashboardPage() {
  const { stats, loading: statsLoading } = useDashboardStats();
  const { lang, t } = useTranslation('admin');
  const isAmharic = lang === 'am';

  const sessions = useLiveSessionStore((s) => s.sessions);
  const loadSessions = useLiveSessionStore((s) => s.loadSessions);
  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'SCHEDULED' || s.status === 'LIVE').length,
    [sessions],
  );
  const [recentLogs, setRecentLogs] = useState<ApiAuditLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadSessions();
    fetchAuditLogs({ limit: 6 })
      .then((res) => {
        if (!cancelled) setRecentLogs(res.data);
      })
      .catch(() => {
        if (!cancelled) setRecentLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const usersCount = stats?.totals.users ?? 0;
  const coursesCount = stats?.totals.courses ?? 0;
  const enrollmentsCount = stats?.totals.enrollments ?? 0;
  const activeEnrollments = stats?.statuses.activeEnrollments ?? 0;
  const publishedCount = stats?.statuses.publishedCourses ?? 0;
  const pendingApprovals = stats?.statuses.pendingApprovals ?? 0;
  const certificatesCount = stats?.statuses.certificatesIssued ?? 0;

  const roleLabels: Record<string, string> = {
    SYSTEM_ADMIN: t('systemAdminDashboardPage.systemAdmin'),
    TRAINING_ADMIN: t('systemAdminDashboardPage.trainingAdmin'),
    COURSE_OWNER: t('systemAdminDashboardPage.courseOwner'),
    CONTENT_APPROVER: t('systemAdminDashboardPage.contentApprover'),
    TRAINER: t('systemAdminDashboardPage.trainer'),
    LEARNER: t('systemAdminDashboardPage.learner'),
  };

  const quickLinks = [
    {
      href: '/system-admin/users',
      title: t('systemAdminDashboardPage.usersRoles'),
      description: t('systemAdminDashboardPage.managePlatformAccountsAndAssignAdministr'),
      icon: UsersRound,
    },
    {
      href: '/system-admin/settings',
      title: t('systemAdminDashboardPage.systemSettings'),
      description: t('systemAdminDashboardPage.configureSystemParametersSecurityPolicie'),
      icon: Settings,
    },
    {
      href: '/system-admin/audit-logs',
      title: t('systemAdminDashboardPage.auditTrail'),
      description: t('systemAdminDashboardPage.reviewSecurityLogsAuthenticationAndState'),
      icon: ScrollText,
    },
  ];

  // Vertical Bar Chart: Users by Role (Fetched from database)
  const roleSegments = useMemo(() => {
    const roleCountMap = new Map<string, number>();
    if (stats?.roles) {
      for (const r of stats.roles) {
        roleCountMap.set(r.role, r.count);
      }
    }
    const allRoles = [
      'SYSTEM_ADMIN',
      'TRAINING_ADMIN',
      'COURSE_OWNER',
      'CONTENT_APPROVER',
      'TRAINER',
      'LEARNER',
    ];
    return allRoles.map((roleKey) => ({
      label: roleLabels[roleKey] || roleKey,
      value: roleCountMap.get(roleKey) ?? 0,
      color: ROLE_COLORS[roleKey] || '#64748b',
      subLabel: roleKey.replace('_', ' ').toLowerCase(),
    }));
  }, [stats?.roles, isAmharic]);

  // Bar chart: Platform Activity & Engagement Metrics
  const metricBars = useMemo(() => {
    return [
      {
        label: t('systemAdminDashboardPage.activeEnrollments'),
        value: activeEnrollments,
        subLabel: t('systemAdminDashboardPage.total', { enrollmentsCount }),
        color: '#3b82f6',
      },
      {
        label: t('systemAdminDashboardPage.publishedCourses'),
        value: publishedCount,
        subLabel: t('systemAdminDashboardPage.total2', { coursesCount }),
        color: '#10b981',
      },
      {
        label: t('systemAdminDashboardPage.pendingApprovals'),
        value: pendingApprovals,
        subLabel: t('systemAdminDashboardPage.awaitingReview'),
        color: '#f59e0b',
      },
      {
        label: t('systemAdminDashboardPage.certificatesIssued'),
        value: certificatesCount,
        subLabel: t('systemAdminDashboardPage.platformCompletions'),
        color: '#8b5cf6',
      },
      {
        label: t('systemAdminDashboardPage.upcomingSessions'),
        value: activeSessions,
        subLabel: t('systemAdminDashboardPage.liveVideoTraining'),
        color: '#06b6d4',
      },
    ];
  }, [
    activeEnrollments,
    enrollmentsCount,
    publishedCount,
    coursesCount,
    pendingApprovals,
    certificatesCount,
    activeSessions,
    isAmharic,
  ]);

  return (
    <PageShell
      role="system_admin"
      title={t('systemAdminDashboardPage.systemAdministratorDashboard')}
      description={
        t('systemAdminDashboardPage.overviewOfPlatformOperationsSecurityPost')
      }
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UsersRound}
          label={t('systemAdminDashboardPage.totalUsers')}
          value={usersCount}
          hint={
            t('systemAdminDashboardPage.activeEnrollments2', { activeEnrollments })
          }
        />
        <StatCard
          icon={BookOpen}
          label={t('systemAdminDashboardPage.totalCourses')}
          value={coursesCount}
          hint={t('systemAdminDashboardPage.published', { publishedCount })}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={t('systemAdminDashboardPage.totalEnrollments')}
          value={enrollmentsCount}
          hint={
            t('systemAdminDashboardPage.certificatesIssued2', { certificatesCount })
          }
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Video}
          label={t('systemAdminDashboardPage.activeLiveSessions')}
          value={activeSessions}
          hint={t('systemAdminDashboardPage.scheduledOrBroadcastReady')}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Graphical Insights: Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* User Role Distribution Vertical Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {t('systemAdminDashboardPage.userRoleDistribution')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('systemAdminDashboardPage.allocationOfPlatformAccountsAcrossAccess')}
                </p>
              </div>
              <Badge variant="slate">
                {t('systemAdminDashboardPage.totalUsers2', { usersCount })}
              </Badge>
            </div>
            <div className="mt-6">
              <VerticalBarChart
                items={roleSegments}
                totalValue={usersCount}
                unitLabel={t('systemAdminDashboardPage.users')}
                emptyText={t('systemAdminDashboardPage.noUsersRecordedInDatabase')}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400 flex items-center justify-between">
            <span>{t('systemAdminDashboardPage.liveDatabaseRecord')}</span>
            <span className="font-medium text-slate-600">
              {roleSegments.filter((r) => r.value > 0).length} {t('systemAdminDashboardPage.activeRolesInDb')}
            </span>
          </div>
        </div>

        {/* Platform Engagement Metrics Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {t('systemAdminDashboardPage.platformOperationsGrowth')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('systemAdminDashboardPage.engagementAndPublishingStatistics')}
                </p>
              </div>
              <Badge variant="blue">{t('systemAdminDashboardPage.realTimeStats')}</Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={metricBars}
                emptyText={
                  t('systemAdminDashboardPage.noOperationalMetricsRecorded')
                }
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {t('systemAdminDashboardPage.totalEnrollments2', { enrollmentsCount })}
            </span>
            <Link
              href="/system-admin/audit-logs"
              className="font-semibold text-indigo-600 hover:underline"
            >
              {t('systemAdminDashboardPage.reviewAuditLogs')}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <PageSection
            title={t('systemAdminDashboardPage.quickActions')}
            description={t('systemAdminDashboardPage.administrativeControlCenter')}
          >
            <div className="space-y-3.5">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} className="group block">
                    <Card interactive className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-200 group-hover:scale-110">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{link.title}</CardTitle>
                          <CardDescription className="text-xs">{link.description}</CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </Card>
                  </Link>
                );
              })}
            </div>
          </PageSection>
        </div>

        <div className="lg:col-span-3">
          <PageSection
            title={t('systemAdminDashboardPage.recentAuditActivity')}
            description={
              t('systemAdminDashboardPage.latestSecurityAndOperationalEntriesIn')
            }
            action={
              <Link href="/system-admin/audit-logs">
                <Button variant="outline" size="sm">
                  {t('systemAdminDashboardPage.viewFullTrail')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft ring-super-soft">
              <ul className="divide-y divide-slate-100/80">
                {recentLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-800">
                        <span className="font-semibold text-slate-900">
                          {log.user
                            ? `${log.user.firstName} ${log.user.lastName}`
                            : t('systemAdminDashboardPage.systemService')}
                        </span>{' '}
                        <span className="text-slate-600">{log.action}</span>
                        {log.entityId ? (
                          <span className="font-mono text-[11px] text-slate-400">
                            {' '}
                            “{log.entityId.slice(0, 8)}…”
                          </span>
                        ) : null}
                      </p>
                      <span className="mt-1 inline-block text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString(lang === 'am' ? 'am-ET' : 'en-US')}
                      </span>
                    </div>
                    <Badge variant="slate" className="shrink-0 text-[10px]">
                      {log.entity || 'SYSTEM'}
                    </Badge>
                  </li>
                ))}
                {recentLogs.length === 0 ? (
                  <li className="px-5 py-8 text-center text-xs text-slate-400">
                    {t('systemAdminDashboardPage.noRecentAuditActivityRecorded')}
                  </li>
                ) : null}
              </ul>
            </div>
          </PageSection>
        </div>
      </div>
    </PageShell>
  );
}
