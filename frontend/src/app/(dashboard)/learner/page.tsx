"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Video,
} from "lucide-react";
import { fetchUpcomingSessions } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import { useCourseProgress } from "@/lib/api/useCourseProgress";
import { tr } from "@/constants/labels";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import LanguageToggle from "@/components/shared/LanguageToggle";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CourseCard } from "@/components/features/courses/CourseCard";
import { LearnCourseModal } from "@/components/features/courses/LearnCourseModal";

export default function LearnerDashboardPage() {
  const { courses, lang, currentUser } = useLms();
  const me = currentUser?.id ?? "";
  const enrolled = courses.filter((c) => c.enrolledLearnerIds.includes(me));
  const { progress } = useCourseProgress(enrolled.map((c) => c.id));

  const [upcomingCount, setUpcomingCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchUpcomingSessions()
      .then((res) => {
        if (!cancelled) setUpcomingCount(res.data.length);
      })
      .catch(() => {
        if (!cancelled) setUpcomingCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const percentOf = (courseId: string) => progress[courseId]?.stats.overallPercent ?? 0;
  const inProgress = enrolled.filter((c) => percentOf(c.id) < 100);
  const completed = enrolled.filter((c) => percentOf(c.id) >= 100);
  const avg =
    enrolled.length > 0
      ? Math.round(enrolled.reduce((sum, c) => sum + percentOf(c.id), 0) / enrolled.length)
      : 0;

  const nextUp = [...inProgress].sort((a, b) => percentOf(a.id) - percentOf(b.id))[0];
  const [learnCourse, setLearnCourse] = useState<{ id: string; title: string } | null>(null);

  return (
    <PageShell
      role="learner"
      title={lang === "en" ? "Learner Dashboard" : "የተማሪ ዳሽቦርድ"}
      description={tr(lang, "myCourses")}
    >
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label={tr(lang, "myCourses")} value={enrolled.length} hint={tr(lang, "inProgress")} />
        <StatCard
          icon={PlayCircle}
          label={tr(lang, "inProgress")}
          value={inProgress.length}
          hint="Courses needing attention"
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={tr(lang, "completed")}
          value={completed.length}
          hint={tr(lang, "certificates")}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard icon={Award} label={tr(lang, "averageProgress")} value={`${avg}%`} hint="Across all courses" />
      </div>

      {nextUp ? (
        <PageSection
          title="Continue learning"
          description="Resume where you left off."
          action={
            <Link href="/learner/my-courses">
              <Button variant="outline" size="sm">
                {tr(lang, "myCourses")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <CourseCard
              course={nextUp}
              progress={percentOf(nextUp.id)}
              extraBadge={<Badge variant="blue">{percentOf(nextUp.id)}%</Badge>}
            >
              <Button
                size="sm"
                onClick={() => setLearnCourse({ id: nextUp.id, title: nextUp.title })}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                {tr(lang, "startLearning")}
              </Button>
            </CourseCard>
          </div>
        </PageSection>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/learner/live-sessions" className="group">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-indigo-200 group-hover:shadow-card">
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-indigo-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900">{tr(lang, "liveSessions")}</p>
                  <p className="text-xs text-slate-500">{upcomingCount} upcoming</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </div>
          </div>
        </Link>
        <Link href="/learner/certificates" className="group">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-amber-200 group-hover:shadow-card">
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-amber-400/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-slate-900">{tr(lang, "certificates")}</p>
                  <p className="text-xs text-slate-500">{completed.length} earned</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-amber-500" />
            </div>
          </div>
        </Link>
      </div>

      {learnCourse ? (
        <LearnCourseModal
          open={learnCourse !== null}
          onClose={() => setLearnCourse(null)}
          courseId={learnCourse.id}
          courseTitle={learnCourse.title}
        />
      ) : null}
    </PageShell>
  );
}