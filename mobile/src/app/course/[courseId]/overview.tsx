import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowRight,
  Award,
  BookOpen,
  CircleCheck,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Target,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Button, ErrorState, Screen, Skeleton } from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import {
  hasRichText,
  moduleMinutes,
  OverviewHero,
  OverviewSection,
  StatGrid,
  StatTile,
} from '@/features/courses/components/Overview';
import { useCourseWithOffline } from '@/features/offline';
import { findNextLesson, useCourseProgress } from '@/features/progress';

/** Course orientation & syllabus overview (web: CourseOverviewStage). */
export default function CourseOverviewScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { course, data } = useCourseWithOffline(courseId);
  const progress = useCourseProgress(courseId);

  if (!data) {
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

  const modules = [...data.modules].sort((a, b) => a.order - b.order);
  const topics = modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + 1 + (l.subLessons?.length ?? 0), 0),
    0,
  );
  const minutes = modules.reduce((sum, m) => sum + moduleMinutes(m), 0);
  const percent = Math.round(progress.data?.stats.overallPercent ?? 0);
  const finalPassing =
    progress.data?.courseCompletion.finalAssessment?.passingScore ??
    data.assessments[0]?.passingScore;

  const description = localized(data, 'description');
  const objectives = localized(data, 'objectives');

  const next = findNextLesson(progress.data);
  const firstModule = modules[0];
  const start = () => {
    if (percent > 0 && next) {
      router.replace({
        pathname: '/course/[courseId]/learn/[lessonId]',
        params: { courseId, lessonId: next.lessonId },
      });
    } else if (firstModule) {
      router.replace({
        pathname: '/course/[courseId]/module/[moduleId]',
        params: { courseId, moduleId: firstModule.id },
      });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('overview.courseTitle') }} />
      <Screen contentClassName="gap-7 p-5 pb-10">
        <OverviewHero
          eyebrow={t('overview.courseEyebrow')}
          badges={
            <>
              <Badge label={data.code} />
              <Badge label={t(`courses.level.${data.level}`)} />
            </>
          }
          title={localized(data, 'title')}
          subtitle={data.department}
        >
          <StatGrid>
            <StatTile
              icon={Layers}
              color={colors.primary}
              label={t('overview.curriculum')}
              value={t('overview.modulesTopics', { modules: modules.length, topics })}
            />
            <StatTile
              icon={Clock}
              color={colors.warning}
              label={t('overview.estimatedTime')}
              value={
                minutes > 0 ? t('courses.minutes', { count: minutes }) : t('overview.selfPaced')
              }
            />
            <StatTile
              icon={Award}
              color={colors.success}
              label={t('overview.assessment')}
              value={
                finalPassing
                  ? t('overview.passingScore', { score: finalPassing })
                  : t('overview.gradedChecks')
              }
            />
            <StatTile
              icon={CircleCheck}
              color="#2563eb"
              label={t('overview.yourProgress')}
              value={t('overview.percentComplete', { percent })}
            />
          </StatGrid>
        </OverviewHero>

        {hasRichText(description) ? (
          <OverviewSection
            icon={BookOpen}
            title={t('overview.courseDescription')}
            html={description}
          />
        ) : null}

        {hasRichText(objectives) ? (
          <OverviewSection
            icon={Target}
            title={t('overview.courseObjectives')}
            intro={t('overview.courseObjectivesIntro')}
            html={objectives}
            accent
          />
        ) : null}

        {hasRichText(data.prerequisites) ? (
          <OverviewSection
            icon={FileText}
            title={t('overview.prerequisites')}
            html={data.prerequisites ?? ''}
          />
        ) : null}

        {hasRichText(data.targetAudience) ? (
          <OverviewSection
            icon={GraduationCap}
            title={t('overview.targetAudience')}
            html={data.targetAudience ?? ''}
          />
        ) : null}

        <View className="pt-1">
          <Button
            title={percent > 0 ? t('overview.continueLessons') : t('overview.beginFirstModule')}
            icon={<ArrowRight size={18} color="#fff" />}
            onPress={start}
            disabled={!firstModule}
            fullWidth
          />
        </View>
      </Screen>
    </>
  );
}
