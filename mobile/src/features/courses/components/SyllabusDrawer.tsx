import { ListTree, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, ProgressBar } from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { useAppTheme } from '@/core/theme/theme-store';
import { cn } from '@/core/utils/cn';

import { CourseSyllabus, type CourseSyllabusProps } from './CourseSyllabus';

export interface SyllabusDrawerProps extends CourseSyllabusProps {
  visible: boolean;
  onClose: () => void;
}

/** Right-side drawer with the full course syllabus, opened from the course/lesson header. */
export function SyllabusDrawer({ visible, onClose, ...syllabus }: SyllabusDrawerProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const stats = syllabus.progress?.stats;
  const percent = Math.round(stats?.overallPercent ?? 0);

  // Every navigation from the drawer closes it first.
  const close = <A extends unknown[]>(fn?: (...args: A) => void) =>
    fn
      ? (...args: A) => {
          onClose();
          fn(...args);
        }
      : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className={cn('flex-1 flex-row', isDark && 'dark')}>
        <Animated.View
          entering={FadeIn.duration(180)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable accessibilityLabel={t('common.close')} onPress={onClose} className="flex-1" />
        </Animated.View>

        <Animated.View
          entering={SlideInRight.duration(260)}
          style={{
            width: '88%',
            maxWidth: 420,
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 24,
          }}
        >
          <View className="gap-3 border-b border-slate-200 px-4 pb-4 dark:border-slate-800">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
                <ListTree size={18} color="#fff" />
              </View>
              <View className="flex-1">
                <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t('courses.syllabus')}
                </AppText>
                <AppText
                  className="text-[15px] font-bold text-slate-900 dark:text-white"
                  numberOfLines={1}
                >
                  {localized(syllabus.course, 'title')}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={onClose}
                className="rounded-full p-2 active:bg-slate-200 dark:active:bg-slate-800"
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {stats ? (
              <View className="gap-1.5">
                <ProgressBar percent={percent} tone={percent >= 100 ? 'success' : 'brand'} />
                <AppText variant="caption">
                  {t('courses.lessonsDoneRatio', {
                    done: stats.completedLessons,
                    total: stats.totalLessons,
                    defaultValue: `${stats.completedLessons} of ${stats.totalLessons} lessons completed`,
                  })}
                  {` · ${percent}%`}
                </AppText>
              </View>
            ) : null}
          </View>

          <ScrollView
            contentContainerClassName="p-3"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
          >
            <CourseSyllabus
              {...syllabus}
              onOpenLesson={close(syllabus.onOpenLesson)!}
              onOpenAssessment={close(syllabus.onOpenAssessment)!}
              onOpenCertificate={close(syllabus.onOpenCertificate)}
              onOpenCourseOverview={close(syllabus.onOpenCourseOverview)}
              onOpenModuleOverview={close(syllabus.onOpenModuleOverview)}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
