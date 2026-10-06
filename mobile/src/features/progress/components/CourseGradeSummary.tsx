import { AlertTriangle, CalendarClock, CircleCheck, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

import type { CourseProgress } from '../types/progress.types';

/**
 * Course grade vs. the certificate requirement, with every assessment's share (live-session
 * quizzes included), so the learner sees why the certificate is or isn't unlocked yet.
 * Mirrors the web CourseGradeSummary + PendingSessionsNotice.
 */
export function CourseGradeSummary({ progress }: { progress: CourseProgress }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const completion = progress.courseCompletion;
  const breakdown = completion.assessmentBreakdown ?? [];
  if (breakdown.length === 0) return null;

  const grade = completion.totalCourseGrade ?? 0;
  const required = completion.passingScorePercent ?? 0;
  const short = completion.gradeSatisfied === false;
  const sessionsPending = completion.sessionsPending ?? 0;
  // Only a real miss once nothing is left to take; while sessions are pending the grade is provisional.
  const blocked =
    sessionsPending === 0 &&
    completion.contentCompleted &&
    completion.allAssessmentsPassed !== false &&
    short;
  const canRetake = breakdown.some((a) => a.retakeAvailable);
  const pendingSessions = (progress.liveSessions ?? []).filter((s) => s.status !== 'COMPLETED');

  return (
    <Card className="gap-4">
      {sessionsPending > 0 ? (
        <View className="flex-row gap-3 rounded-xl bg-sky-50 p-3 dark:bg-sky-950/30">
          <CalendarClock size={18} color="#0284c7" />
          <View className="flex-1 gap-0.5">
            <AppText className="text-sm font-bold text-sky-900 dark:text-sky-200">
              {t('grade.sessionsPendingTitle', { count: sessionsPending })}
            </AppText>
            <AppText className="text-xs leading-5 text-sky-800 dark:text-sky-300">
              {pendingSessions.length > 0
                ? t('grade.sessionsPendingBody', {
                    names: pendingSessions.map((s) => s.titleEn).join(', '),
                  })
                : t('grade.sessionsPendingGeneric')}
            </AppText>
          </View>
        </View>
      ) : null}

      {blocked ? (
        <View className="flex-row gap-3 rounded-xl bg-red-50 p-3 dark:bg-red-950/30">
          <AlertTriangle size={18} color={colors.danger} />
          <View className="flex-1 gap-0.5">
            <AppText className="text-sm font-bold text-red-800 dark:text-red-200">
              {t('grade.notReached', { grade, required })}
            </AppText>
            <AppText className="text-xs leading-5 text-red-700 dark:text-red-300">
              {canRetake ? t('grade.retakeHint') : t('grade.contactSupport')}
            </AppText>
          </View>
        </View>
      ) : null}

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <AppText variant="label">{t('grade.courseGrade')}</AppText>
          <AppText className={cn('text-sm font-bold', short ? 'text-red-600' : 'text-green-600')}>
            {t('grade.ofRequired', { grade, required })}
          </AppText>
        </View>
        <View className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <View
            style={{ width: `${Math.min(100, grade)}%` }}
            className={cn('h-full rounded-full', short ? 'bg-red-500' : 'bg-green-500')}
          />
          <View
            style={{ left: `${Math.min(100, required)}%` }}
            className="absolute bottom-0 top-0 w-0.5 bg-slate-700 dark:bg-slate-300"
          />
        </View>
      </View>

      <View className="gap-1">
        {breakdown.map((a) => {
          const session = a.type === 'SESSION_ASSESSMENT';
          return (
            <View
              key={a.id}
              className="flex-row items-center gap-2.5 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"
            >
              {a.passed ? (
                <CircleCheck size={16} color={colors.success} />
              ) : (
                <XCircle size={16} color={a.attempted ? colors.danger : colors.textMuted} />
              )}
              <View className="flex-1 gap-1">
                <AppText
                  className="text-sm font-medium text-slate-800 dark:text-slate-100"
                  numberOfLines={2}
                >
                  {localized(a, 'title')}
                </AppText>
                <View className="flex-row flex-wrap gap-1.5">
                  {session ? <Badge label={t('grade.liveSession')} tone="brand" /> : null}
                  {!a.attempted ? (
                    <Badge label={session ? t('grade.upcoming') : t('grade.notTaken')} />
                  ) : null}
                </View>
              </View>
              <View className="items-end">
                <AppText className="text-sm font-bold text-slate-900 dark:text-white">
                  {a.attempted ? `${a.bestScore ?? 0}%` : '—'}
                </AppText>
                <AppText variant="caption">
                  {t('grade.weightPoints', { weight: a.weight ?? 0, points: a.earnedPoints ?? 0 })}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
