import { router } from 'expo-router';
import { BookOpen, WifiOff } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppText, EmptyState, ErrorState, Screen, SegmentedControl, Skeleton } from '@/components/ui';
import type { EnrollmentStatus } from '@/core/api/types';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useThemeColors } from '@/core/theme/colors';
import { CourseCard, useMyEnrollments, type ApiEnrollment } from '@/features/courses';
import { useOfflineStore } from '@/features/offline';
import { useCoursesProgress } from '@/features/progress';

const EMPTY_KEY: Record<EnrollmentStatus, string> = {
  ACTIVE: 'myCourses.emptyActive',
  COMPLETED: 'myCourses.emptyCompleted',
  DROPPED: 'myCourses.emptyDropped',
};

export default function MyCoursesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const online = useIsOnline();
  const [status, setStatus] = useState<EnrollmentStatus>('ACTIVE');
  const enrollments = useMyEnrollments();

  const initOffline = useOfflineStore((s) => s.init);
  const downloadedCourses = useOfflineStore((s) => s.downloadedCourses);

  useEffect(() => {
    void initOffline();
  }, [initOffline]);

  const offlineAsEnrollments = useMemo<ApiEnrollment[]>(() => {
    return downloadedCourses.map((c) => ({
      id: `offline-${c.id}`,
      courseId: c.id,
      userId: 'me',
      status: 'ACTIVE' as const,
      enrolledAt: new Date(c.downloadedAt).toISOString(),
      deliveryMode: c.deliveryMode as any,
      venueId: null,
      sessionId: null,
      completedAt: null,
      droppedAt: null,
      dropReason: null,
      course: {
        id: c.id,
        code: c.code,
        title: c.title,
        titleAm: c.titleAm ?? undefined,
        description: c.description ?? null,
        descriptionAm: c.descriptionAm ?? undefined,
        level: c.level as any,
        deliveryMode: c.deliveryMode as any,
        thumbnailUrl: c.localThumbnailUri || c.thumbnailUrl || null,
        status: 'PUBLISHED' as const,
        version: c.version || 1,
        publishedAt: null,
        category: null,
        department: null,
        targetAudience: null,
        language: null,
        prerequisites: null,
        estimatedHours: null,
      },
    } as unknown as ApiEnrollment));
  }, [downloadedCourses]);

  // Status filtering is client-side: the backend ignores ?status= (spec §4.1).
  const filtered = useMemo(() => {
    if (!online && (!enrollments.data || enrollments.data.length === 0)) {
      return offlineAsEnrollments;
    }
    const list = enrollments.data ?? [];
    return list.filter((e) => e.status === status);
  }, [enrollments.data, status, online, offlineAsEnrollments]);
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
          <View className="gap-3">
            {!online ? (
              <View className="flex-row items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
                <WifiOff size={16} color="#d97706" />
                <AppText className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {t('common.offlineBanner', { defaultValue: 'Offline Mode · Showing downloaded courses' })}
                </AppText>
              </View>
            ) : null}
            <SegmentedControl
              value={status}
              onChange={setStatus}
              options={[
                { value: 'ACTIVE', label: t('courses.status.ACTIVE') },
                { value: 'COMPLETED', label: t('courses.status.COMPLETED') },
                { value: 'DROPPED', label: t('courses.status.DROPPED') },
              ]}
            />
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
          enrollments.isPending && online ? (
            <View className="gap-4">
              <Skeleton height={220} />
              <Skeleton height={220} />
            </View>
          ) : enrollments.isError && online && !enrollments.data ? (
            <ErrorState error={enrollments.error} onRetry={() => void enrollments.refetch()} />
          ) : (
            <EmptyState
              icon={<BookOpen size={40} color={colors.textMuted} />}
              title={
                !online && downloadedCourses.length === 0
                  ? t('courses.noOfflineCourses', {
                      defaultValue: 'No courses downloaded for offline learning yet.',
                    })
                  : t(EMPTY_KEY[status])
              }
              actionLabel={status === 'ACTIVE' && online ? t('home.browseCatalog') : undefined}
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
