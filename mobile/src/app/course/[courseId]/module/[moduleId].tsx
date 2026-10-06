import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowRight, BookOpen, CircleCheck, Clock, Layers, Target } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Button, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import {
  cleanModuleTitle,
  hasRichText,
  moduleMinutes,
  moduleTopicCount,
  OverviewHero,
  OverviewSection,
  StatGrid,
  StatTile,
} from '@/features/courses/components/Overview';
import { useCourseWithOffline } from '@/features/offline';
import { useCourseProgress } from '@/features/progress';

/** Module overview & objectives (web: ModuleOverviewStage). */
export default function ModuleOverviewScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const { courseId, moduleId } = useLocalSearchParams<{ courseId: string; moduleId: string }>();
  const { course, data } = useCourseWithOffline(courseId);
  const progress = useCourseProgress(courseId);

  const modules = [...(data?.modules ?? [])].sort((a, b) => a.order - b.order);
  const index = modules.findIndex((m) => m.id === moduleId);
  const module = modules[index];

  if (!module) {
    return (
      <Screen>
        {course.isPending ? (
          <>
            <Skeleton height={140} />
            <Skeleton height={220} />
          </>
        ) : (
          <ErrorState error={course.error} onRetry={() => void course.refetch()} />
        )}
      </Screen>
    );
  }

  const moduleProgress = progress.data?.modules.find((m) => m.moduleId === module.id);
  const totalLessons = moduleProgress?.totalLessons ?? module.lessons.length;
  const completedLessons = moduleProgress?.completedLessons ?? 0;
  const isComplete = totalLessons > 0 && completedLessons >= totalLessons;
  const topics = moduleTopicCount(module);
  const minutes = moduleMinutes(module);
  const number = index + 1;

  const description = localized(module, 'description');
  const objectives = localized(module, 'objectives');

  // First unlocked, unfinished lesson of this module (sub-lessons first), else the first lesson.
  const lessons = [...module.lessons].sort((a, b) => a.order - b.order);
  const nextLessonId =
    moduleProgress?.lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .flatMap<{ lessonId: string; unlocked: boolean; completed: boolean }>((l) =>
        l.subLessons.length > 0 ? [...l.subLessons].sort((a, b) => a.order - b.order) : [l],
      )
      .find((l) => l.unlocked && !l.completed)?.lessonId ?? lessons[0]?.id;

  const begin = () => {
    if (!nextLessonId) return;
    router.replace({
      pathname: '/course/[courseId]/learn/[lessonId]',
      params: { courseId, lessonId: nextLessonId },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: t('overview.moduleEyebrow', { number }) }} />
      <Screen contentClassName="gap-7 p-5 pb-10">
        <OverviewHero
          eyebrow={t('overview.moduleEyebrow', { number })}
          badges={
            isComplete ? (
              <Badge label={t('overview.moduleCompleted')} tone="success" />
            ) : completedLessons > 0 ? (
              <Badge
                label={t('overview.inProgress', { done: completedLessons, total: totalLessons })}
                tone="brand"
              />
            ) : (
              <Badge label={t('overview.available')} />
            )
          }
          title={t('overview.moduleHeading', {
            number,
            title: cleanModuleTitle(localized(module, 'title')),
          })}
          subtitle={t('overview.moduleHint')}
        >
          <StatGrid>
            <StatTile
              icon={Layers}
              color={colors.primary}
              label={t('overview.lessonsTopics')}
              value={
                topics > 0
                  ? t('overview.lessonsWithTopics', { lessons: totalLessons, topics })
                  : t('courses.lessonCount', { count: totalLessons })
              }
            />
            <StatTile
              icon={Clock}
              color={colors.warning}
              label={t('overview.moduleDuration')}
              value={
                minutes > 0 ? t('courses.minutes', { count: minutes }) : t('overview.selfPaced')
              }
            />
            <StatTile
              icon={CircleCheck}
              color={colors.success}
              label={t('overview.progress')}
              value={t('overview.doneOf', { done: completedLessons, total: totalLessons })}
            />
          </StatGrid>
        </OverviewHero>

        {hasRichText(description) ? (
          <OverviewSection
            icon={BookOpen}
            title={t('overview.moduleDescription')}
            html={description}
          />
        ) : null}

        {hasRichText(objectives) ? (
          <OverviewSection
            icon={Target}
            title={t('overview.moduleObjectives')}
            intro={t('overview.moduleObjectivesIntro')}
            html={objectives}
            accent
          />
        ) : null}

        <View className="pt-1">
          <Button
            title={t('overview.beginModuleLessons')}
            icon={<ArrowRight size={18} color="#fff" />}
            onPress={begin}
            disabled={!nextLessonId}
            fullWidth
          />
        </View>
      </Screen>
    </>
  );
}
