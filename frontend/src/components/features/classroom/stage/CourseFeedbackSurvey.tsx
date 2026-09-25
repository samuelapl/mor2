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
import { useTranslation } from '@/lib/i18n/useTranslation';
import { submitCourseFeedback } from '@/lib/api/feedback';
import type { Course } from '@/types';
import type { ApiUser } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface CourseFeedbackSurveyProps {
  course: Course;
  user: ApiUser | null;
  onSubmitted: () => void;
}

export function CourseFeedbackSurvey({ course, user, onSubmitted }: CourseFeedbackSurveyProps) {
  const { tBilingual } = useTranslation();

  const [curriculumRelevance, setCurriculumRelevance] = useState<number>(5);
  const [trainerDelivery, setTrainerDelivery] = useState<number>(5);
  const [practicalApplicability, setPracticalApplicability] = useState<number>(5);
  const [materialsAndPlatform, setMaterialsAndPlatform] = useState<number>(5);
  const [recommendToColleagues, setRecommendToColleagues] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const starLabels: Record<number, { en: string; am: string }> = {
    1: { en: 'Poor', am: 'ደካማ' },
    2: { en: 'Fair', am: 'መጠነኛ' },
    3: { en: 'Good', am: 'ጥሩ' },
    4: { en: 'Very Good', am: 'በጣም ጥሩ' },
    5: { en: 'Excellent', am: 'እጅግ በጣም ጥሩ' },
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
        tBilingual(
          'Thank you! Your feedback has been sent to course administrators. Certificate unlocked!',
          'እናመሰግናለን! አስተያየትዎ ለስልጠና አስተዳዳሪዎች ተልኳል። ሰርተፊኬትዎ ተከፍቷል!',
        ),
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
            {tBilingual(starLabels[value]?.en || '', starLabels[value]?.am || '')} ({value}/5)
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
              {tBilingual('Pre-Certificate Evaluation', 'የቅድመ-ሰርተፊኬት ግምገማ')}
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {tBilingual('Course Feedback & Evaluation', 'የኮርስ ግምገማ እና ግብረ-መልስ')}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {tBilingual(
                `Congratulations on passing the final assessment! Please complete this short evaluation for "${course.title}". Your feedback is submitted directly to designated training coordinators to help improve future programs and unlock your official certificate.`,
                `የማጠቃለያ ፈተናውን በተሳካ ሁኔታ ስላጠናቀቁ እንኳን ደስ አለዎት! እባክዎ ለ"${course.title}" ይህን አጭር ግምገማ ይሙሉ፤ አስተያየትዎ ለተፈቀደላቸው የስልጠና አስተባባሪዎች በቀጥታ የሚላክ ሲሆን ሰርተፊኬትዎን ወዲያውኑ ይከፍታል።`,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Survey Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Rating Category 1 */}
        {renderStarRating(
          tBilingual('1. Curriculum Relevance & Depth', '1. የስርዓተ-ትምህርቱ ተዛማጅነት እና ጥልቀት'),
          tBilingual(
            'How well did the topics meet your professional learning goals and revenue administration expectations?',
            'የትምህርት ይዘቱ ከሙያዊ ግቦችዎ እና ከገቢዎች አስተዳደር ፍላጎት ጋር ምን ያህል ተጣጣመ?',
          ),
          curriculumRelevance,
          setCurriculumRelevance,
        )}

        {/* Rating Category 2 */}
        {renderStarRating(
          tBilingual('2. Trainer Facilitation & Instruction', '2. የአሰልጣኙ የማስተማር እና የማብራራት ጥራት'),
          tBilingual(
            'How clearly did the instructor/trainer explain key concepts and answer questions?',
            'አሰልጣኙ ቁልፍ ፅንሰ-ሀሳቦችን ምን ያህል በግልጽ አብራርተዋል?',
          ),
          trainerDelivery,
          setTrainerDelivery,
        )}

        {/* Rating Category 3 */}
        {renderStarRating(
          tBilingual('3. Practical Job Applicability', '3. በስራ ላይ በቀጥታ የመጠቀም እድል'),
          tBilingual(
            'How readily can you apply the knowledge, tax procedures, or laws to your day-to-day duties at MoR?',
            'የተማሯቸውን እውቀቶች እና የግብር ሂደቶች በዕለት ተዕለት የገቢዎች ስራዎ ላይ ምን ያህል መተግበር ይችላሉ?',
          ),
          practicalApplicability,
          setPracticalApplicability,
        )}

        {/* Rating Category 4 */}
        {renderStarRating(
          tBilingual(
            '4. Platform Usability & Learning Materials',
            '4. የመድረኩ ምቾት እና የትምህርት ቁሳቁሶች ጥራት',
          ),
          tBilingual(
            'How do you evaluate video clarity, download materials, quiz navigation, and overall LMS speed?',
            'የቪዲዮ ጥራትን፣ ሰነዶችን፣ የፈተና አቀራረብን እና አጠቃላይ የሲስተሙን ፍጥነት እንዴት ይገመግማሉ?',
          ),
          materialsAndPlatform,
          setMaterialsAndPlatform,
        )}

        {/* Question 5: Recommendation */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2.5">
          <h4 className="text-sm font-bold text-slate-900">
            {tBilingual(
              '5. Would you recommend this course to fellow colleagues?',
              '5. ይህን ስልጠና ለሌሎች የስራ ባልደረቦችዎ ይመክራሉ?',
            )}
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
              {tBilingual('Yes, Highly Recommended', 'አዎ፣ በእርግጥ እመክራለሁ')}
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
              {tBilingual('Needs Revision First', 'መጀመሪያ መሻሻል ያስፈልገዋል')}
            </button>
          </div>
        </div>

        {/* Question 6: Comments & Suggestions */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2">
          <label className="block text-sm font-bold text-slate-900">
            {tBilingual(
              '6. Additional Comments & Improvement Suggestions (Optional)',
              '6. ተጨማሪ አስተያየቶች እና የማሻሻያ ሃሳቦች (አማራጭ)',
            )}
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={tBilingual(
              'Share what you liked most or specific topics you would like expanded in upcoming versions...',
              'በጣም የወደዱትን ወይም ወደፊት እንዲጨመሩ የሚፈልጓቸውን ርዕሰ ጉዳዮች ያካፍሉ...',
            )}
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Award className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              {tBilingual(
                'Submitting feedback unlocks your downloadable PDF certificate.',
                'ግብረ-መልስ ማስገባት የሚወርድ የፒዲኤፍ ሰርተፊኬትዎን ይከፍታል።',
              )}
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            isLoading={submitting}
            loadingText={tBilingual('Submitting Feedback...', 'ግብረ-መልስ በማስገባት ላይ...')}
            className="w-full sm:w-auto gap-2 px-6 py-2.5 shadow-md shadow-indigo-600/20"
          >
            <Send className="h-4 w-4" />
            {tBilingual('Submit Feedback & Unlock Certificate', 'ግብረ-መልስ አስገባ እና ሰርተፊኬት ክፈት')}
          </Button>
        </div>
      </form>
    </div>
  );
}
