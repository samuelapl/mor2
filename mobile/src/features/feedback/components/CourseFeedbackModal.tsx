import {
  CheckCircle2,
  HeartHandshake,
  MessageSquareHeart,
  Send,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Card, Input } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { useAppTheme } from '@/core/theme/theme-store';
import { Alert } from '@/core/utils/alert';
import { cn } from '@/core/utils/cn';
import { useSessionStore } from '@/features/auth';
import { markFeedbackSkipped, submitCourseFeedback } from '../api/feedback-storage';

export interface CourseFeedbackModalProps {
  visible: boolean;
  courseId: string;
  courseTitle: string;
  courseCode?: string;
  userId?: string;
  onClose: () => void;
  onSubmitted?: () => void;
  onFeedbackSubmitted?: () => void;
  onSkip: () => void;
}

export function CourseFeedbackModal({
  visible,
  courseId,
  courseTitle,
  courseCode,
  userId,
  onClose,
  onSubmitted,
  onFeedbackSubmitted,
  onSkip,
}: CourseFeedbackModalProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const isAm = locale === 'am';
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colors = useThemeColors();
  const user = useSessionStore((s) => s.user);

  const [curriculumRelevance, setCurriculumRelevance] = useState<number>(5);
  const [trainerDelivery, setTrainerDelivery] = useState<number>(5);
  const [practicalApplicability, setPracticalApplicability] = useState<number>(5);
  const [materialsAndPlatform, setMaterialsAndPlatform] = useState<number>(5);
  const [recommendToColleagues, setRecommendToColleagues] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const starLabels: Record<number, { en: string; am: string }> = {
    1: { en: 'Poor', am: 'ደካማ' },
    2: { en: 'Fair', am: 'መጠነኛ' },
    3: { en: 'Good', am: 'ጥሩ' },
    4: { en: 'Very Good', am: 'በጣም ጥሩ' },
    5: { en: 'Excellent', am: 'እጅግ በጣም ጥሩ' },
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const studentName =
        `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Verified Learner';
      const studentEmail = user?.email || 'learner@mor.gov.et';
      const studentId = user?.id || `usr-${Date.now()}`;
      const department = (user as any)?.department || 'General Operations';

      await submitCourseFeedback({
        courseId,
        courseTitle,
        courseCode,
        userId: studentId,
        userName: studentName,
        userEmail: studentEmail,
        department,
        ratings: {
          curriculumRelevance,
          trainerDelivery,
          practicalApplicability,
          materialsAndPlatform,
        },
        comments: comments.trim() || 'No additional comments provided.',
        recommendToColleagues,
      });

      Alert.alert(
        isAm ? 'እናመሰግናለን!' : 'Thank you!',
        isAm ? 'አስተያየትዎ በተሳካ ሁኔታ ተመዝግቧል።' : 'Your feedback has been submitted successfully.',
      );

      onFeedbackSubmitted?.();
      onSubmitted?.();
    } catch (err: any) {
      Alert.alert(
        t('common.somethingWrong', { defaultValue: 'Error' }),
        err?.message || 'Failed to record feedback. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    const studentId = userId || user?.id;
    if (studentId) {
      markFeedbackSkipped(courseId, studentId);
    }
    onSkip();
  };

  const renderStarRating = (
    label: string,
    sublabel: string,
    value: number,
    onChange: (val: number) => void,
  ) => {
    const activeLabel = isAm ? starLabels[value]?.am : starLabels[value]?.en;

    return (
      <View className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
        <View className="flex-row items-center justify-between mb-1">
          <AppText className="text-sm font-bold text-slate-900 dark:text-white flex-1 pr-2">
            {label}
          </AppText>
          <View className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 dark:border-amber-800/60 dark:bg-amber-950/40">
            <AppText className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
              {activeLabel} ({value}/5)
            </AppText>
          </View>
        </View>

        <AppText className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
          {sublabel}
        </AppText>

        <View className="flex-row items-center gap-2 pt-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= value;
            return (
              <Pressable
                key={star}
                onPress={() => onChange(star)}
                hitSlop={8}
                className="p-1 active:scale-95"
                accessibilityLabel={`${star} of 5 stars`}
              >
                <Star
                  size={26}
                  color={active ? '#f59e0b' : isDark ? '#475569' : '#cbd5e1'}
                  fill={active ? '#f59e0b' : 'transparent'}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className={cn('flex-1', isDark && 'dark')}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <Pressable accessibilityLabel="Close" onPress={onClose} className="flex-1 bg-black/60" />

          <View
            style={{
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
            className="max-h-[88%] rounded-t-3xl border-t px-4 pt-3 shadow-2xl"
          >
            {/* Drag Handle */}
            <View
              style={{ backgroundColor: isDark ? '#475569' : '#cbd5e1' }}
              className="mb-3 h-1.5 w-12 self-center rounded-full"
            />

            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20">
                  <MessageSquareHeart size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Sparkles size={13} color={colors.primary} />
                    <AppText className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {isAm ? 'የኮርስ ግምገማ (አማራጭ)' : 'Course Evaluation (Optional)'}
                    </AppText>
                  </View>
                  <AppText className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    {isAm ? 'የኮርስ ግምገማ እና ግብረ-መልስ' : 'Course Feedback & Evaluation'}
                  </AppText>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:opacity-70"
              >
                <X size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView className="py-3" showsVerticalScrollIndicator={false}>
              <View className="gap-3.5 pb-6">
                {/* Congratulatory Callout */}
                <Card className="border border-indigo-100 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/30 p-3.5">
                  <AppText className="text-xs text-slate-700 dark:text-slate-300 leading-5">
                    {isAm
                      ? `"${courseTitle}"ን በማጠናቀቅዎ እንኳን ደስ አለዎት! የወደፊት ስልጠናዎችን እንድናሻሽል እባክዎ አስተያየትዎን ያካፍሉ፣ ወይም በቀጥታ ሰርተፊኬትዎን ይውሰዱ።`
                      : `Congratulations on completing "${courseTitle}"! Please take a moment to submit your feedback to help us improve future programs, or skip ahead to claim your certificate.`}
                  </AppText>
                </Card>

                {/* Rating 1: Curriculum Relevance */}
                {renderStarRating(
                  isAm ? '1. የስርዓተ-ትምህርቱ ተዛማጅነት' : '1. Curriculum Relevance & Depth',
                  isAm
                    ? 'የትምህርት ይዘቱ ከሙያዊ ግቦችዎ ጋር ምን ያህል ተጣጣመ?'
                    : 'How well did topics meet your professional learning goals?',
                  curriculumRelevance,
                  setCurriculumRelevance,
                )}

                {/* Rating 2: Trainer Delivery */}
                {renderStarRating(
                  isAm ? '2. የአሰልጣኝ አቀራረብ ጥራት' : '2. Trainer Delivery & Instruction',
                  isAm
                    ? 'ፅንሰ-ሀሳቦቹ እና አሰራሮቹ በምን ያህል ግልጽነት ተብራሩ?'
                    : 'How effectively were complex taxation concepts communicated?',
                  trainerDelivery,
                  setTrainerDelivery,
                )}

                {/* Rating 3: Practical Applicability */}
                {renderStarRating(
                  isAm ? '3. ተግባራዊ ተፈጻሚነት' : '3. Practical Applicability',
                  isAm
                    ? 'የተማሩት እውቀት ለዕለታዊ የስራ ኃላፊነትዎ ምን ያህል ይጠቅማል?'
                    : 'How applicable are the skills to your daily responsibilities?',
                  practicalApplicability,
                  setPracticalApplicability,
                )}

                {/* Rating 4: Materials & Platform */}
                {renderStarRating(
                  isAm ? '4. የይዘት እና የመድረክ ምቾት' : '4. Materials & Platform Usability',
                  isAm
                    ? 'የስልጠና ማቴሪያሎች፣ ቪዲዮዎች እና የመተግበሪያው ምቾት?'
                    : 'Quality of training modules, materials, and mobile platform.',
                  materialsAndPlatform,
                  setMaterialsAndPlatform,
                )}

                {/* Recommend to Colleagues Toggle */}
                <View className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/60">
                  <View className="flex-row items-center gap-2 mb-2">
                    <HeartHandshake size={16} color={colors.primary} />
                    <AppText className="text-sm font-bold text-slate-900 dark:text-white">
                      {isAm
                        ? 'ይህን ኮርስ ለስራ ባልደረቦችዎ ይመክራሉ?'
                        : 'Would you recommend this course to colleagues?'}
                    </AppText>
                  </View>

                  <View className="flex-row items-center gap-3 pt-1">
                    <Pressable
                      onPress={() => setRecommendToColleagues(true)}
                      className={cn(
                        'flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl border',
                        recommendToColleagues
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40',
                      )}
                    >
                      <ThumbsUp
                        size={16}
                        color={recommendToColleagues ? '#16a34a' : colors.textMuted}
                      />
                      <AppText
                        className={cn(
                          'text-xs font-bold',
                          recommendToColleagues
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-slate-600 dark:text-slate-400',
                        )}
                      >
                        {isAm ? 'አዎ፣ እመክራለሁ' : 'Yes, highly recommend'}
                      </AppText>
                    </Pressable>

                    <Pressable
                      onPress={() => setRecommendToColleagues(false)}
                      className={cn(
                        'flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl border',
                        !recommendToColleagues
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40',
                      )}
                    >
                      <ThumbsDown
                        size={16}
                        color={!recommendToColleagues ? '#d97706' : colors.textMuted}
                      />
                      <AppText
                        className={cn(
                          'text-xs font-bold',
                          !recommendToColleagues
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-400',
                        )}
                      >
                        {isAm ? 'አይ፣ አልመክርም' : 'No / Neutral'}
                      </AppText>
                    </Pressable>
                  </View>
                </View>

                {/* Additional Comments */}
                <View className="gap-1.5">
                  <Input
                    label={isAm ? 'ተጨማሪ አስተያየቶች (አማራጭ)' : 'Additional Comments (Optional)'}
                    placeholder={
                      isAm
                        ? 'ለወደፊት ማሻሻያ የሚረዱ አስተያየቶችዎን እዚህ ያስገቡ...'
                        : 'Share suggestions to improve future courses...'
                    }
                    value={comments}
                    onChangeText={setComments}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Action Buttons: Submit Feedback & Skip */}
                <View className="gap-2.5 pt-2">
                  <Button
                    title={
                      submitting
                        ? isAm
                          ? 'ግብረ-መልስ በማስገባት ላይ...'
                          : 'Submitting Feedback...'
                        : isAm
                          ? 'ግብረ-መልስ አስገባ'
                          : 'Submit Feedback'
                    }
                    icon={<Send size={16} color="#fff" />}
                    onPress={handleSubmit}
                    loading={submitting}
                    fullWidth
                  />

                  <Button
                    title={
                      isAm
                        ? 'ዝለልና ሰርተፊኬቱን ውሰድ'
                        : 'Skip & Claim Certificate'
                    }
                    variant="ghost"
                    onPress={handleSkip}
                    disabled={submitting}
                    fullWidth
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
