import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, ChevronRight, CirclePlay, Compass, DownloadCloud, Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressRing,
  Screen,
  Skeleton,
} from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { palette, useThemeColors } from '@/core/theme/colors';
import { useSessionStore } from '@/features/auth';
import { SessionCard, useUpcomingSessions } from '@/features/live-sessions';
import {
  CourseCard,
  CourseThumbnail,
  useMyEnrollments,
  type ApiEnrollment,
} from '@/features/courses';
import {
  findNextLesson,
  progressKeys,
  useCoursesProgress,
  type CourseProgress,
} from '@/features/progress';

export default function HomeScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const enrollments = useMyEnrollments();
  const upcoming = useUpcomingSessions();
  const nextSession = upcoming.data?.[0];

  const active = (enrollments.data ?? []).filter((e) => e.status === 'ACTIVE');
  const completedCount = (enrollments.data ?? []).filter((e) => e.status === 'COMPLETED').length;
  const progressByCourse = useCoursesProgress(active.map((e) => e.courseId));

  // "Continue learning" = first active course that still has an unlocked, unfinished lesson.
  const resume = findResume(active, progressByCourse);

  const refresh = () => {
    void enrollments.refetch();
    void upcoming.refetch();
    void queryClient.invalidateQueries({ queryKey: progressKeys.all });
  };

  return (
    <Screen refreshing={enrollments.isRefetching} onRefresh={refresh}>
      <View className="flex-row items-center gap-3">
        <Avatar
          uri={user?.avatarUrl}
          firstName={user?.firstName}
          lastName={user?.lastName}
          size={48}
        />
        <View className="flex-1">
          <AppText variant="title">{t('home.greeting', { name: user?.firstName ?? '' })}</AppText>
        </View>
      </View>

      <View className="flex-row gap-3">
        <StatCard
          icon={<BookOpen size={20} color={colors.primary} />}
          value={active.length}
          label={t('home.active')}
        />
        <StatCard
          icon={<Trophy size={20} color={colors.success} />}
          value={completedCount}
          label={t('home.completed')}
        />
      </View>

      {/* Offline Learning & Downloads Quick Access */}
      <Card
        onPress={() => router.push('/(tabs)/downloads' as any)}
        className="flex-row items-center justify-between border border-sky-500/40 bg-sky-950/40 dark:bg-slate-900 dark:border-sky-500/50 p-4 rounded-2xl shadow-sm"
      >
        <View className="flex-row items-center gap-3.5 flex-1">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-400/30">
            <DownloadCloud size={22} color="#38bdf8" strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <AppText className="text-sm font-bold text-white tracking-wide">
              {t('screens.downloads', { defaultValue: 'Offline Learning & Downloads' })}
            </AppText>
            <AppText className="text-xs font-semibold text-sky-200 dark:text-sky-300 mt-0.5">
              {t('offline.bannerSubtitle', { defaultValue: 'View saved courses, lessons & recordings' })}
            </AppText>
          </View>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-sky-500/10">
          <ChevronRight size={18} color="#38bdf8" />
        </View>
      </Card>

      {nextSession ? (
        <View className="gap-2">
          <AppText variant="heading">{t('home.nextSession')}</AppText>
          <SessionCard
            session={nextSession}
            onPress={() =>
              router.push({
                pathname: '/session/[sessionId]',
                params: { sessionId: nextSession.id },
              })
            }
          />
        </View>
      ) : null}

      {enrollments.isPending ? (
        <Skeleton height={160} />
      ) : enrollments.isError && !enrollments.data ? (
        <ErrorState error={enrollments.error} onRetry={() => void enrollments.refetch()} />
      ) : active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Compass size={40} color={colors.textMuted} />}
            title={completedCount > 0 ? t('home.allDone') : t('home.noActive')}
            actionLabel={t('home.browseCatalog')}
            onAction={() => router.navigate('/catalog')}
          />
        </Card>
      ) : (
        <>
          {resume ? (
            <Card
              onPress={() =>
                router.push({
                  pathname: '/course/[courseId]/learn/[lessonId]',
                  params: { courseId: resume.enrollment.courseId, lessonId: resume.next.lessonId },
                })
              }
              className="overflow-hidden p-0"
            >
              <CourseThumbnail
                uri={resume.enrollment.course.thumbnailUrl}
                className="h-28 w-full"
              />
              <View className="flex-row items-center gap-4 p-4">
                <ProgressRing percent={resume.percent} />
                <View className="flex-1 gap-1">
                  <AppText variant="caption">{t('home.continueLearning')}</AppText>
                  <AppText variant="heading" numberOfLines={1}>
                    {localized(resume.enrollment.course, 'title')}
                  </AppText>
                  <AppText variant="muted" numberOfLines={1}>
                    {localized(resume.next, 'title')}
                  </AppText>
                </View>
                <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-600">
                  <CirclePlay size={22} color={palette.white} />
                </View>
              </View>
            </Card>
          ) : null}

          <View className="flex-row items-center justify-between">
            <AppText variant="heading">{t('home.yourCourses')}</AppText>
            <Button
              title={t('common.seeAll')}
              variant="ghost"
              size="sm"
              onPress={() => router.navigate('/my-courses')}
            />
          </View>
          {active.slice(0, 3).map((enrollment) => (
            <CourseCard
              key={enrollment.id}
              course={enrollment.course}
              enrollmentStatus={enrollment.status}
              progressPercent={progressByCourse[enrollment.courseId]?.stats.overallPercent}
              onPress={() =>
                router.push({
                  pathname: '/course/[courseId]',
                  params: { courseId: enrollment.courseId },
                })
              }
            />
          ))}
        </>
      )}
    </Screen>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card className="flex-1 gap-2">
      {icon}
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption">{label}</AppText>
    </Card>
  );
}

function findResume(
  active: ApiEnrollment[],
  progressByCourse: Record<string, CourseProgress | undefined>,
) {
  for (const enrollment of active) {
    const progress = progressByCourse[enrollment.courseId];
    const next = findNextLesson(progress);
    if (next) return { enrollment, next, percent: progress?.stats.overallPercent ?? 0 };
  }
  return null;
}
