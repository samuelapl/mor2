"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import type { ApiAuditLog } from "@/lib/api/types";
import { fetchAuditLogs, fetchLiveSessions } from "@/lib/api/monitoring";
import { useDashboardStats } from "@/lib/api/useDashboardStats";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DonutChart, BarChart } from "@/components/ui/charts";

const QUICK_LINKS = [
  {
    href: "/system-admin/users",
    title: "Users & Roles",
    description: "Manage platform accounts and assign administrative roles.",
    icon: UsersRound,
  },
  {
    href: "/system-admin/settings",
    title: "System Settings",
    description: "Configure system parameters, security policies, and storage.",
    icon: Settings,
  },
  {
    href: "/system-admin/audit-logs",
    title: "Audit Trail",
    description: "Review security logs, authentication, and state modifications.",
    icon: ScrollText,
  },
];

const ROLE_COLORS: Record<string, string> = {
  SYSTEM_ADMIN: "#ef4444",
  TRAINING_ADMIN: "#f59e0b",
  COURSE_OWNER: "#8b5cf6",
  CONTENT_APPROVER: "#06b6d4",
  TRAINER: "#3b82f6",
  LEARNER: "#10b981",
};

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Admin",
  TRAINING_ADMIN: "Training Admin",
  COURSE_OWNER: "Course Owner",
  CONTENT_APPROVER: "Content Approver",
  TRAINER: "Trainer",
  LEARNER: "Learner",
};

export default function SystemAdminDashboardPage() {
  const { stats, loading: statsLoading } = useDashboardStats();
  const [activeSessions, setActiveSessions] = useState(0);
  const [recentLogs, setRecentLogs] = useState<ApiAuditLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchLiveSessions({ limit: 100 })
      .then((res) => {
        if (!cancelled) {
          setActiveSessions(
            res.data.filter((s) => s.status === "SCHEDULED" || s.status === "LIVE").length,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setActiveSessions(0);
      });
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

  // Donut chart: Users by Role
  const roleSegments = useMemo(() => {
    if (!stats?.roles || stats.roles.length === 0) return [];
    return stats.roles.map((r) => ({
      label: ROLE_LABELS[r.role] || r.role,
      value: r.count,
      color: ROLE_COLORS[r.role] || "#64748b",
      subLabel: r.role,
    }));
  }, [stats?.roles]);

  // Bar chart: Platform Activity & Engagement Metrics
  const metricBars = useMemo(() => {
    return [
      {
        label: "Active Enrollments",
        value: activeEnrollments,
        subLabel: `${enrollmentsCount} total`,
        color: "#3b82f6",
      },
      {
        label: "Published Courses",
        value: publishedCount,
        subLabel: `${coursesCount} total`,
        color: "#10b981",
      },
      {
        label: "Pending Approvals",
        value: pendingApprovals,
        subLabel: "Awaiting review",
        color: "#f59e0b",
      },
      {
        label: "Certificates Issued",
        value: certificatesCount,
        subLabel: "Platform completions",
        color: "#8b5cf6",
      },
      {
        label: "Upcoming Sessions",
        value: activeSessions,
        subLabel: "Live video training",
        color: "#06b6d4",
      },
    ];
  }, [activeEnrollments, enrollmentsCount, publishedCount, coursesCount, pendingApprovals, certificatesCount, activeSessions]);

  return (
    <PageShell
      role="system_admin"
      title="System Administrator Dashboard"
      description="Monitor platform infrastructure, govern user accounts and roles, inspect operational telemetry, and review security audit trails."
    >
      {/* Top Stat KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UsersRound}
          label="Total users"
          value={usersCount}
          hint={`${stats?.periodActivity.newUsers ?? 0} joined recently`}
        />
        <StatCard
          icon={BookOpen}
          label="Course catalog"
          value={coursesCount}
          hint={`${publishedCount} published`}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={ShieldCheck}
          label="Certificates issued"
          value={certificatesCount}
          hint="Across all courses"
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Video}
          label="Live sessions"
          value={activeSessions}
          hint="Scheduled or active"
          iconClassName="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Graphical Insights: User Role Distribution & Platform Metrics */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Role Distribution Donut */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  User Role Distribution
                </h4>
                <p className="text-xs text-slate-500">Platform accounts by authorization tier</p>
              </div>
              <Link href="/system-admin/users">
                <Button variant="outline" size="sm">
                  Manage users
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <DonutChart
                segments={roleSegments}
                centerLabel="Users"
                centerValue={usersCount}
                emptyText="No user data"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Total registered users: {usersCount}</span>
            <span className="font-semibold text-indigo-600">
              {roleSegments.length} active roles
            </span>
          </div>
        </div>

        {/* Platform Engagement Metrics Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Platform Operations & Growth
                </h4>
                <p className="text-xs text-slate-500">Engagement and publishing statistics</p>
              </div>
              <Badge variant="blue">Real-time stats</Badge>
            </div>
            <div className="mt-6">
              <BarChart
                items={metricBars}
                emptyText="No operational metrics recorded."
                barColor="#6366f1"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Total enrollments: {enrollmentsCount}</span>
            <Link href="/system-admin/audit-logs" className="font-semibold text-indigo-600 hover:underline">
              Review audit logs →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <PageSection title="Quick actions" description="Administrative control center.">
            <div className="space-y-3.5">
              {QUICK_LINKS.map((link) => {
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
            title="Recent audit activity"
            description="Latest security and operational entries in the system audit trail."
            action={
              <Link href="/system-admin/audit-logs">
                <Button variant="outline" size="sm">
                  View full trail
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
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : "System Service"}
                        </span>{" "}
                        <span className="text-slate-600">{log.action}</span>
                        {log.entityId ? (
                          <span className="font-mono text-[11px] text-slate-400">
                            {" "}
                            “{log.entityId.slice(0, 8)}…”
                          </span>
                        ) : null}
                      </p>
                      <span className="mt-1 inline-block text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Badge variant="slate" className="shrink-0 text-[10px]">
                      {log.entity || "SYSTEM"}
                    </Badge>
                  </li>
                ))}
                {recentLogs.length === 0 ? (
                  <li className="px-5 py-8 text-center text-xs text-slate-400">
                    No recent audit activity recorded.
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