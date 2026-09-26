import { router } from 'expo-router';
import { Compass, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { EmptyState, ErrorState, Input, Screen, Skeleton } from '@/components/ui';
import type { CourseLevel } from '@/core/api/types';
import { useDebounce } from '@/core/hooks/useDebounce';
import { useThemeColors } from '@/core/theme/colors';
import { CourseCard, LevelFilter, useCatalogCourses, useMyEnrollments } from '@/features/courses';

export default function CatalogScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<CourseLevel | null>(null);
  const debouncedSearch = useDebounce(search.trim());

  const catalog = useCatalogCourses({ search: debouncedSearch || undefined });
  const enrollments = useMyEnrollments();

  const statusByCourse = useMemo(
    () => new Map(enrollments.data?.map((e) => [e.courseId, e.status])),
    [enrollments.data],
  );
  const courses = useMemo(() => {
    const all = catalog.data?.pages.flatMap((page) => page.data) ?? [];
    return level ? all.filter((c) => c.level === level) : all;
  }, [catalog.data, level]);

  const header = (
    <View className="gap-3 pb-2">
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('courses.searchPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <LevelFilter value={level} onChange={setLevel} />
    </View>
  );

  return (
    <Screen scroll={false} contentClassName="p-0">
      <FlatList
        data={courses}
        keyExtractor={(course) => course.id}
        contentContainerClassName="gap-4 p-4"
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            enrollmentStatus={statusByCourse.get(item.id)}
            onPress={() =>
              router.push({ pathname: '/course/[courseId]', params: { courseId: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          catalog.isPending ? (
            <View className="gap-4">
              <Skeleton height={220} />
              <Skeleton height={220} />
            </View>
          ) : catalog.isError && !catalog.data ? (
            <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
          ) : (
            <EmptyState
              icon={
                debouncedSearch ? (
                  <Search size={40} color={colors.textMuted} />
                ) : (
                  <Compass size={40} color={colors.textMuted} />
                )
              }
              title={debouncedSearch || level ? t('courses.noResults') : t('courses.emptyCatalog')}
            />
          )
        }
        ListFooterComponent={
          catalog.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (catalog.hasNextPage && !catalog.isFetchingNextPage) void catalog.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={catalog.isRefetching && !catalog.isFetchingNextPage}
            onRefresh={() => {
              void catalog.refetch();
              void enrollments.refetch();
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </Screen>
  );
}
