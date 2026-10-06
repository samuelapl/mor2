import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Globe,
  GraduationCap,
  Info,
  ListTree,
  LogOut,
  MapPin,
  Monitor,
  Target,
  Users,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Input,
  ModalSheet,
  ProgressRing,
  Screen,
  Skeleton,
} from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { FormMessage, useFormError, useSessionStore } from '@/features/auth';
import { CourseFeedbackModal, hasSkippedFeedback, hasSubmittedFeedback } from '@/features/feedback';
import {
  CourseThumbnail,
  SyllabusDrawer,
  useCourse,
  useDropEnrollment,
  useEnrollmentForCourse,
  useSelfEnroll,
} from '@/features/courses';
import { useCertificateForCourse, useClaimCertificate } from '@/features/certificates';
import { CourseGradeSummary, findNextLesson, useCourseProgress } from '@/features/progress';
import { downloadManager, OfflineDownloadCard } from '@/features/offline';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import type { ApiCourseDetail } from '@/features/courses/types/course.types';

export default function CourseScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const course = useCourse(courseId);
  const enrollment = useEnrollmentForCourse(courseId);
  const enrolled = course.data?.enrolled ?? false;
  const progress = useCourseProgress(courseId, enrolled);

  const online = useIsOnline();
  const [offlineData, setOfflineData] = useState<ApiCourseDetail | null>(null);

  useEffect(() => {
    if (!course.data || !online) {
      void downloadManager.getOfflineCourseDetail(courseId).then(setOfflineData);
    }
  }, [course.data, online, courseId]);

  // Progression switched to LOCKED: drop any downloaded content. Pending
  // quiz/progress sync items live outside the course tables and are kept.
  const progressionMode = progress.data?.progressionMode;
  useEffect(() => {
    if (!online || !progressionMode || progressionMode === 'OPEN') return;
    void downloadManager.isCourseDownloaded(courseId).then(async (downloaded) => {
      if (!downloaded) return;
      await downloadManager.deleteDownloadedCourse(courseId);
      setOfflineData(null);
    });
  }, [online, progressionMode, courseId]);

  const certificate = useCertificateForCourse(courseId);
  const claim = useClaimCertificate();
  const enroll = useSelfEnroll();
  const drop = useDropEnrollment();
  const enrollError = useFormError(enroll.error);
  const dropError = useFormError(drop.error);
  const user = useSessionStore((s) => s.user);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropReason, setDropReason] = useState('');
  const [otherDetailsOpen, setOtherDetailsOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [syllabusOpen, setSyllabusOpen] = useState(false);

  const refresh = () => {
    void course.refetch();
    void enrollment.refetch();
    if (enrolled) void progress.refetch();
    void downloadManager.getOfflineCourseDetail(courseId).then(setOfflineData);
  };

  const data = course.data ?? offlineData;

  if (course.isPending && !data) {
    return (
      <Screen>
        <Skeleton height={180} />
        <Skeleton height={24} width="70%" />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
      </Screen>
    );
  }
  const status = data.enrollmentStatus;
  const percent = progress.data?.stats.overallPercent ?? 0;
  const next = findNextLesson(progress.data);
  const objectives = localized(data, 'objectives');
  const description = localized(data, 'description');

  const enrollButtonTitle =
    status === 'DROPPED'
      ? t('courses.enrollAgain')
      : data.deliveryMode === 'IN_PERSON_ONLY'
        ? t('courses.reserveSeat')
        : data.deliveryMode === 'ONLINE_ONLY'
          ? t('courses.enrollOnline')
          : t('courses.enrollInCourse');

  const enrollButtonIcon =
    data.deliveryMode === 'IN_PERSON_ONLY' ? (
      <MapPin size={18} color="#fff" />
    ) : (
      <ArrowRight size={18} color="#fff" />
    );

  const openLesson = (lessonId: string) =>
    router.push({
      pathname: '/course/[courseId]/learn/[lessonId]',
      params: { courseId, lessonId },
    });
  const openAssessment = (assessmentId: string) =>
    router.push({ pathname: '/quiz/[assessmentId]', params: { assessmentId, courseId } });
  const openCourseOverview = () =>
    router.push({ pathname: '/course/[courseId]/overview', params: { courseId } });
  const openLiveSessions = () =>
    router.push({ pathname: '/course/[courseId]/live-sessions', params: { courseId } });
  const openModuleOverview = (moduleId: string) =>
    router.push({
      pathname: '/course/[courseId]/module/[moduleId]',
      params: { courseId, moduleId },
    });

  const claimCertificateNow = () => {
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

  const handleCertificatePress = async () => {
    if (certificate.data) {
      router.push({
        pathname: '/certificates/[certificateId]',
        params: { certificateId: certificate.data.id },
      });
      return;
    }

    // Check if user has already submitted or skipped feedback
    const [submitted, skipped] = await Promise.all([
      hasSubmittedFeedback(courseId, user?.id),
      hasSkippedFeedback(courseId, user?.id),
    ]);

    if (!submitted && !skipped) {
      setFeedbackModalOpen(true);
      return;
    }

    claimCertificateNow();
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
      <Stack.Screen
        options={{
          title: data.code,
          headerRight: () =>
            enrolled && status !== 'DROPPED' ? (
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => setInfoSheetOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('courses.about')}
                  className="rounded-full p-2 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  <Info size={22} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => setSyllabusOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('courses.syllabus')}
                  className="rounded-full p-2 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  <ListTree size={22} color={colors.primary} />
                </Pressable>
                {status === 'ACTIVE' && enrollment.data ? (
                  <Pressable
                    onPress={() => setDropOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('courses.drop')}
                    className="mr-1 rounded-full p-2 active:bg-red-50 dark:active:bg-red-950/40"
                  >
                    <LogOut size={21} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ) : null,
        }}
      />
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
            <Card className="gap-3.5 border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
              <View className="flex-row items-center gap-4">
                <ProgressRing percent={percent} size={64} strokeWidth={6} />
                <View className="flex-1 gap-1">
                  <View className="flex-row items-baseline gap-1.5">
                    <AppText className="text-2xl font-black text-white">
                      {Math.round(percent)}%
                    </AppText>
                    <AppText className="text-xs font-medium text-slate-400">completed</AppText>
                  </View>
                  <AppText className="text-sm font-semibold text-slate-200">
                    {progress.data
                      ? t('courses.lessonsDoneRatio', {
                          done: progress.data.stats.completedLessons,
                          total: progress.data.stats.totalLessons,
                          defaultValue: `${progress.data.stats.completedLessons} of ${progress.data.stats.totalLessons} lessons completed`,
                        })
                      : t('common.loading')}
                  </AppText>
                </View>
              </View>

              {status === 'COMPLETED' || progress.data?.courseCompletion.certificateEligible ? (
                <Button
                  title={certificate.data ? t('certificates.view') : t('certificates.claim')}
                  icon={<Award size={18} color="#fff" />}
                  loading={claim.isPending}
                  onPress={handleCertificatePress}
                  fullWidth
                />
              ) : next?.lessonId || data.modules?.[0]?.lessons?.[0]?.id ? (
                <Button
                  title={percent > 0 ? t('courses.continue') : t('courses.start')}
                  icon={<ArrowRight size={18} color="#fff" />}
                  onPress={() => openLesson(next?.lessonId || data.modules[0].lessons[0].id)}
                  fullWidth
                />
              ) : null}
              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={openCourseOverview}
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 active:bg-white/20"
                >
                  <BookOpen size={16} color="#e2e8f0" />
                  <AppText className="text-sm font-semibold text-slate-200">
                    {t('overview.short')}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setSyllabusOpen(true)}
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 active:bg-white/20"
                >
                  <ListTree size={16} color="#e2e8f0" />
                  <AppText className="text-sm font-semibold text-slate-200">
                    {t('courses.courseContent')}
                  </AppText>
                </Pressable>
              </View>
            </Card>
          ) : (
            <View className="gap-2.5">
              {status === 'DROPPED' ? (
                <AppText variant="muted">{t('courses.dropped')}</AppText>
              ) : null}
              <FormMessage message={enrollError} />
              <Button
                title={enrollButtonTitle}
                icon={enrollButtonIcon}
                onPress={startEnroll}
                loading={enroll.isPending}
                fullWidth
              />
              <AppText variant="caption" className="text-center">
                {t('courses.notEnrolledHint')}
              </AppText>
            </View>
          )}

          {/* Offline Learning download manager (enrolled, OPEN progression only) */}
          {enrolled && progress.data?.progressionMode === 'OPEN' ? (
            <OfflineDownloadCard
              courseId={courseId}
              enrolled={enrolled}
              courseDetail={data}
              progress={progress.data}
            />
          ) : null}

          {/* Course grade & what the certificate still waits for (online courses) */}
          {enrolled &&
          status !== 'DROPPED' &&
          data.deliveryMode !== 'IN_PERSON_ONLY' &&
          progress.data ? (
            <CourseGradeSummary progress={progress.data} />
          ) : null}

          {/* In-person seat */}
          {enrolled &&
          enrollment.data?.deliveryMode === 'IN_PERSON_ONLY' &&
          enrollment.data.venue ? (
            <Card className="shadow-2xs gap-2.5 border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/90">
              <AppText variant="label">{t('courses.yourSeat')}</AppText>
              <View className="flex-row items-center gap-2">
                <MapPin size={16} color={colors.primary} />
                <AppText className="flex-1 text-sm text-slate-700 dark:text-slate-300">
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

          {/* Pre-enrollment details: About, Objectives, Trainers, Other Details (hidden once enrolled) */}
          {!enrolled || status === 'DROPPED' ? (
            <>
              {/* About this course */}
              {description ? (
                <View className="gap-2 pt-2">
                  <View className="flex-row items-center gap-2">
                    <BookOpen size={18} color={colors.primary} />
                    <AppText className="text-lg font-bold tracking-wide text-slate-900 dark:text-white">
                      {t('courses.about')}
                    </AppText>
                  </View>
                  <AppText className="text-[15px] font-normal leading-6 text-slate-700 dark:text-slate-300">
                    {description}
                  </AppText>
                </View>
              ) : null}

              {/* What you will learn / Objectives */}
              {objectives ? (
                <View className="gap-2 pt-2">
                  <View className="flex-row items-center gap-2">
                    <Target size={18} color="#10b981" />
                    <AppText className="text-lg font-bold tracking-wide text-slate-900 dark:text-white">
                      {t('courses.objectives')}
                    </AppText>
                  </View>
                  <AppText className="text-[15px] font-normal leading-6 text-slate-700 dark:text-slate-300">
                    {objectives}
                  </AppText>
                </View>
              ) : null}

              {/* Trainers */}
              {data.trainers.length > 0 ? (
                <View className="gap-3 pt-2">
                  <View className="flex-row items-center gap-2">
                    <Users size={18} color="#0ea5e9" />
                    <AppText className="text-lg font-bold tracking-wide text-slate-900 dark:text-white">
                      {t('courses.trainers')}
                    </AppText>
                  </View>
                  <View className="gap-2">
                    {data.trainers.map(({ user }) => (
                      <View
                        key={user.id}
                        className="shadow-2xs flex-row items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60"
                      >
                        <Avatar
                          uri={user.avatarUrl}
                          firstName={user.firstName}
                          lastName={user.lastName}
                          size={40}
                        />
                        <View className="flex-1">
                          <AppText className="text-[15px] font-semibold text-slate-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </AppText>
                          {user.email ? (
                            <AppText className="text-xs text-slate-500 dark:text-slate-400">
                              {user.email}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Other Details (Expandable) */}
              <View className="pt-2">
                <Card className="shadow-2xs overflow-hidden border border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900/80">
                  <Pressable
                    onPress={() => setOtherDetailsOpen((prev) => !prev)}
                    className="flex-row items-center justify-between p-4 active:bg-slate-50 dark:active:bg-slate-800/60"
                    accessibilityRole="button"
                    accessibilityLabel={t('courses.otherDetails')}
                    accessibilityState={{ expanded: otherDetailsOpen }}
                  >
                    <View className="flex-row items-center gap-2.5">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                        <Info size={18} color="#f59e0b" />
                      </View>
                      <AppText className="text-base font-bold text-slate-900 dark:text-white">
                        {t('courses.otherDetails')}
                      </AppText>
                    </View>
                    {otherDetailsOpen ? (
                      <ChevronUp size={18} color={colors.textMuted} />
                    ) : (
                      <ChevronDown size={18} color={colors.textMuted} />
                    )}
                  </Pressable>

                  {otherDetailsOpen ? (
                    <View className="gap-3.5 border-t border-slate-100 px-4 pb-4 pt-1 dark:border-slate-800/80">
                      {/* Department / Ministry */}
                      <View className="gap-1">
                        <View className="flex-row items-center gap-1.5">
                          <Building2 size={14} color={colors.textMuted} />
                          <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('courses.departmentMinistry')}
                          </AppText>
                        </View>
                        <AppText className="pl-5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {data.department || t('courses.ministryFallback')}
                        </AppText>
                      </View>

                      {/* Target Audience */}
                      <View className="gap-1">
                        <View className="flex-row items-center gap-1.5">
                          <Users size={14} color={colors.textMuted} />
                          <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('courses.targetAudienceLabel')}
                          </AppText>
                        </View>
                        <AppText className="pl-5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {data.targetAudience || t('courses.audienceFallback')}
                        </AppText>
                      </View>

                      {/* Delivery Method */}
                      <View className="gap-1">
                        <View className="flex-row items-center gap-1.5">
                          <Monitor size={14} color={colors.textMuted} />
                          <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('courses.deliveryMethodLabel')}
                          </AppText>
                        </View>
                        <AppText className="pl-5 text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">
                          {data.deliveryMethod
                            ? data.deliveryMethod.replace(/_/g, ' ')
                            : data.deliveryMode === 'ONLINE_ONLY'
                              ? '100% Online Self-Paced Learning'
                              : data.deliveryMode === 'IN_PERSON_ONLY'
                                ? 'In-Person Classroom Practicum'
                                : 'Blended: Self-Paced & Live Sessions'}
                        </AppText>
                      </View>

                      {/* Primary Language */}
                      <View className="gap-1">
                        <View className="flex-row items-center gap-1.5">
                          <Globe size={14} color={colors.textMuted} />
                          <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('courses.primaryLanguageLabel')}
                          </AppText>
                        </View>
                        <AppText className="pl-5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {data.language || 'English / Amharic'}
                        </AppText>
                      </View>

                      {/* Prerequisites & Recommended Background */}
                      <View className="gap-1">
                        <View className="flex-row items-center gap-1.5">
                          <GraduationCap size={14} color={colors.textMuted} />
                          <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('courses.prerequisitesBackground')}
                          </AppText>
                        </View>
                        <AppText className="pl-5 text-sm font-normal leading-relaxed text-slate-700 dark:text-slate-300">
                          {data.prerequisites || t('courses.noPrerequisites')}
                        </AppText>
                      </View>
                    </View>
                  ) : null}
                </Card>
              </View>
            </>
          ) : null}

          {/* Bottom Pre-Enrollment CTA Banner */}
          {!enrolled || status === 'DROPPED' ? (
            <Card className="mt-3 gap-3.5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/50 p-5 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20">
                  <Compass size={22} color={colors.primary} />
                </View>
                <View className="flex-1 gap-1">
                  <AppText className="text-base font-bold text-slate-900 dark:text-white">
                    {t('courses.readyJourneyTitle')}
                  </AppText>
                  <AppText className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {t('courses.readyJourneySubtitle')}
                  </AppText>
                </View>
              </View>
              <Button
                title={enrollButtonTitle}
                icon={enrollButtonIcon}
                onPress={startEnroll}
                loading={enroll.isPending}
                fullWidth
              />
            </Card>
          ) : null}
        </View>
      </Screen>

      {/* Syllabus drawer (header button) */}
      {enrolled ? (
        <SyllabusDrawer
          visible={syllabusOpen}
          onClose={() => setSyllabusOpen(false)}
          course={data}
          progress={progress.data}
          onOpenLesson={openLesson}
          onOpenAssessment={openAssessment}
          onOpenCertificate={handleCertificatePress}
          onOpenCourseOverview={openCourseOverview}
          onOpenModuleOverview={openModuleOverview}
          onOpenLiveSessions={openLiveSessions}
          certificate={certificate.data}
        />
      ) : null}

      {/* Info Modal Sheet for Enrolled Learners */}
      <ModalSheet
        visible={infoSheetOpen}
        onClose={() => setInfoSheetOpen(false)}
        title={localized(data, 'title')}
        subtitle={t('courses.courseDetails')}
        icon={Info}
        showCloseButton
      >
        <ScrollView className="max-h-[70vh]" showsVerticalScrollIndicator={false}>
          <View className="gap-5 pb-6 pt-1">
            {/* About this course */}
            {description ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <BookOpen size={18} color={colors.primary} />
                  <AppText className="text-base font-bold text-slate-900 dark:text-white">
                    {t('courses.about')}
                  </AppText>
                </View>
                <AppText className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {description}
                </AppText>
              </View>
            ) : null}

            {/* What you will learn / Objectives */}
            {objectives ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Target size={18} color="#10b981" />
                  <AppText className="text-base font-bold text-slate-900 dark:text-white">
                    {t('courses.objectives')}
                  </AppText>
                </View>
                <AppText className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {objectives}
                </AppText>
              </View>
            ) : null}

            {/* Trainers */}
            {data.trainers.length > 0 ? (
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <Users size={18} color="#0ea5e9" />
                  <AppText className="text-base font-bold text-slate-900 dark:text-white">
                    {t('courses.trainers')}
                  </AppText>
                </View>
                <View className="gap-2">
                  {data.trainers.map(({ user }) => (
                    <View
                      key={user.id}
                      className="flex-row items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <Avatar
                        uri={user.avatarUrl}
                        firstName={user.firstName}
                        lastName={user.lastName}
                        size={38}
                      />
                      <View className="flex-1">
                        <AppText className="text-sm font-semibold text-slate-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </AppText>
                        {user.email ? (
                          <AppText className="text-xs text-slate-500 dark:text-slate-400">
                            {user.email}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Other Details in Modal */}
            <View className="gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <View className="mb-1 flex-row items-center gap-2">
                <Info size={16} color="#f59e0b" />
                <AppText className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('courses.otherDetails')}
                </AppText>
              </View>

              {/* Department / Ministry */}
              <View className="gap-1">
                <View className="flex-row items-center gap-1.5">
                  <Building2 size={13} color={colors.textMuted} />
                  <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('courses.departmentMinistry')}
                  </AppText>
                </View>
                <AppText className="pl-5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {data.department || t('courses.ministryFallback')}
                </AppText>
              </View>

              {/* Target Audience */}
              <View className="gap-1">
                <View className="flex-row items-center gap-1.5">
                  <Users size={13} color={colors.textMuted} />
                  <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('courses.targetAudienceLabel')}
                  </AppText>
                </View>
                <AppText className="pl-5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {data.targetAudience || t('courses.audienceFallback')}
                </AppText>
              </View>

              {/* Delivery Method */}
              <View className="gap-1">
                <View className="flex-row items-center gap-1.5">
                  <Monitor size={13} color={colors.textMuted} />
                  <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('courses.deliveryMethodLabel')}
                  </AppText>
                </View>
                <AppText className="pl-5 text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">
                  {data.deliveryMethod
                    ? data.deliveryMethod.replace(/_/g, ' ')
                    : data.deliveryMode === 'ONLINE_ONLY'
                      ? '100% Online Self-Paced Learning'
                      : data.deliveryMode === 'IN_PERSON_ONLY'
                        ? 'In-Person Classroom Practicum'
                        : 'Blended: Self-Paced & Live Sessions'}
                </AppText>
              </View>

              {/* Primary Language */}
              <View className="gap-1">
                <View className="flex-row items-center gap-1.5">
                  <Globe size={13} color={colors.textMuted} />
                  <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('courses.primaryLanguageLabel')}
                  </AppText>
                </View>
                <AppText className="pl-5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {data.language || 'English / Amharic'}
                </AppText>
              </View>

              {/* Prerequisites & Recommended Background */}
              <View className="gap-1">
                <View className="flex-row items-center gap-1.5">
                  <GraduationCap size={13} color={colors.textMuted} />
                  <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('courses.prerequisitesBackground')}
                  </AppText>
                </View>
                <AppText className="pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {data.prerequisites || t('courses.noPrerequisites')}
                </AppText>
              </View>
            </View>
          </View>
        </ScrollView>
      </ModalSheet>

      {/* Confirmation Dialog for Dropping Course */}
      <ConfirmDialog
        visible={dropOpen}
        onClose={() => setDropOpen(false)}
        onConfirm={confirmDrop}
        title={t('courses.dropConfirmTitle')}
        message={t('courses.dropConfirmBody')}
        confirmText={t('courses.drop')}
        cancelText={t('common.cancel')}
        variant="danger"
        icon={AlertTriangle}
        loading={drop.isPending}
      >
        <View className="gap-2 pt-1">
          <Input
            label={t('courses.dropReason')}
            placeholder={t('courses.dropReasonPlaceholder')}
            value={dropReason}
            onChangeText={setDropReason}
            maxLength={300}
          />
          <FormMessage message={dropError} />
        </View>
      </ConfirmDialog>

      {/* Course Evaluation Survey Modal (before claiming certificate) */}
      <CourseFeedbackModal
        visible={feedbackModalOpen}
        courseId={courseId}
        courseTitle={localized(data, 'title')}
        userId={user?.id}
        onClose={() => setFeedbackModalOpen(false)}
        onFeedbackSubmitted={() => {
          setFeedbackModalOpen(false);
          claimCertificateNow();
        }}
        onSkip={() => {
          setFeedbackModalOpen(false);
          claimCertificateNow();
        }}
      />
    </>
  );
}
