'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  FileQuestion,
  Loader2,
  UserCheck,
  Video,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLms } from '@/lib/lms-store';
import { usePolicyPassMark } from '@/lib/api/usePolicyPassMark';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import type { ApiAssessment } from '@/lib/api/types';
import type { CourseStatus, SessionPlan, User } from '@/types';
import { AssessmentQuestionPreview } from '../../detail/AssessmentQuestionPreview';
import { RichSection, StageCard, StageTitle } from './StageParts';

const PLATFORM_LABEL: Record<string, string> = {
  LIVEKIT: 'Virtual classroom',
  ZOOM: 'Zoom',
  GOOGLE_MEET: 'Google Meet',
  MS_TEAMS: 'Microsoft Teams',
  CUSTOM: 'Online meeting',
};

interface SessionPlanStageProps {
  plan: SessionPlan;
  index: number;
  courseStatus: CourseStatus;
  /** The session's weighted quizzes with their prepared questions and answers. */
  quizAssessments: ApiAssessment[];
  courseId?: string;
  canAssignTrainer?: boolean;
  trainerOptions?: User[];
  onTrainerAssigned?: () => void;
}

/**
 * A planned online session as an approver or publisher sees it: what it covers, when it is
 * scheduled, and every prepared quiz question with its answer.
 */
export function SessionPlanStage({
  plan,
  index,
  courseStatus,
  quizAssessments,
  courseId,
  canAssignTrainer,
  trainerOptions = [],
  onTrainerAssigned,
}: SessionPlanStageProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const { userName } = useLms();
  const policyPassMark = usePolicyPassMark();
  const weight = plan.quizzes.reduce((sum, q) => sum + (q.weight || 0), 0);
  const scheduled = plan.liveSession;
  const afterApproval = courseStatus === 'approved' || courseStatus === 'published';

  const [selectedTrainerId, setSelectedTrainerId] = useState(scheduled?.trainerId || '');
  const [busy, setBusy] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newDuration, setNewDuration] = useState('60');
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    setSelectedTrainerId(scheduled?.trainerId || '');
  }, [scheduled?.trainerId]);

  const handleAssignTrainer = async () => {
    if (!scheduled || !selectedTrainerId) return;
    setBusy(true);
    try {
      await api(`live-sessions/${scheduled.id}`, {
        method: 'PATCH',
        body: { trainerId: selectedTrainerId },
      });
      toast.success(tBilingual('Trainer assigned to this session.', 'ለዚህ ክፍለ-ጊዜ አሰልጣኝ ተመድቧል።'));
      onTrainerAssigned?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign trainer to this session');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveTrainer = async () => {
    if (!scheduled) return;
    setBusy(true);
    try {
      await api(`live-sessions/${scheduled.id}`, {
        method: 'PATCH',
        body: { trainerId: null },
      });
      setSelectedTrainerId('');
      toast.success(tBilingual('Trainer removed from this session.', 'አሰልጣኝ ከዚህ ክፍለ-ጊዜ ተነስቷል።'));
      onTrainerAssigned?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove trainer from this session');
    } finally {
      setBusy(false);
    }
  };

  const handleScheduleSession = async () => {
    if (!courseId || !newDate) {
      toast.error(tBilingual('Please select a date and time.', 'እባክዎ ቀን እና ሰዓት ይምረጡ።'));
      return;
    }
    setScheduling(true);
    try {
      await api(`courses/${courseId}/live-sessions`, {
        method: 'POST',
        body: {
          titleEn: plan.titleEn || `Session ${index + 1}`,
          sessionPlanId: plan.id,
          scheduledAt: new Date(newDate).toISOString(),
          durationMinutes: parseInt(newDuration, 10) || 60,
          trainerId: selectedTrainerId || undefined,
          platform: 'LIVEKIT',
        },
      });
      toast.success(tBilingual('Session scheduled and trainer assigned.', 'ክፍለ-ጊዜው ታቅዶ አሰልጣኝ ተመድቧል።'));
      onTrainerAssigned?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to schedule session');
    } finally {
      setScheduling(false);
    }
  };

  // Same checks as the backend publish guard (CoursesService.assertSessionsReadyToPublish).
  const publishBlockers: string[] = [];
  if (afterApproval && !scheduled) publishBlockers.push(tBilingual('This session is not scheduled yet.', 'ይህ ክፍለ-ጊዜ ገና አልታቀደም።'));
  for (const q of plan.quizzes) {
    const prepared = quizAssessments.find((a) => a.id === q.id);
    const questions = prepared?.questions ?? [];
    if (afterApproval && questions.length === 0) {
      publishBlockers.push(tBilingual(`"${q.titleEn}" has no questions yet.`, `"${q.titleEn}" ገና ጥያቄ የለውም።`));
    } else if (afterApproval) {
      // One point per percent of course weight, so a 10% quiz totals 10 points.
      const points = questions.reduce((sum, question) => sum + (question.points ?? 0), 0);
      if (points !== q.weight) {
        publishBlockers.push(
          tBilingual(
            `"${q.titleEn}" has ${points} of ${q.weight} points assigned.`,
            `"${q.titleEn}" ${q.weight} ነጥብ ሊኖረው ይገባል፤ ${points} ብቻ ተመድቧል።`,
          ),
        );
      }
    }
  }

  return (
    <div className="space-y-6">
      <StageTitle
        icon={<Video className="h-4 w-4" />}
        eyebrow={`${tBilingual('Online session', 'የኦንላይን ክፍለ-ጊዜ')} ${index + 1}`}
        title={plan.titleEn || tBilingual('Untitled session', 'ርዕስ የሌለው ክፍለ-ጊዜ')}
        meta={
          <>
            {scheduled ? (
              <span className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                <CalendarCheck className="h-3.5 w-3.5" />
                {new Date(scheduled.scheduledAt).toLocaleString(isAmharic ? 'am-ET' : undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-semibold text-slate-600">
                <CalendarClock className="h-3.5 w-3.5" />
                {tBilingual('Not scheduled yet', 'ገና አልታቀደም')}
              </span>
            )}
            <span>
              {plan.quizzes.length} {tBilingual(plan.quizzes.length === 1 ? 'quiz' : 'quizzes', 'ፈተናዎች')} · {weight}%{' '}
              {tBilingual('of the course grade', 'ከኮርስ ውጤት')}
            </span>
          </>
        }
      />

      {publishBlockers.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {tBilingual('Blocks publishing', 'ማተምን ያግዳል')}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-rose-800">
            {publishBlockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {scheduled && (
        <StageCard title={tBilingual('Scheduled session', 'የታቀደ ክፍለ-ጊዜ')} icon={<CalendarCheck className="h-4 w-4" />}>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Detail label={tBilingual('Date & time', 'ቀን እና ሰዓት')}>
              {new Date(scheduled.scheduledAt).toLocaleString(isAmharic ? 'am-ET' : undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </Detail>
            <Detail label={tBilingual('Duration', 'ቆይታ')}>{scheduled.durationMinutes ? `${scheduled.durationMinutes} min` : '—'}</Detail>
            <Detail label={tBilingual('Platform', 'መድረክ')}>
              {scheduled.platform ? (PLATFORM_LABEL[scheduled.platform] ?? scheduled.platform) : '—'}
            </Detail>
            <Detail label={tBilingual('Trainer', 'አሰልጣኝ')}>{scheduled.trainerId ? userName(scheduled.trainerId) : '—'}</Detail>
          </dl>
          <p className="text-xs text-slate-500">
            {tBilingual('Status:', 'ሁኔታ:')} <span className="font-semibold text-slate-700">{scheduled.status}</span>
          </p>
        </StageCard>
      )}

      {/* Per-Session Trainer Assignment Card */}
      {scheduled ? (
        <StageCard
          title={tBilingual('Session Trainer Assignment', 'የክፍለ-ጊዜ አሰልጣኝ ምደባ')}
          icon={<UserCheck className="h-4 w-4 text-indigo-600" />}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div>
                <p className="text-xs font-medium text-slate-500">{tBilingual('Current Trainer for this Session', 'የዚህ ክፍለ-ጊዜ አሰልጣኝ')}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                  {scheduled.trainerId ? userName(scheduled.trainerId) : tBilingual('No trainer assigned yet', 'ገና አሰልጣኝ አልተመደበም')}
                </p>
              </div>
              {scheduled.trainerId && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                  <UserCheck className="h-3.5 w-3.5" />
                  {tBilingual('Assigned', 'ተመድቧል')}
                </span>
              )}
            </div>

            {canAssignTrainer && (
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tBilingual('Assign Trainer for this Session', 'ለዚህ ክፍለ-ጊዜ አሰልጣኝ መድብ')}
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <select
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                    disabled={busy}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">{tBilingual('Select a trainer…', 'አሰልጣኝ ይምረጡ…')}</option>
                    {(trainerOptions || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!selectedTrainerId || selectedTrainerId === scheduled.trainerId || busy}
                      onClick={() => void handleAssignTrainer()}
                      className="whitespace-nowrap"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                      {scheduled.trainerId
                        ? tBilingual('Reassign Trainer', 'አሰልጣኝ ቀይር')
                        : tBilingual('Assign to Session', 'ለክፍለ-ጊዜው መድብ')}
                    </Button>

                    {scheduled.trainerId && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleRemoveTrainer()}
                        className="text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
                      >
                        {tBilingual('Remove', 'አስወግድ')}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  {tBilingual(
                    'Each session can have a dedicated trainer assigned individually.',
                    'እያንዳንዱ ክፍለ-ጊዜ የተለየ አሰልጣኝ ለብቻው ሊመደብለት ይችላል።',
                  )}
                </p>
              </div>
            )}
          </div>
        </StageCard>
      ) : canAssignTrainer ? (
        <StageCard
          title={tBilingual('Schedule & Assign Session', 'ክፍለ-ጊዜውን ማቀድ እና አሰልጣኝ መመደብ')}
          icon={<CalendarClock className="h-4 w-4 text-indigo-600" />}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {tBilingual(
                'This session is not yet scheduled on the calendar. Schedule it and assign a trainer below:',
                'ይህ ክፍለ-ጊዜ ገና በቀን መቁጠሪያው ላይ አልታቀደም። ከዚህ በታች ያቅዱት እና አሰልጣኝ ይመድቡለት፦',
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tBilingual('Date & Time', 'ቀን እና ሰዓት')}
                </label>
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tBilingual('Duration (Minutes)', 'ቆይታ (ደቂቃ)')}
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {tBilingual('Assign Trainer (Optional)', 'አሰልጣኝ መድብ (አማራጭ)')}
              </label>
              <select
                value={selectedTrainerId}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="">{tBilingual('Select a trainer…', 'አሰልጣኝ ይምረጡ…')}</option>
                {(trainerOptions || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={!newDate || scheduling}
              onClick={() => void handleScheduleSession()}
            >
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {tBilingual('Schedule Session & Assign Trainer', 'ክፍለ-ጊዜውን አቅድና አሰልጣኝ መድብ')}
            </Button>
          </div>
        </StageCard>
      ) : null}

      <StageCard>
        <RichSection
          label={tBilingual('Description', 'ማብራሪያ')}
          html={plan.descriptionEn}
          missing={tBilingual('No description provided.', 'ማብራሪያ አልተሰጠም።')}
        />
        <RichSection
          label={tBilingual('Objectives', 'ዓላማዎች')}
          html={plan.objectivesEn}
          missing={tBilingual('No objectives specified.', 'ዓላማዎች አልተገለጹም።')}
        />
      </StageCard>

      {plan.quizzes.length === 0 ? (
        <StageCard title={tBilingual('Session quizzes', 'የክፍለ-ጊዜ ፈተናዎች')} icon={<FileQuestion className="h-4 w-4" />}>
          <p className="text-sm text-slate-500">{tBilingual('This session has no graded quiz.', 'ይህ ክፍለ-ጊዜ የሚታረም ፈተና የለውም።')}</p>
        </StageCard>
      ) : (
        plan.quizzes.map((q) => {
          const prepared = quizAssessments.find((a) => a.id === q.id);
          const questions = prepared?.questions ?? [];
          return (
            <StageCard key={q.id} title={q.titleEn} icon={<FileQuestion className="h-4 w-4" />}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 font-semibold text-indigo-700">
                  {q.weight}% {tBilingual('weight', 'ክብደት')}
                </span>
                <span
                  className={`rounded-md border px-1.5 font-semibold ${
                    policyPassMark !== null && q.passingScore < policyPassMark
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {tBilingual('pass', 'ማለፊያ')} {q.passingScore}%
                </span>
                {q.timeLimitMinutes ? <span className="text-slate-400">{q.timeLimitMinutes} min</span> : null}
                <span className="text-slate-400">
                  · {questions.length} {tBilingual(questions.length === 1 ? 'question' : 'questions', 'ጥያቄዎች')}
                </span>
              </div>
              {questions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {tBilingual(
                    'No questions prepared yet. The trainer adds them from the question bank in the session’s quiz tools.',
                    'ገና ጥያቄ አልተዘጋጀም። አሰልጣኙ ከጥያቄ ባንክ ይጨምራል።',
                  )}
                </p>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, i) => (
                    <AssessmentQuestionPreview key={question.id || i} question={question} index={i} isAmharic={isAmharic} />
                  ))}
                </div>
              )}
            </StageCard>
          );
        })
      )}

      <p className="text-[11px] text-slate-400">
        {tBilingual(
          'Each session quiz is graded when its session is marked completed; a learner who misses it scores 0. The certificate waits until every session has been held.',
          'እያንዳንዱ የክፍለ-ጊዜ ፈተና ክፍለ-ጊዜው ሲጠናቀቅ ይታረማል፤ ያመለጠው ሰልጣኝ 0 ያገኛል። ሰርተፊኬቱ ሁሉም ክፍለ-ጊዜዎች እስኪካሄዱ ይጠብቃል።',
        )}
      </p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{children}</dd>
    </div>
  );
}
