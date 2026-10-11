'use client';

import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  FileCheck,
  HeartHandshake,
  Loader2,
  MessageSquareHeart,
  Send,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import type { NamespaceKey } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { submitCourseFeedback } from '@/lib/api/feedback';
import type { Course } from '@/types';
import type { ApiUser } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface CourseFeedbackSurveyProps {
  course: Course;
  user: ApiUser | null;
  onSubmitted: () => void;
  onSkip?: () => void;
}

export function CourseFeedbackSurvey({ course, user, onSubmitted, onSkip }: CourseFeedbackSurveyProps) {
  const { t } = useTranslation('classroom');

  const [curriculumRelevance, setCurriculumRelevance] = useState<number>(5);
  const [trainerDelivery, setTrainerDelivery] = useState<number>(5);
  const [practicalApplicability, setPracticalApplicability] = useState<number>(5);
  const [materialsAndPlatform, setMaterialsAndPlatform] = useState<number>(5);
  const [recommendToColleagues, setRecommendToColleagues] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const starLabels: Record<number, NamespaceKey<'classroom'>> = {
    1: 'courseFeedbackSurvey.poor',
    2: 'courseFeedbackSurvey.fair',
    3: 'courseFeedbackSurvey.good',
    4: 'courseFeedbackSurvey.veryGood',
    5: 'courseFeedbackSurvey.excellent',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const studentName =
        `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Verified Learner';
      const studentEmail = user?.email || 'learner@mor.gov.et';
      const studentId = user?.id || `usr-${Date.now()}`;
      const department = (user as any)?.department || 'General Operations';

      await submitCourseFeedback({
        courseId: course.id,
        courseTitle: course.title,
        courseCode: course.code,
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

      toast.success(
        t('courseFeedbackSurvey.thankYouYourFeedbackHasBeen'),
      );

      onSubmitted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to record feedback. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = (
    label: string,
    sublabel: string,
    value: number,
    onChange: (val: number) => void,
  ) => {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-indigo-200 transition space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{label}</h4>
            <p className="text-xs text-slate-500">{sublabel}</p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 self-start sm:self-auto">
            {starLabels[value] ? t(starLabels[value]) : ''} ({value}/5)
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= value;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className="group p-1 focus:outline-none transition-transform active:scale-95"
                title={`${star} / 5`}
              >
                <Star
                  className={cn(
                    'h-6 w-6 transition-colors',
                    active
                      ? 'fill-amber-400 text-amber-400 group-hover:fill-amber-500 group-hover:text-amber-500'
                      : 'text-slate-200 group-hover:text-slate-300',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 p-6 md:p-8 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <MessageSquareHeart className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold text-indigo-900">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              {t('courseFeedbackSurvey.courseEvaluationOptional')}
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {t('courseFeedbackSurvey.courseFeedbackEvaluation')}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {t('courseFeedbackSurvey.congratulationsOnCompletingPleaseTakeA', { title: course.title })}
            </p>
          </div>
        </div>
      </div>

      {/* Survey Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Rating Category 1 */}
        {renderStarRating(
          t('courseFeedbackSurvey.n1CurriculumRelevanceDepth'),
          t('courseFeedbackSurvey.howWellDidTheTopicsMeet'),
          curriculumRelevance,
          setCurriculumRelevance,
        )}

        {/* Rating Category 2 */}
        {renderStarRating(
          t('courseFeedbackSurvey.n2TrainerFacilitationInstruction'),
          t('courseFeedbackSurvey.howClearlyDidTheInstructorTrainer'),
          trainerDelivery,
          setTrainerDelivery,
        )}

        {/* Rating Category 3 */}
        {renderStarRating(
          t('courseFeedbackSurvey.n3PracticalJobApplicability'),
          t('courseFeedbackSurvey.howReadilyCanYouApplyThe'),
          practicalApplicability,
          setPracticalApplicability,
        )}

        {/* Rating Category 4 */}
        {renderStarRating(
          t('courseFeedbackSurvey.n4PlatformUsabilityLearningMaterials'),
          t('courseFeedbackSurvey.howDoYouEvaluateVideoClarity'),
          materialsAndPlatform,
          setMaterialsAndPlatform,
        )}

        {/* Question 5: Recommendation */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2.5">
          <h4 className="text-sm font-bold text-slate-900">
            {t('courseFeedbackSurvey.n5WouldYouRecommendThisCourse')}
          </h4>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRecommendToColleagues(true)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold border transition',
                recommendToColleagues
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
              )}
            >
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
              {t('courseFeedbackSurvey.yesHighlyRecommended')}
            </button>
            <button
              type="button"
              onClick={() => setRecommendToColleagues(false)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold border transition',
                !recommendToColleagues
                  ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
              )}
            >
              <ThumbsDown className="h-4 w-4 text-amber-600" />
              {t('courseFeedbackSurvey.needsRevisionFirst')}
            </button>
          </div>
        </div>

        {/* Question 6: Comments & Suggestions */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2">
          <label className="block text-sm font-bold text-slate-900">
            {t('courseFeedbackSurvey.n6AdditionalCommentsImprovementSuggestio')}
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={t('courseFeedbackSurvey.shareWhatYouLikedMostOr')}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Submit & Skip Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MessageSquareHeart className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>
              {t('courseFeedbackSurvey.submitYourFeedback')}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {onSkip && (
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={onSkip}
                className="w-full sm:w-auto gap-2 px-5 py-2.5 text-slate-700 hover:text-slate-900 border-slate-300 hover:bg-slate-50"
              >
                <Award className="h-4 w-4 text-amber-500" />
                {t('courseFeedbackSurvey.skipToCertificate')}
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              isLoading={submitting}
              loadingText={t('courseFeedbackSurvey.submittingFeedback')}
              className="w-full sm:w-auto gap-2 px-6 py-2.5 shadow-md shadow-indigo-600/20"
            >
              <Send className="h-4 w-4" />
              {t('courseFeedbackSurvey.submitFeedback')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
