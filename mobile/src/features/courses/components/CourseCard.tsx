import { Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Card, ProgressBar } from '@/components/ui';
import type { EnrollmentStatus } from '@/core/api/types';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';

import type { ApiCourse } from '../types/course.types';
import { CourseThumbnail } from './CourseThumbnail';

export interface CourseCardProps {
  course: ApiCourse;
  onPress: () => void;
  /** 0–100 when the learner is enrolled. */
  progressPercent?: number;
  enrollmentStatus?: EnrollmentStatus;
}

const statusTone = { ACTIVE: 'brand', COMPLETED: 'success', DROPPED: 'danger' } as const;

export function CourseCard({
  course,
  onPress,
  progressPercent,
  enrollmentStatus,
}: CourseCardProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();

  return (
    <Card onPress={onPress} className="overflow-hidden p-0">
      <CourseThumbnail uri={course.thumbnailUrl} className="h-36 w-full" />
      <View className="gap-2 p-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={t(`courses.level.${course.level}`)} tone="neutral" />
          {enrollmentStatus ? (
            <Badge
              label={t(`courses.status.${enrollmentStatus}`)}
              tone={statusTone[enrollmentStatus]}
            />
          ) : null}
          <AppText variant="caption">{course.code}</AppText>
        </View>
        <AppText variant="heading" numberOfLines={2}>
          {localized(course, 'title')}
        </AppText>
        {localized(course, 'description') ? (
          <AppText variant="muted" numberOfLines={2}>
            {localized(course, 'description')}
          </AppText>
        ) : null}
        <View className="flex-row items-center gap-3">
          {course.estimatedHours ? (
            <View className="flex-row items-center gap-1">
              <Clock size={14} color={colors.textMuted} />
              <AppText variant="caption">
                {t('courses.hours', { count: course.estimatedHours })}
              </AppText>
            </View>
          ) : null}
          <AppText variant="caption">{t(`courses.deliveryMode.${course.deliveryMode}`)}</AppText>
        </View>
        {progressPercent !== undefined && enrollmentStatus !== 'DROPPED' ? (
          <View className="gap-1 pt-1">
            <ProgressBar
              percent={progressPercent}
              tone={progressPercent >= 100 ? 'success' : 'brand'}
            />
            <AppText variant="caption">
              {t('courses.progress', { percent: progressPercent })}
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
