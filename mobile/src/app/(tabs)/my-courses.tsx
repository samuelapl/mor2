import { router } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { EmptyState, ErrorState, Screen, SegmentedControl, Skeleton } from '@/components/ui';
import type { EnrollmentStatus } from '@/core/api/types';
import { useThemeColors } from '@/core/theme/colors';
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
          <SegmentedControl
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ACTIVE', label: t('courses.status.ACTIVE') },
              { value: 'COMPLETED', label: t('courses.status.COMPLETED') },
              { value: 'DROPPED', label: t('courses.status.DROPPED') },
            ]}
          />
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
