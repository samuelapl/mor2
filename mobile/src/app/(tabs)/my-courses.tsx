import { router } from 'expo-router';
import { BookOpen, ChevronRight, DownloadCloud, HardDrive } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppText, Card, EmptyState, ErrorState, Screen, SegmentedControl, Skeleton } from '@/components/ui';
import type { EnrollmentStatus } from '@/core/api/types';
import { palette, useThemeColors } from '@/core/theme/colors';
import { CourseCard, useMyEnrollments } from '@/features/courses';
import { useCoursesProgress } from '@/features/progress';

const EMPTY_KEY: Record<EnrollmentStatus, string> = {
  ACTIVE: 'myCourses.emptyActive',
  COMPLETED: 'myCourses.emptyCompleted',
  DROPPED: 'myCourses.emptyDropped',
};

export default function MyCoursesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [status, setStatus] = useState<EnrollmentStatus>('ACTIVE');
  const enrollments = useMyEnrollments();

  // Status filtering is client-side: the backend ignores ?status= (spec §4.1).
  const filtered = useMemo(
    () => (enrollments.data ?? []).filter((e) => e.status === status),
    [enrollments.data, status],
  );
  const progressByCourse = useCoursesProgress(
    filtered.filter((e) => e.status !== 'DROPPED').map((e) => e.courseId),
  );

  return (
    <Screen scroll={false} contentClassName="p-0">
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerClassName="gap-4 p-4"
        ListHeaderComponent={
          <View className="gap-3 mb-1">
            <SegmentedControl
              value={status}
              onChange={setStatus}
              options={[
                { value: 'ACTIVE', label: t('courses.status.ACTIVE') },
                { value: 'COMPLETED', label: t('courses.status.COMPLETED') },
                { value: 'DROPPED', label: t('courses.status.DROPPED') },
              ]}
            />
            <Card
              onPress={() => router.push('/downloads')}
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
          </View>
        }
        renderItem={({ item }) => (
          <CourseCard
            course={item.course}
            enrollmentStatus={item.status}
            progressPercent={
              item.status === 'COMPLETED'
                ? 100
                : progressByCourse[item.courseId]?.stats.overallPercent
            }
            onPress={() =>
              router.push({ pathname: '/course/[courseId]', params: { courseId: item.courseId } })
            }
          />
        )}
        ListEmptyComponent={
          enrollments.isPending ? (
            <View className="gap-4">
              <Skeleton height={220} />
              <Skeleton height={220} />
            </View>
          ) : enrollments.isError && !enrollments.data ? (
            <ErrorState error={enrollments.error} onRetry={() => void enrollments.refetch()} />
          ) : (
            <EmptyState
              icon={<BookOpen size={40} color={colors.textMuted} />}
              title={t(EMPTY_KEY[status])}
              actionLabel={status === 'ACTIVE' ? t('home.browseCatalog') : undefined}
              onAction={() => router.navigate('/catalog')}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={enrollments.isRefetching}
            onRefresh={() => void enrollments.refetch()}
          />
        }
      />
    </Screen>
  );
}
