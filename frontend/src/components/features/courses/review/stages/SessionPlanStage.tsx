'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Check,
  FileQuestion,
  Info,
  RefreshCw,
  UserCheck,
  UserX,
  Video,
} from 'lucide-react';
import { formatSessionDateTime } from '@/lib/app-time';
import { StartsInBadge } from '@/components/features/sessions/shared/StartsInBadge';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useUserName } from '@/lib/stores/user-store';
import { usePermissions } from '@/lib/usePermissions';
import { usePolicyPassMark } from '@/lib/api/usePolicyPassMark';
import { assignSessionPlanTrainer } from '@/lib/api/session-plans';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { SearchableTrainerSelect } from '@/components/features/sessions/shared/SearchableTrainerSelect';
import type { ApiAssessment, ApiUser } from '@/lib/api/types';
import type { CourseStatus, SessionPlan, User } from '@/types';
import { AssessmentQuestionPreview } from '../../detail/AssessmentQuestionPreview';
import { sessionPlanTrainerId } from '../nodes';
import { RichSection, StageCard, StageTitle } from './StageParts';

const PLATFORM_LABEL: Record<string, string> = {
  LIVEKIT: 'Virtual classroom',
  ZOOM: 'Zoom',
  GOOGLE_MEET: 'Google Meet',
  MS_TEAMS: 'Microsoft Teams',
  CUSTOM: 'Online meeting',
};

/** While a plan waits to be scheduled elsewhere, the page re-checks this often. */
const WAITING_REFRESH_MS = 30_000;

interface SessionPlanStageProps {
  plan: SessionPlan;
  index: number;
  courseStatus: CourseStatus;
  /** The session's weighted quizzes with their prepared questions and answers. */
  quizAssessments: ApiAssessment[];
  courseId?: string;
  canAssignTrainer?: boolean;
  trainerOptions?: User[];
  /** Trainers already on the course; the picker lists them first. */
  courseTrainerIds?: string[];
  /** Reloads the course, e.g. after a trainer change or when the session may have been scheduled. */
  onRefresh?: () => void;
}

/**
 * A planned online session as an approver or publisher sees it. Getting it ready takes two
 * steps: assign its trainer here, then schedule it on the Session Scheduling page. The steps
 * update on their own once the session is scheduled there.
 */
export function SessionPlanStage({
  plan,
  index,
  courseStatus,
  quizAssessments,
  courseId,
  canAssignTrainer,
  trainerOptions = [],
  courseTrainerIds = [],
  onRefresh,
}: SessionPlanStageProps) {
  const { isAmharic, t } = useTranslation('courses');
  const userName = useUserName();
  const { can } = usePermissions();
  const policyPassMark = usePolicyPassMark();
  const weight = plan.quizzes.reduce((sum, q) => sum + (q.weight || 0), 0);
  const scheduled = plan.liveSession;
  const trainerId = sessionPlanTrainerId(plan);
  const afterApproval = courseStatus === 'approved' || courseStatus === 'published';
  const schedulingHref = can('live_session.manage_all') ? '/training-admin/sessions' : '/trainer/sessions';
  const waitingForSchedule = afterApproval && Boolean(trainerId) && !scheduled;

  const [selectedTrainerId, setSelectedTrainerId] = useState(trainerId ?? '');
  const [busy, setBusy] = useState(false);
  /** Set right after a trainer is assigned here, to highlight the next step. */
  const [justAssigned, setJustAssigned] = useState(false);

  useEffect(() => {
    setSelectedTrainerId(trainerId ?? '');
  }, [trainerId]);

  // The session is scheduled on another page: re-check when the user comes back, and now and then.
  useEffect(() => {
    if (!waitingForSchedule || !onRefresh) return;
    const onVisible = () => document.visibilityState === 'visible' && onRefresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const timer = window.setInterval(onVisible, WAITING_REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(timer);
    };
  }, [waitingForSchedule, onRefresh]);

  // The picker works on API users; the course store keeps the same people as `User`.
  const pickerTrainers = useMemo(
    () => trainerOptions.map((t) => ({ id: t.id, email: t.email, firstName: t.firstName || t.name, lastName: t.lastName || '' }) as ApiUser),
    [trainerOptions],
  );
  const pickerCourseTrainers = useMemo(() => pickerTrainers.filter((t) => courseTrainerIds.includes(t.id)), [pickerTrainers, courseTrainerIds]);

  const saveTrainer = async (next: string | null) => {
    if (!courseId) return;
    setBusy(true);
    try {
      await assignSessionPlanTrainer(courseId, plan.id, next);
      if (next) {
        toast.success(t('sessionPlanStage.trainerAssignedToThisSession'));
        setJustAssigned(true);
      } else {
        toast.success(t('sessionPlanStage.trainerRemovedFromThisSession'));
        setJustAssigned(false);
      }
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || t('sessionPlanStage.failedToUpdateTheSessionTrainer'));
    } finally {
      setBusy(false);
    }
  };

  // Same checks as the backend publish guard (CoursesService.assertSessionsReadyToPublish).
  const publishBlockers: string[] = [];
  if (afterApproval && !trainerId) publishBlockers.push(t('sessionPlanStage.noTrainerIsAssignedToThis'));
  if (afterApproval && !scheduled) publishBlockers.push(t('sessionPlanStage.thisSessionIsNotScheduledYet'));
  for (const q of plan.quizzes) {
    const prepared = quizAssessments.find((a) => a.id === q.id);
    const questions = prepared?.questions ?? [];
    if (afterApproval && questions.length === 0) {
      publishBlockers.push(t('sessionPlanStage.hasNoQuestionsYet', { titleEn: q.titleEn }));
    } else if (afterApproval) {
      // One point per percent of course weight, so a 10% quiz totals 10 points.
      const points = questions.reduce((sum, question) => sum + (question.points ?? 0), 0);
      if (points !== q.weight) {
        publishBlockers.push(
          t('sessionPlanStage.hasOfPointsAssigned', { titleEn: q.titleEn, points, weight: q.weight }),
        );
      }
    }
  }

  const formatDate = (iso: string) => formatSessionDateTime(iso, isAmharic ? 'am-ET' : undefined);
  const doneSteps = (trainerId ? 1 : 0) + (scheduled ? 1 : 0);
  const stepLabels = { done: t('sessionPlanStage.done'), next: t('courseReviewShell.next'), pending: t('sessionPlanStage.pending') };

  return (
    <div className="space-y-6">
      <StageTitle
        icon={<Video className="h-4 w-4" />}
        eyebrow={`${t('reviewSubmitStage.onlineSession')} ${index + 1}`}
        title={plan.titleEn || t('creatorSidebar.untitledSession')}
        meta={
          <>
            <StatusPill done={Boolean(trainerId)} icon={trainerId ? UserCheck : UserX}>
              {trainerId ? userName(trainerId) : t('sessionPlanStage.noTrainerYet')}
            </StatusPill>
            <StatusPill done={Boolean(scheduled)} icon={scheduled ? CalendarCheck : CalendarClock}>
              {scheduled ? formatDate(scheduled.scheduledAt) : t('sessionPlanStage.notScheduledYet')}
            </StatusPill>
            <span>
              {plan.quizzes.length} {t(plan.quizzes.length === 1 ? 'sessionPlanStage.quizUnit' : 'sessionPlanStage.quizzesUnit')} · {weight}%{' '}
              {t('sessionPlanStage.ofTheCourseGrade')}
            </span>
          </>
        }
      />

      {/* Readiness steps: 1. assign trainer (here) → 2. schedule (Session Scheduling page) */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-white px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">{t('sessionPlanStage.getThisSessionReady')}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {doneSteps === 2
                ? t('sessionPlanStage.allSetThisSessionIsReady')
                : t('sessionPlanStage.twoStepsBeforeThisSessionCan')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${doneSteps * 50}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-600">{doneSteps}/2</span>
          </div>
        </div>

        <ol className="grid gap-px bg-slate-100 sm:grid-cols-2">
          <Step
            number={1}
            done={Boolean(trainerId)}
            active={!trainerId}
            labels={stepLabels}
            title={t('sessionPlanStage.assignATrainer')}
            description={
              trainerId
                ? t('sessionPlanStage.willHostThisSession', { value: userName(trainerId) })
                : t('sessionPlanStage.chooseWhoWillHostThisSession')
            }
          />
          <Step
            number={2}
            done={Boolean(scheduled)}
            active={Boolean(trainerId) && !scheduled}
            labels={stepLabels}
            title={t('sessionPlanStage.scheduleTheSession')}
            description={
              scheduled
                ? t('sessionPlanStage.scheduledFor', { value: formatDate(scheduled.scheduledAt) })
                : t('sessionPlanStage.pickTheDateAndTimeOn')
            }
            action={
              !scheduled && afterApproval ? (
                <Link
                  href={schedulingHref}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
                >
                  {t('sessionPlanStage.openSessionScheduling')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null
            }
          />
        </ol>
      </section>

      {publishBlockers.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-rose-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t(publishBlockers.length === 1 ? 'sessionPlanStage.blocksPublishingOne' : 'sessionPlanStage.blocksPublishingOther', {
              count: publishBlockers.length,
            })}
          </p>
          <ul className="space-y-1 text-xs text-rose-800">
            {publishBlockers.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next step after a trainer is assigned: scheduling happens on the Session Scheduling page. */}
      {waitingForSchedule && (
        <div
          className={cn(
            'flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between',
            justAssigned ? 'border-indigo-300 bg-indigo-50 ring-4 ring-indigo-500/10' : 'border-indigo-200 bg-indigo-50/60',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-950">
                {justAssigned
                  ? t('sessionPlanStage.trainerAssignedNextScheduleTheSession')
                  : t('sessionPlanStage.nextScheduleTheSession')}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-indigo-900/80">
                {t('sessionPlanStage.goToTheSessionSchedulingPage')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                {t('sessionPlanStage.checkNow')}
              </Button>
            )}
            <Link
              href={schedulingHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              {t('sessionPlanStage.goToSessionScheduling')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Step 1: trainer assignment. Scheduling itself happens on the Session Scheduling page. */}
      <StageCard title={t('sessionPlanStage.step1SessionTrainer')} icon={<UserCheck className="h-4 w-4" />}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold',
                trainerId ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400',
              )}
            >
              {trainerId ? initials(userName(trainerId)) : <UserX className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{t('sessionPlanStage.trainerForThisSession')}</p>
              <p className="text-sm font-bold text-slate-800">
                {trainerId ? userName(trainerId) : t('sessionPlanStage.noTrainerAssignedYet')}
              </p>
            </div>
          </div>
          {trainerId && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              {t('sessionPlanStage.assigned')}
            </span>
          )}
        </div>

        {canAssignTrainer ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {trainerId ? t('sessionPlanStage.changeTrainer') : t('sessionPlanStage.assignATrainer2')}
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex-1">
                <SearchableTrainerSelect
                  trainers={pickerTrainers}
                  courseTrainers={pickerCourseTrainers}
                  value={selectedTrainerId}
                  onChange={setSelectedTrainerId}
                  disabled={busy}
                />
              </div>
              <div className="flex items-center gap-2 sm:pt-1">
                <Button
                  size="sm"
                  isLoading={busy}
                  disabled={!selectedTrainerId || selectedTrainerId === trainerId}
                  onClick={() => void saveTrainer(selectedTrainerId)}
                  className="whitespace-nowrap"
                >
                  {trainerId ? t('sessionPlanStage.changeTrainer') : t('sessionPlanStage.assignTrainer')}
                </Button>
                {trainerId && (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void saveTrainer(null)} className="whitespace-nowrap text-rose-600 hover:text-rose-700">
                    {t('sessionPlanStage.remove')}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {t('sessionPlanStage.searchByNameOrEmailEach')}
            </p>
          </div>
        ) : (
          !trainerId && (
            <p className="text-xs text-slate-500">
              {t('sessionPlanStage.aTrainingAdministratorAssignsTheTrainer')}
            </p>
          )
        )}
      </StageCard>

      {scheduled && (
        <StageCard title={t('sessionPlanStage.step2ScheduledSession')} icon={<CalendarCheck className="h-4 w-4" />}>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Detail label={t('sessionPlanStage.dateTime')}>
              {formatDate(scheduled.scheduledAt)}
              <StartsInBadge seconds={scheduled.startsInSeconds} className="mt-1" />
            </Detail>
            <Detail label={t('sessionPlanStage.duration')}>{scheduled.durationMinutes ? `${scheduled.durationMinutes} min` : '—'}</Detail>
            <Detail label={t('sessionPlanStage.platform')}>{scheduled.platform ? (PLATFORM_LABEL[scheduled.platform] ?? scheduled.platform) : '—'}</Detail>
            <Detail label={t('sessionPlanStage.status')}>{scheduled.status}</Detail>
          </dl>
          <p className="text-[11px] text-slate-400">
            {t('sessionPlanStage.changeTheDateOrTimeOn')}{' '}
            <Link href={schedulingHref} className="font-semibold text-indigo-600 hover:text-indigo-800">
              {t('mediaPreview.open')}
            </Link>
          </p>
        </StageCard>
      )}

      <StageCard>
        <RichSection label={t('moduleStage.description')} html={plan.descriptionEn} missing={t('moduleStage.noDescriptionProvided')} />
        <RichSection label={t('sessionPlanStage.objectives')} html={plan.objectivesEn} missing={t('moduleStage.noObjectivesSpecified')} />
      </StageCard>

      {plan.quizzes.length === 0 ? (
        <StageCard title={t('sessionPlanStage.sessionQuizzes')} icon={<FileQuestion className="h-4 w-4" />}>
          <p className="text-sm text-slate-500">{t('sessionPlanStage.thisSessionHasNoGradedQuiz')}</p>
        </StageCard>
      ) : (
        plan.quizzes.map((q) => {
          const prepared = quizAssessments.find((a) => a.id === q.id);
          const questions = prepared?.questions ?? [];
          return (
            <StageCard key={q.id} title={q.titleEn} icon={<FileQuestion className="h-4 w-4" />}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 font-semibold text-indigo-700">
                  {q.weight}% {t('lessonEditorStage.weight')}
                </span>
                <span
                  className={`rounded-md border px-1.5 font-semibold ${
                    policyPassMark !== null && q.passingScore < policyPassMark
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {t('reviewSubmitStage.pass')} {q.passingScore}%
                </span>
                {q.timeLimitMinutes ? <span className="text-slate-400">{q.timeLimitMinutes} min</span> : null}
                <span className="text-slate-400">
                  · {questions.length} {t(questions.length === 1 ? 'sessionPlanStage.questionUnit' : 'sessionPlanStage.questionsUnit')}
                </span>
              </div>
              {questions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t('sessionPlanStage.noQuestionsPreparedYetTheTrainer')}
                </p>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, i) => (
                    <AssessmentQuestionPreview key={question.id || i} question={question} index={i} />
                  ))}
                </div>
              )}
            </StageCard>
          );
        })
      )}

      <p className="text-[11px] text-slate-400">
        {t('sessionPlanStage.eachSessionQuizIsGradedWhen')}
      </p>
    </div>
  );
}

function Step({
  number,
  done,
  active,
  title,
  description,
  action,
  labels,
}: {
  number: number;
  done: boolean;
  active: boolean;
  labels: { done: string; next: string; pending: string };
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <li className={cn('flex gap-3 bg-white p-5 transition-colors', active && 'bg-indigo-50/40')}>
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all',
          done && 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30',
          !done && active && 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 ring-4 ring-indigo-500/15',
          !done && !active && 'border-2 border-slate-200 bg-white text-slate-400',
        )}
      >
        {done ? <Check className="h-4 w-4" /> : number}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-bold', done || active ? 'text-slate-900' : 'text-slate-500')}>{title}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              done ? 'bg-emerald-50 text-emerald-700' : active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500',
            )}
          >
            {done ? labels.done : active ? labels.next : labels.pending}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">{description}</p>
        {action}
      </div>
    </li>
  );
}

function StatusPill({ done, icon: Icon, children }: { done: boolean; icon: typeof Check; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold',
        done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
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

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'T'
  );
}
