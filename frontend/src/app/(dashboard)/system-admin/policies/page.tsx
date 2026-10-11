'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Trash2,
  Unlock,
  Users,
  Video,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import PageShell from '@/components/shared/PageShell';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { type CourseProgressionMode, fetchCoursePolicy, updateCoursePolicy } from '@/lib/api/policy';
import { fetchSystemSettings, updateSystemSettings } from '@/lib/api/monitoring';
import { ApiError, api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/lib/i18n/useTranslation';

type PolicyTab = 'course' | 'live_sessions';

export default function PoliciesPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState<PolicyTab>('course');

  // Course policy states
  const [loadingCoursePolicy, setLoadingCoursePolicy] = useState(true);
  const [savingCoursePolicy, setSavingCoursePolicy] = useState(false);
  const [timeSpentPercent, setTimeSpentPercent] = useState(50);
  const [retakeCooldownMinutes, setRetakeCooldownMinutes] = useState(0);
  const [progressionMode, setProgressionMode] = useState<CourseProgressionMode>('LOCKED');
  const [passingScorePercent, setPassingScorePercent] = useState(50);
  const [coursePolicyUpdatedAt, setCoursePolicyUpdatedAt] = useState<string | null>(null);

  // Live session attendance policy states
  const [loadingLivePolicy, setLoadingLivePolicy] = useState(true);
  const [savingLivePolicy, setSavingLivePolicy] = useState(false);
  const [allowAllViewAttendance, setAllowAllViewAttendance] = useState(false);
  const [attendanceThreshold, setAttendanceThreshold] = useState('60');
  const [livePolicyUpdatedAt, setLivePolicyUpdatedAt] = useState<string | null>(null);
  const [rescheduleDayGap, setRescheduleDayGap] = useState('10');

  // Ethiopian Public Holidays state
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [seedingHolidays, setSeedingHolidays] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  // Load course policies
  const loadCoursePolicies = async () => {
    setLoadingCoursePolicy(true);
    try {
      const policy = await fetchCoursePolicy();
      setTimeSpentPercent(policy.timeSpentPercent);
      setRetakeCooldownMinutes(policy.retakeCooldownMinutes);
      setProgressionMode(policy.progressionMode ?? 'LOCKED');
      setPassingScorePercent(policy.passingScorePercent ?? 50);
      setCoursePolicyUpdatedAt(policy.updatedAt);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to load course policy settings.');
    } finally {
      setLoadingCoursePolicy(false);
    }
  };

  // Load live session policy
  const loadLivePolicies = async () => {
    setLoadingLivePolicy(true);
    try {
      const settings = await fetchSystemSettings();
      if (settings) {
        if (settings.allow_all_view_attendance !== undefined) {
          setAllowAllViewAttendance(settings.allow_all_view_attendance === 'true');
        }
        if (settings.default_attendance_threshold) {
          setAttendanceThreshold(settings.default_attendance_threshold);
        }
        if (settings.live_session_reschedule_day_gap) {
          setRescheduleDayGap(settings.live_session_reschedule_day_gap);
        }
        if (settings.updated_at) {
          setLivePolicyUpdatedAt(settings.updated_at);
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to load live session policy settings.',
      );
    } finally {
      setLoadingLivePolicy(false);
    }
  };

  const loadHolidays = async () => {
    setLoadingHolidays(true);
    try {
      const data = await api<any[]>('admin/public-holidays');
      setHolidays(Array.isArray(data) ? data : []);
    } catch {
      // best effort
    } finally {
      setLoadingHolidays(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeedingHolidays(true);
    try {
      await api('admin/public-holidays/seed-defaults', { method: 'POST' });
      toast.success(t('policiesPage.standardEthiopianHolidaysRegistered'));
      await loadHolidays();
    } catch {
      toast.error('Failed to register default holidays.');
    } finally {
      setSeedingHolidays(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast.warning(t('policiesPage.pleaseEnterHolidayNameAndDate'));
      return;
    }
    setAddingHoliday(true);
    try {
      await api('admin/public-holidays', {
        method: 'POST',
        body: { nameEn: newHolidayName.trim(), holidayDate: newHolidayDate, isActive: true },
      });
      toast.success(t('policiesPage.holidayAdded'));
      setNewHolidayName('');
      setNewHolidayDate('');
      await loadHolidays();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add holiday.');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await api(`admin/public-holidays/${id}`, { method: 'DELETE' });
      toast.success(t('policiesPage.holidayRemoved'));
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch {
      toast.error('Failed to remove holiday.');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'reschedule_gap' || tab === 'live_sessions') {
        setActiveTab('live_sessions');
      } else if (tab === 'course') {
        setActiveTab('course');
      }
    }
    void loadCoursePolicies();
    void loadLivePolicies();
    void loadHolidays();
  }, []);

  const switchTab = (tab: PolicyTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const saveCoursePolicy = async () => {
    setSavingCoursePolicy(true);
    try {
      const policy = await updateCoursePolicy({
        timeSpentPercent,
        retakeCooldownMinutes,
        progressionMode,
        passingScorePercent,
      });
      setTimeSpentPercent(policy.timeSpentPercent);
      setRetakeCooldownMinutes(policy.retakeCooldownMinutes);
      setProgressionMode(policy.progressionMode ?? 'LOCKED');
      setPassingScorePercent(policy.passingScorePercent ?? 50);
      setCoursePolicyUpdatedAt(policy.updatedAt);
      toast.success('Course completion policies saved successfully.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to save course policy settings.');
    } finally {
      setSavingCoursePolicy(false);
    }
  };

  const saveLivePolicy = async () => {
    setSavingLivePolicy(true);
    try {
      await updateSystemSettings({
        allow_all_view_attendance: String(allowAllViewAttendance),
        default_attendance_threshold: String(attendanceThreshold),
        live_session_reschedule_day_gap: String(rescheduleDayGap),
      });
      setLivePolicyUpdatedAt(new Date().toISOString());
      toast.success(t('policiesPage.liveSessionPolicySavedSuccessfully'));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to persist live session policy settings.',
      );
    } finally {
      setSavingLivePolicy(false);
    }
  };

  const toggleClass = (active: boolean) =>
    cn(
      'relative inline-flex h-6 w-11 items-center rounded-full shadow-inner transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/20',
      active
        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/30'
        : 'bg-input',
    );

  const numericThreshold = Math.min(100, Math.max(10, parseInt(attendanceThreshold, 10) || 60));

  return (
    <PageShell
      role={currentUser?.role ?? 'system_admin'}
      title={t('policiesPage.policies')}
      description={t('policiesPage.manageInstitutionalPoliciesIncludingCour')}
    >
      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => switchTab('course')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-xs cursor-pointer',
            activeTab === 'course'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'bg-card text-secondary-foreground hover:bg-secondary hover:text-foreground border border-border/80',
          )}
        >
          <Clock className="h-4 w-4" />
          <span>{t('policiesPage.courseCompletionPolicies')}</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('live_sessions')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-xs cursor-pointer',
            activeTab === 'live_sessions'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'bg-card text-secondary-foreground hover:bg-secondary hover:text-foreground border border-border/80',
          )}
        >
          <Video className="h-4 w-4" />
          <span>
            {t('policiesPage.liveSessionsAttendancePolicy')}
          </span>
        </button>
      </div>

      {/* TAB 1: Course Completion Policies */}
      {activeTab === 'course' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t('policiesPage.courseCompletionRetakeRules')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('policiesPage.appliedGloballyToModuleProgressCalculati')}
              </p>
            </div>
            <Button
              onClick={() => void saveCoursePolicy()}
              isLoading={savingCoursePolicy}
              loadingText={t('policiesPage.savingPolicies')}
              disabled={loadingCoursePolicy}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4" />
              {t('policiesPage.saveCoursePolicies')}
            </Button>
          </div>

          {loadingCoursePolicy ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <CardSkeleton count={3} />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Course Progress Policy (Progression Mode Accordion) */}
              <Card className="lg:col-span-2 border-primary/25 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{t('policiesPage.courseProgressPolicy')}</CardTitle>
                      <CardDescription>
                        {t('policiesPage.configureHowLearnersNavigateCourseModule')}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={progressionMode === 'OPEN' ? 'blue' : 'slate'}
                    className="text-xs uppercase tracking-wide px-3 py-1 font-semibold"
                  >
                    {progressionMode === 'OPEN'
                      ? t('policiesPage.openProgression')
                      : t('policiesPage.lockedProgression')}
                  </Badge>
                </div>

                {/* Two Accordion Options */}
                <div className="mt-6 space-y-3">
                  {/* Option 1: Locked Progression */}
                  <div
                    onClick={() => setProgressionMode('LOCKED')}
                    className={cn(
                      'rounded-xl border transition-all cursor-pointer overflow-hidden',
                      progressionMode === 'LOCKED'
                        ? 'border-primary bg-primary-soft/40 shadow-xs ring-1 ring-ring/20'
                        : 'border-border bg-card hover:border-input hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                            progressionMode === 'LOCKED'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          <Lock className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              {t('policiesPage.lockedProgressionSequential')}
                            </h4>
                            <Badge variant="slate" className="text-[10px] py-0 px-1.5">
                              {t('policiesPage.default')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('policiesPage.learnersMustCompleteModulesLessonsAnd')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="progressionMode"
                          checked={progressionMode === 'LOCKED'}
                          onChange={() => setProgressionMode('LOCKED')}
                          className="h-4 w-4 text-primary accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {progressionMode === 'LOCKED' && (
                      <div className="border-t border-primary/30 bg-primary-soft/60 px-4 py-3 text-xs text-secondary-foreground space-y-1.5">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span>
                            {t('policiesPage.aModuleOrLessonUnlocksOnly')}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span>
                            {t('policiesPage.bestSuitedForStepByStep')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Open Progression */}
                  <div
                    onClick={() => setProgressionMode('OPEN')}
                    className={cn(
                      'rounded-xl border transition-all cursor-pointer overflow-hidden',
                      progressionMode === 'OPEN'
                        ? 'border-primary bg-primary-soft/40 shadow-xs ring-1 ring-ring/20'
                        : 'border-border bg-card hover:border-input hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                            progressionMode === 'OPEN'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          <Unlock className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              {t('policiesPage.openProgressionFlexibleSelfPaced')}
                            </h4>
                            <Badge variant="blue" className="text-[10px] py-0 px-1.5">
                              {t('policiesPage.flexible')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('policiesPage.allModulesLessonsAndQuizzesAre')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="progressionMode"
                          checked={progressionMode === 'OPEN'}
                          onChange={() => setProgressionMode('OPEN')}
                          className="h-4 w-4 text-primary accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {progressionMode === 'OPEN' && (
                      <div className="border-t border-primary/30 bg-primary-soft/60 px-4 py-3 text-xs text-secondary-foreground space-y-1.5">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span>
                            {t('policiesPage.learnersCanExploreAnyTopicAnd')}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                          <span>
                            {t('policiesPage.theFinalAssessmentAndCertificateRemain')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{t('policiesPage.timeSpentRequirement')}</CardTitle>
                    <CardDescription>
                      {t('policiesPage.learnersMustSpendAtLeastThis')}
                    </CardDescription>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-secondary-foreground">
                    <span>{t('policiesPage.requiredTimeSpent')}</span>
                    <span className="text-primary font-bold">{timeSpentPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={timeSpentPercent}
                    onChange={(e) => setTimeSpentPercent(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={timeSpentPercent}
                      onChange={(e) =>
                        setTimeSpentPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="w-24 rounded-lg border border-border px-3 py-1.5 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-4 focus:ring-ring/10"
                    />
                    <span className="text-xs text-subtle-foreground">
                      {t('policiesPage.eGA20MinuteLesson', { value: Math.ceil(20 * 60 * (timeSpentPercent / 100)) })}
                    </span>
                  </div>
                  {timeSpentPercent === 0 ? (
                    <p className="flex items-center gap-1.5 text-xs text-warning">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {t('policiesPage.n0DisablesTheTimeRequirementEntirely')}
                    </p>
                  ) : null}
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>
                      {t('policiesPage.assessmentRetakeCooldown')}
                    </CardTitle>
                    <CardDescription>
                      {t('policiesPage.onceALearnerExhaustsEveryAttempt')}
                    </CardDescription>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-subtle-foreground" />
                    <input
                      type="number"
                      min={0}
                      value={retakeCooldownMinutes}
                      onChange={(e) =>
                        setRetakeCooldownMinutes(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-28 rounded-lg border border-border px-3 py-1.5 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-4 focus:ring-ring/10"
                    />
                    <span className="text-sm text-secondary-foreground font-medium">
                      {t('policiesPage.minutes')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {retakeCooldownMinutes === 0
                      ? t('policiesPage.retakesAreDisabledMaxAttemptsReached')
                      : t('policiesPage.aLearnerWhoExhaustsTheirAttempts', { retakeCooldownMinutes })}
                  </p>
                </div>
              </Card>

              {/* Card 4: Global Assessment & Certification Pass Mark */}
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>
                        {t('policiesPage.globalAssessmentCertificationPassMark')}
                      </CardTitle>
                      <Badge variant="green" className="text-[10px] py-0 px-1.5 font-bold">
                        {t('policiesPage.dualThreshold')}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {t('policiesPage.theGlobalMinimumScoreRequiredTo')}
                    </CardDescription>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-secondary-foreground">
                    <span>{t('policiesPage.passingThreshold')}</span>
                    <span className="text-success font-bold text-base">{passingScorePercent}%</span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={passingScorePercent}
                    onChange={(e) => setPassingScorePercent(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={passingScorePercent}
                      onChange={(e) =>
                        setPassingScorePercent(
                          Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 50)),
                        )
                      }
                      className="w-24 rounded-lg border border-border px-3 py-1.5 text-sm shadow-sm focus:border-success/60 focus:outline-none focus:ring-4 focus:ring-success/10 font-semibold text-foreground"
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('policiesPage.selectPresetStandard')}
                    </span>
                    {[
                      { label: '50% (Standard)', value: 50 },
                      { label: '60%', value: 60 },
                      { label: '70% (Competency)', value: 70 },
                      { label: '75%', value: 75 },
                      { label: '80% (Mastery)', value: 80 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setPassingScorePercent(preset.value)}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shadow-xs border',
                          passingScorePercent === preset.value
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-muted text-secondary-foreground border-border hover:bg-secondary',
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-success/30 bg-success-soft/50 p-3.5 text-xs text-secondary-foreground space-y-1.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>
                        <strong>{t('policiesPage.perAssessmentGate')}</strong>{' '}
                        {t('policiesPage.learnersMustScoreAtLeastOn', { passingScorePercent })}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>
                        <strong>{t('policiesPage.certificationGate')}</strong>{' '}
                        {t('policiesPage.totalCourseGradeSumOfWeighted', { passingScorePercent })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="flex items-center gap-3">
            {coursePolicyUpdatedAt ? (
              <p className="text-xs text-subtle-foreground">
                Last updated {new Date(coursePolicyUpdatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 2: Live Sessions & Attendance Policy */}
      {activeTab === 'live_sessions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t('policiesPage.liveSessionsAttendancePolicy')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('policiesPage.definePlatformWideAttendanceVisibilityFo')}
              </p>
            </div>
            <Button
              onClick={() => void saveLivePolicy()}
              isLoading={savingLivePolicy}
              loadingText={t('policiesPage.savingPolicy')}
              disabled={loadingLivePolicy}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4" />
              {t('policiesPage.saveLiveSessionPolicy')}
            </Button>
          </div>

          {loadingLivePolicy ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton count={2} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
              {/* Card 1: Attendance Visibility */}
              <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-6 shadow-soft ring-super-soft">
                <div className="flex items-start gap-3 border-b border-border/60 pb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">
                        {t('policiesPage.permitAllActorsToViewSession')}
                      </h3>
                      <Badge variant={allowAllViewAttendance ? 'green' : 'slate'}>
                        {allowAllViewAttendance
                          ? t('policiesPage.permittedToAll')
                          : t('policiesPage.restrictedToStaff')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('policiesPage.determineWhetherLearnersAndNonStaff')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-muted p-4 border border-border/60">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-foreground">
                        {allowAllViewAttendance
                          ? t('policiesPage.publicDynamicAttendanceLog')
                          : t('policiesPage.restrictedStaffAttendanceLog')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {allowAllViewAttendance
                          ? t('policiesPage.allParticipantsIncludingEnrolledLearners')
                          : t('policiesPage.onlyTrainersCourseOwnersTrainingAdminist')}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowAllViewAttendance}
                      onClick={() => setAllowAllViewAttendance(!allowAllViewAttendance)}
                      className={toggleClass(allowAllViewAttendance)}
                    >
                      <span
                        className={cn(
                          'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-xs',
                          allowAllViewAttendance ? 'translate-x-5' : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>

                  <div className="rounded-xl border border-primary/30 bg-primary-soft/50 p-3.5 text-xs text-primary flex items-start gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>
                      {t('policiesPage.individualSessionCreatorsCanStillToggle')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Stay Threshold */}
              <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft">
                <div className="flex items-start gap-3 border-b border-border/60 pb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">
                      {t('policiesPage.minimumActiveStayThresholdForPresent')}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('policiesPage.requiredPercentageOfTotalSessionDuration')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-secondary-foreground">
                      <span>{t('policiesPage.thresholdPercentage')}</span>
                      <span className="text-success font-bold text-base">
                        {numericThreshold}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={numericThreshold}
                      onChange={(e) => setAttendanceThreshold(e.target.value)}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />

                    <div className="flex items-center gap-3 pt-2">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={10}
                          max={100}
                          value={attendanceThreshold}
                          onChange={(e) => setAttendanceThreshold(e.target.value)}
                          className="w-24 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-4 focus:ring-ring/10"
                        />
                        <span className="absolute right-3 text-sm text-subtle-foreground font-semibold">
                          %
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t('policiesPage.minimum10Maximum100Recommended60')}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic calculation preview */}
                  <div className="rounded-xl border border-border/80 bg-muted/70 p-4 space-y-2">
                    <p className="text-xs font-semibold text-secondary-foreground">
                      {t('policiesPage.qualificationPreview')}
                    </p>
                    <ul className="text-xs text-secondary-foreground space-y-1.5 list-disc list-inside">
                      <li>
                        {t('policiesPage.forA60MinuteSessionLearner')}{' '}
                        <span className="font-semibold text-success">
                          {Math.round(60 * (numericThreshold / 100))}{' '}
                          {t('policiesPage.minutes')}
                        </span>{' '}
                        {t('policiesPage.toBeMarkedPresent')}
                      </li>
                      <li>
                        {t('policiesPage.learnersWithLessThanActiveStay', { numericThreshold })}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Rolling Rescheduler & Day Gap Policy */}
            <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-card p-6 shadow-soft ring-super-soft">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border/60 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">
                        {t('policiesPage.institutionalDayGapBetweenCycles')}
                      </h3>
                      <Badge variant="indigo" className="text-[10px] py-0 px-2 font-bold">
                        {t('policiesPage.rollingCycleEngine')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                      {t('policiesPage.whenALiveSessionCompletesThe')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* Day Gap Controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-secondary-foreground">
                    <span>{t('policiesPage.policyDayGapBetweenCycles')}</span>
                    <span className="text-accent font-bold text-base">
                      {rescheduleDayGap} {t('policiesPage.days')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[7, 10, 14, 21, 30].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRescheduleDayGap(String(preset))}
                        className={cn(
                          'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border cursor-pointer',
                          rescheduleDayGap === String(preset)
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                            : 'bg-muted text-secondary-foreground border-border hover:bg-secondary hover:text-foreground',
                        )}
                      >
                        {preset} {t('policiesPage.days')}
                        {preset === 10 && ` (${t('policiesPage.default')})`}
                      </button>
                    ))}

                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-muted-foreground">
                        {t('policiesPage.custom')}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={rescheduleDayGap}
                        onChange={(e) => setRescheduleDayGap(e.target.value)}
                        className="w-24 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                      />
                      <span className="text-xs text-subtle-foreground">
                        {t('policiesPage.days2')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Concrete Example Box */}
                <div className="rounded-xl border border-accent/30 bg-accent-soft/50 p-4 space-y-2">
                  <p className="text-xs font-bold text-accent">
                    {t('policiesPage.rollingCycleRuleExample')}
                  </p>
                  <p className="text-xs text-accent leading-relaxed">
                    {t('policiesPage.ifACourseHas3Sessions', { rescheduleDayGap })}
                  </p>
                </div>

                {/* Institutional Working Calendar Highlights */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/80 bg-muted/80 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <CalendarCheck className="h-4 w-4 text-success" />
                      <span>{t('policiesPage.mondaySaturdayActive')}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                      {t('policiesPage.standardEthiopianPublicSectorRevenueAcad')}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/80 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <ShieldAlert className="h-4 w-4 text-warning" />
                      <span>{t('policiesPage.sundaysStrictlySkipped')}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                      {t('policiesPage.ifAComputedDateLandsOn')}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/80 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <Award className="h-4 w-4 text-primary" />
                      <span>{t('policiesPage.statutoryHolidaysSkipped')}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                      {t('policiesPage.nationalHolidaysRegisteredInTheTable')}
                    </p>
                  </div>
                </div>

                {/* Public Holidays Collapsible Management */}
                <div className="border-t border-border/80 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {t('policiesPage.ethiopianStatutoryPublicHolidays')}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {t('policiesPage.registeredHolidaySCurrentlyActiveIn', { count: holidays.length })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSeedDefaults()}
                        isLoading={seedingHolidays}
                        loadingText={t('policiesPage.seeding')}
                        className="text-xs text-accent border-accent/30 hover:bg-accent-soft cursor-pointer"
                      >
                        {t('policiesPage.seedStandardHolidays')}
                      </Button>

                      <button
                        type="button"
                        onClick={() => setShowHolidays(!showHolidays)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        {showHolidays
                          ? t('policiesPage.hideTable')
                          : t('policiesPage.manageHolidays')}
                        {showHolidays ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {showHolidays && (
                    <div className="mt-4 space-y-4 rounded-xl border border-border bg-muted/50 p-4">
                      {/* Add Holiday Form */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
                        <input
                          type="text"
                          placeholder={t('policiesPage.holidayNameEGAdwaVictory')}
                          value={newHolidayName}
                          onChange={(e) => setNewHolidayName(e.target.value)}
                          className="flex-1 min-w-[200px] rounded-lg border border-border bg-card px-3 py-1.5 text-xs shadow-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                        />
                        <input
                          type="date"
                          value={newHolidayDate}
                          onChange={(e) => setNewHolidayDate(e.target.value)}
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs shadow-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleAddHoliday()}
                          isLoading={addingHoliday}
                          disabled={!newHolidayName.trim() || !newHolidayDate}
                          className="gap-1 bg-violet-600 hover:bg-violet-700 text-white text-xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t('policiesPage.addHoliday')}
                        </Button>
                      </div>

                      {/* Holiday List Table */}
                      {loadingHolidays ? (
                        <p className="text-xs text-subtle-foreground py-2">
                          {t('policiesPage.loadingPublicHolidays')}
                        </p>
                      ) : holidays.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          <p>{t('policiesPage.noPublicHolidaysRegisteredYet')}</p>
                          <p className="mt-1 text-[11px] text-subtle-foreground">
                            {t('policiesPage.clickSeedStandardHolidaysAboveTo')}
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-card">
                          <table className="w-full text-left text-xs">
                              <thead className="border-b border-border bg-secondary/70 text-secondary-foreground font-semibold sticky top-0">
                                <tr>
                                  <th className="px-3 py-2">{t('policiesPage.holidayName')}</th>
                                  <th className="px-3 py-2">{t('policiesPage.date')}</th>
                                  <th className="px-3 py-2 text-right">{t('policiesPage.actions')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {holidays.map((h) => {
                                  const dateStr = new Date(h.holidayDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    weekday: 'short',
                                  });
                                  return (
                                    <tr key={h.id} className="hover:bg-muted/80">
                                      <td className="px-3 py-2 font-medium text-foreground">
                                        {h.nameEn}
                                        {h.nameAm && <span className="ml-2 text-subtle-foreground">({h.nameAm})</span>}
                                      </td>
                                      <td className="px-3 py-2 text-secondary-foreground">{dateStr}</td>
                                      <td className="px-3 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteHoliday(h.id)}
                                          className="text-red-500 hover:text-danger p-1 rounded-md hover:bg-danger-soft transition-colors cursor-pointer"
                                          title={t('policiesPage.deleteHoliday')}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

          <div className="flex items-center gap-3">
            {livePolicyUpdatedAt ? (
              <p className="text-xs text-subtle-foreground">
                Last updated {new Date(livePolicyUpdatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
