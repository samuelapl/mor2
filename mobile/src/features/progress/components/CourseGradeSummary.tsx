import { AlertTriangle, CalendarClock, CircleCheck, Video, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { formatDateTime } from '@/core/utils/formatters';

import type { CourseProgress, MissingSession } from '../types/progress.types';

/** Live sessions still to attend: the server's list, or (older servers) the unattended sessions. */
function missingLiveSessions(progress: CourseProgress): MissingSession[] {
  const missing = progress.courseCompletion.missingSessions;
  if (missing) return missing;
  return (progress.liveSessions ?? [])
    .filter((s) => s.status !== 'COMPLETED' || !s.attended)
    .map((s) => ({
      id: s.id,
      title: s.titleEn,
      nextSessionAt: s.status === 'COMPLETED' ? null : s.scheduledAt,
    }));
}

/**
 * Course grade vs. the certificate requirement, with every graded assessment's share, plus the
 * live sessions still to attend, so the learner sees why the certificate is or isn't unlocked
 * yet. Live-session quizzes are formative: listed apart with their score, outside the grade.
 * Mirrors the web CourseGradeSummary + PendingSessionsNotice.
 */
export function CourseGradeSummary({ progress }: { progress: CourseProgress }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const completion = progress.courseCompletion;
  const all = completion.assessmentBreakdown ?? [];
  const breakdown = all.filter((a) => a.type !== 'SESSION_ASSESSMENT');
  const sessionQuizzes = all.filter((a) => a.type === 'SESSION_ASSESSMENT');
  const missingSessions = missingLiveSessions(progress);
  if (all.length === 0 && missingSessions.length === 0) return null;

  const grade = completion.totalCourseGrade ?? 0;
  const required = completion.passingScorePercent ?? 0;
  const short = completion.gradeSatisfied === false;
  // Finished everything and still short: the learner is truly blocked by the grade.
  const blocked = completion.contentCompleted && completion.allAssessmentsPassed !== false && short;
  const canRetake = breakdown.some((a) => a.retakeAvailable);

  return (
    <Card className="gap-4">
      {missingSessions.length > 0 ? (
        <View className="flex-row gap-3 rounded-xl bg-sky-50 p-3 dark:bg-sky-950/30">
          <CalendarClock size={18} color="#0284c7" />
          <View className="flex-1 gap-1">
            <AppText className="text-sm font-bold text-sky-900 dark:text-sky-200">
              {t('grade.sessionsMissingTitle', { count: missingSessions.length })}
            </AppText>
            {missingSessions.map((s) => (
              <AppText key={s.id} className="text-xs leading-5 text-sky-800 dark:text-sky-300">
                <AppText className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                  {s.title}
                </AppText>
                {' — '}
                {s.nextSessionAt
                  ? t('grade.nextSession', { date: formatDateTime(s.nextSessionAt, locale) })
                  : t('grade.notScheduledYet')}
              </AppText>
            ))}
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

      {breakdown.length > 0 ? (
        <>
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <AppText variant="label">{t('grade.courseGrade')}</AppText>
              <AppText
                className={cn('text-sm font-bold', short ? 'text-red-600' : 'text-green-600')}
              >
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
                      {!a.attempted ? <Badge label={t('grade.notTaken')} /> : null}
                    </View>
                  </View>
                  <View className="items-end">
                    <AppText className="text-sm font-bold text-slate-900 dark:text-white">
                      {a.attempted ? `${a.bestScore ?? 0}%` : '—'}
                    </AppText>
                    <AppText variant="caption">
                      {t('grade.weightPoints', {
                        weight: a.weight ?? 0,
                        points: a.earnedPoints ?? 0,
                      })}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      {sessionQuizzes.length > 0 ? (
        <View className="gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <View className="flex-row items-center gap-1.5">
            <Video size={14} color={colors.textMuted} />
            <AppText variant="label">{t('grade.sessionQuizzes')}</AppText>
          </View>
          {sessionQuizzes.map((a) => (
            <View key={a.id} className="flex-row items-center justify-between gap-3">
              <AppText
                className="flex-1 text-sm text-slate-800 dark:text-slate-100"
                numberOfLines={2}
              >
                {localized(a, 'title')}
              </AppText>
              <AppText className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {a.attempted ? `${a.bestScore ?? 0}%` : t('grade.noScoreYet')}
              </AppText>
            </View>
          ))}
          <AppText variant="caption">{t('grade.sessionQuizzesNote')}</AppText>
        </View>
      ) : null}
    </Card>
  );
}
