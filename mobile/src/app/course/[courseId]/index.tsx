import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Award, CalendarDays, Clock, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  ModalSheet,
  ProgressRing,
  Screen,
  Skeleton,
} from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { FormMessage, useFormError } from '@/features/auth';
import {
  CourseSyllabus,
  CourseThumbnail,
  useCourse,
  useDropEnrollment,
  useEnrollmentForCourse,
  useSelfEnroll,
} from '@/features/courses';
import { useCertificateForCourse, useClaimCertificate } from '@/features/certificates';
import { findNextLesson, useCourseProgress } from '@/features/progress';

export default function CourseScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const course = useCourse(courseId);
  const enrollment = useEnrollmentForCourse(courseId);
  const enrolled = course.data?.enrolled ?? false;
  const progress = useCourseProgress(courseId, enrolled);

  const certificate = useCertificateForCourse(courseId);
  const claim = useClaimCertificate();
  const enroll = useSelfEnroll();
  const drop = useDropEnrollment();
  const enrollError = useFormError(enroll.error);
  const dropError = useFormError(drop.error);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropReason, setDropReason] = useState('');

  const refresh = () => {
    void course.refetch();
    void enrollment.refetch();
    if (enrolled) void progress.refetch();
  };

  if (course.isPending) {
    return (
      <Screen>
        <Skeleton height={180} />
        <Skeleton height={24} width="70%" />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (course.isError || !course.data) {
    return (
      <Screen>
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
      </Screen>
    );
  }

  const data = course.data;
  const status = data.enrollmentStatus;
  const percent = progress.data?.stats.overallPercent ?? 0;
  const next = findNextLesson(progress.data);
  const objectives = localized(data, 'objectives');
  const description = localized(data, 'description');

  const openLesson = (lessonId: string) =>
    router.push({
      pathname: '/course/[courseId]/learn/[lessonId]',
      params: { courseId, lessonId },
    });
  const openAssessment = (assessmentId: string) =>
    router.push({ pathname: '/quiz/[assessmentId]', params: { assessmentId } });

  // Certificates are usually auto-issued; claiming returns the existing one or null (spec §9.2).
  const openCertificate = () => {
    if (certificate.data) {
      router.push({
        pathname: '/certificates/[certificateId]',
        params: { certificateId: certificate.data.id },
      });
      return;
    }
    claim.mutate(courseId, {
      onSuccess: (issued) => {
        if (issued) {
          router.push({
            pathname: '/certificates/[certificateId]',
            params: { certificateId: issued.id },
          });
        } else {
          Alert.alert(t('certificates.claim'), t('certificates.notEligible'));
          void progress.refetch();
        }
      },
      onError: () => Alert.alert(t('certificates.claim'), t('common.somethingWrong')),
    });
  };

  const startEnroll = () => {
    // Online-only courses enroll in one tap; anything with an in-person option needs the picker.
    if (data.deliveryMode === 'ONLINE_ONLY') {
      enroll.mutate({ courseId }, { onSuccess: () => Alert.alert(t('courses.enrollSuccess')) });
    } else {
      router.push({ pathname: '/course/[courseId]/enroll', params: { courseId } });
    }
  };

  const confirmDrop = () => {
    if (!enrollment.data) return;
    drop.mutate(
      { enrollmentId: enrollment.data.id, courseId, reason: dropReason.trim() || undefined },
      {
        onSuccess: () => {
          setDropOpen(false);
          setDropReason('');
        },
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: data.code }} />
      <Screen
        refreshing={course.isRefetching}
        onRefresh={refresh}
        contentClassName="gap-4 p-0 pb-8"
      >
        <CourseThumbnail uri={data.thumbnailUrl} className="h-48 w-full" />

        <View className="gap-4 px-4">
          <View className="gap-2">
            <View className="flex-row flex-wrap gap-2">
              <Badge label={t(`courses.level.${data.level}`)} />
              <Badge label={t(`courses.deliveryMode.${data.deliveryMode}`)} tone="brand" />
              {status ? (
                <Badge
                  label={t(`courses.status.${status}`)}
                  tone={
                    status === 'COMPLETED' ? 'success' : status === 'DROPPED' ? 'danger' : 'brand'
                  }
                />
              ) : null}
            </View>
            <AppText variant="title">{localized(data, 'title')}</AppText>
            {data.estimatedHours ? (
              <View className="flex-row items-center gap-1">
                <Clock size={14} color={colors.textMuted} />
                <AppText variant="caption">
                  {t('courses.hours', { count: data.estimatedHours })}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Primary action */}
          {enrolled && status !== 'DROPPED' ? (
            <Card className="flex-row items-center gap-4">
              <ProgressRing percent={percent} size={64} />
              <View className="flex-1 gap-2">
                <AppText variant="label">
                  {progress.data
                    ? t('courses.lessonsDone', {
                        done: progress.data.stats.completedLessons,
                        total: progress.data.stats.totalLessons,
                      })
                    : t('common.loading')}
                </AppText>
                {status === 'COMPLETED' || progress.data?.courseCompletion.certificateEligible ? (
                  <Button
                    title={certificate.data ? t('certificates.view') : t('certificates.claim')}
                    size="sm"
                    icon={<Award size={16} color="#fff" />}
                    loading={claim.isPending}
                    onPress={openCertificate}
                  />
                ) : next ? (
                  <Button
                    title={percent > 0 ? t('courses.continue') : t('courses.start')}
                    size="sm"
                    onPress={() => openLesson(next.lessonId)}
                  />
                ) : null}
              </View>
            </Card>
          ) : (
            <View className="gap-2">
              {status === 'DROPPED' ? (
                <AppText variant="muted">{t('courses.dropped')}</AppText>
              ) : null}
              <FormMessage message={enrollError} />
              <Button
                title={status === 'DROPPED' ? t('courses.enrollAgain') : t('courses.enroll')}
                onPress={startEnroll}
                loading={enroll.isPending}
                fullWidth
              />
              <AppText variant="caption" className="text-center">
                {t('courses.notEnrolledHint')}
              </AppText>
            </View>
          )}

          {/* In-person seat */}
          {enrolled &&
          enrollment.data?.deliveryMode === 'IN_PERSON_ONLY' &&
          enrollment.data.venue ? (
            <Card className="gap-2">
              <AppText variant="label">{t('courses.yourSeat')}</AppText>
              <View className="flex-row items-center gap-2">
                <MapPin size={16} color={colors.primary} />
                <AppText className="flex-1">
                  {enrollment.data.venue.name}
                  {enrollment.data.venue.building
                    ? ` · ${enrollment.data.venue.building}`
                    : ''} · {enrollment.data.venue.branch}
                </AppText>
              </View>
              {enrollment.data.sessionId ? (
                <Button
                  title={t('screens.session')}
                  variant="outline"
                  size="sm"
                  icon={<CalendarDays size={16} color={colors.text} />}
                  onPress={() =>
                    router.push({
                      pathname: '/session/[sessionId]',
                      params: { sessionId: enrollment.data!.sessionId! },
                    })
                  }
                />
              ) : null}
            </Card>
          ) : null}

          {description ? (
            <Card className="gap-2">
              <AppText variant="heading">{t('courses.about')}</AppText>
              <AppText>{description}</AppText>
            </Card>
          ) : null}

          {objectives ? (
            <Card className="gap-2">
              <AppText variant="heading">{t('courses.objectives')}</AppText>
              <AppText>{objectives}</AppText>
            </Card>
          ) : null}

          {data.prerequisites ? (
            <Card className="gap-2">
              <AppText variant="heading">{t('courses.prerequisites')}</AppText>
              <AppText>{data.prerequisites}</AppText>
            </Card>
          ) : null}

          {data.trainers.length > 0 ? (
            <Card className="gap-3">
              <AppText variant="heading">{t('courses.trainers')}</AppText>
              {data.trainers.map(({ user }) => (
                <View key={user.id} className="flex-row items-center gap-3">
                  <Avatar
                    uri={user.avatarUrl}
                    firstName={user.firstName}
                    lastName={user.lastName}
                    size={36}
                  />
                  <AppText>
                    {user.firstName} {user.lastName}
                  </AppText>
                </View>
              ))}
            </Card>
          ) : null}

          <CourseSyllabus
            course={data}
            progress={enrolled ? progress.data : undefined}
            onOpenLesson={openLesson}
            onOpenAssessment={openAssessment}
          />

          {enrolled && status === 'ACTIVE' && enrollment.data ? (
            <Button title={t('courses.drop')} variant="ghost" onPress={() => setDropOpen(true)} />
          ) : null}
        </View>
      </Screen>

      <ModalSheet
        visible={dropOpen}
        onClose={() => setDropOpen(false)}
        title={t('courses.dropConfirmTitle')}
      >
        <View className="gap-4">
          <AppText variant="muted">{t('courses.dropConfirmBody')}</AppText>
          <Input
            label={t('courses.dropReason')}
            value={dropReason}
            onChangeText={setDropReason}
            maxLength={300}
          />
          <FormMessage message={dropError} />
          <Button
            title={t('courses.drop')}
            variant="danger"
            onPress={confirmDrop}
            loading={drop.isPending}
            fullWidth
          />
          <Button title={t('common.cancel')} variant="ghost" onPress={() => setDropOpen(false)} />
        </View>
      </ModalSheet>
    </>
  );
}
