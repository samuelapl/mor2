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
import { useLms } from '@/lib/lms-store';
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
  const { currentUser } = useLms();
  const { tBilingual } = useTranslation();
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
      toast.success(tBilingual('Standard Ethiopian holidays registered.', 'የኢትዮጵያ መደበኛ በዓላት ተመዝግበዋል።'));
      await loadHolidays();
    } catch {
      toast.error('Failed to register default holidays.');
    } finally {
      setSeedingHolidays(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast.warning(tBilingual('Please enter holiday name and date.', 'እባክዎ የበዓሉን ስም እና ቀን ያስገቡ።'));
      return;
    }
    setAddingHoliday(true);
    try {
      await api('admin/public-holidays', {
        method: 'POST',
        body: { nameEn: newHolidayName.trim(), holidayDate: newHolidayDate, isActive: true },
      });
      toast.success(tBilingual('Holiday added.', 'በዓል ተመዝግቧል።'));
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
      toast.success(tBilingual('Holiday removed.', 'በዓል ተሰርዟል።'));
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
      toast.success(tBilingual('Live session policy saved successfully.', 'የቀጥታ ክፍለ-ጊዜ ፖሊሲ በተሳካ ሁኔታ ተቀምጧል።'));
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
      'relative inline-flex h-6 w-11 items-center rounded-full shadow-inner transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
      active
        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/30'
        : 'bg-slate-300',
    );

  const numericThreshold = Math.min(100, Math.max(10, parseInt(attendanceThreshold, 10) || 60));

  return (
    <PageShell
      role={currentUser?.role ?? 'system_admin'}
      title={tBilingual('Policies', 'መመሪያዎችና ፖሊሲዎች')}
      description={tBilingual(
        'Manage institutional policies including course completion requirements, retake rules, and live session attendance governance.',
        'የኮርስ ማጠናቀቂያ መስፈርቶችን፣ የድጋሚ ፈተና ደንቦችን እና የቀጥታ ክፍለ-ጊዜ ክትትል አስተዳደርን ጨምሮ ተቋማዊ ፖሊሲዎችን ያስተዳድሩ።',
      )}
    >
      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => switchTab('course')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-xs cursor-pointer',
            activeTab === 'course'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80',
          )}
        >
          <Clock className="h-4 w-4" />
          <span>{tBilingual('Course Completion Policies', 'የኮርስ ማጠናቀቂያ ፖሊሲዎች')}</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('live_sessions')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-xs cursor-pointer',
            activeTab === 'live_sessions'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80',
          )}
        >
          <Video className="h-4 w-4" />
          <span>
            {tBilingual('Live Sessions & Attendance Policy', 'የቀጥታ ክፍለ-ጊዜዎች እና የክትትል ፖሊሲ')}
          </span>
        </button>
      </div>

      {/* TAB 1: Course Completion Policies */}
      {activeTab === 'course' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {tBilingual('Course Completion & Retake Rules', 'የኮርስ ማጠናቀቂያ እና የድጋሚ ፈተና ደንቦች')}
              </h2>
              <p className="text-xs text-slate-500">
                {tBilingual(
                  'Applied globally to module progress calculations and assessment lockout policies.',
                  'በሞጁል እድገት ስሌቶች እና የምዘና መቆለፊያ ፖሊሲዎች ላይ በአጠቃላይ ተፈጻሚ ይሆናል።',
                )}
              </p>
            </div>
            <Button
              onClick={() => void saveCoursePolicy()}
              isLoading={savingCoursePolicy}
              loadingText={tBilingual('Saving Policies…', 'ፖሊሲዎችን በማስቀመጥ ላይ…')}
              disabled={loadingCoursePolicy}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4" />
              {tBilingual('Save Course Policies', 'የኮርስ ፖሊሲዎችን አስቀምጥ')}
            </Button>
          </div>

          {loadingCoursePolicy ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <CardSkeleton count={3} />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Course Progress Policy (Progression Mode Accordion) */}
              <Card className="lg:col-span-2 border-indigo-100/80 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{tBilingual('Course Progress Policy', 'የኮርስ እድገት ፖሊሲ')}</CardTitle>
                      <CardDescription>
                        {tBilingual(
                          'Configure how learners navigate course modules and lessons. In Open Progression, lessons and quizzes are open immediately, but the Final Assessment and Certificate remain strictly gated until 100% completion.',
                          'ተማሪዎች የኮርስ ሞጁሎችን እና ትምህርቶችን እንዴት እንደሚያልፉ ይወስኑ። በክፍት እድገት ውስጥ ትምህርቶች እና ጥያቄዎች ክፍት ናቸው፣ ነገር ግን የመጨረሻው ፈተና እና ሰርተፍኬት ሙሉ በሙሉ እስኪጠናቀቅ ድረስ ተቆልፈው ይቆያሉ።',
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={progressionMode === 'OPEN' ? 'blue' : 'slate'}
                    className="text-xs uppercase tracking-wide px-3 py-1 font-semibold"
                  >
                    {progressionMode === 'OPEN'
                      ? tBilingual('Open Progression', 'ክፍት እድገት')
                      : tBilingual('Locked Progression', 'የተቆለፈ እድገት')}
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
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                    )}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                            progressionMode === 'LOCKED'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <Lock className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">
                              {tBilingual(
                                'Locked Progression (Sequential)',
                                'የተቆለፈ የትምህርት ቅደም ተከተል (ቅደም-ተከተላዊ)',
                              )}
                            </h4>
                            <Badge variant="slate" className="text-[10px] py-0 px-1.5">
                              {tBilingual('Default', 'ነባሪ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tBilingual(
                              'Learners must complete modules, lessons, and required quizzes in strict sequential order.',
                              'ተማሪዎች ሞጁሎችን፣ ትምህርቶችን እና አስፈላጊ ፈተናዎችን በቅደም ተከተል ማጠናቀቅ አለባቸው።',
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="progressionMode"
                          checked={progressionMode === 'LOCKED'}
                          onChange={() => setProgressionMode('LOCKED')}
                          className="h-4 w-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {progressionMode === 'LOCKED' && (
                      <div className="border-t border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-slate-600 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 mt-0.5 shrink-0" />
                          <span>
                            {tBilingual(
                              'A module or lesson unlocks only after preceding prerequisites are completed.',
                              'አንድ ሞጁል ወይም ትምህርት የሚከፈተው ቀደም ሲል የነበሩ ቅድመ-ሁኔታዎች እንደተጠናቀቁ ከተመዘገቡ ብቻ ነው።',
                            )}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 mt-0.5 shrink-0" />
                          <span>
                            {tBilingual(
                              'Best suited for step-by-step onboarding, certification tracks, and structured compliance.',
                              'ለደረጃ በደረጃ ስልጠናዎች፣ የብቃት ማረጋገጫ መንገዶች እና ጥብቅ የህግ ማሟያ ኮርሶች ተመራጭ ነው።',
                            )}
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
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                    )}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                            progressionMode === 'OPEN'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <Unlock className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">
                              {tBilingual(
                                'Open Progression (Flexible / Self-Paced)',
                                'ክፍት የትምህርት ቅደም ተከተል (ተለዋዋጭ / በራስ ፍጥነት)',
                              )}
                            </h4>
                            <Badge variant="blue" className="text-[10px] py-0 px-1.5">
                              {tBilingual('Flexible', 'ተለዋዋጭ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tBilingual(
                              'All modules, lessons, and quizzes are open immediately. Final Assessment & Certificate unlock upon 100% completion.',
                              'ሁሉም ሞጁሎች፣ ትምህርቶች እና ጥያቄዎች ክፍት ናቸው። የመጨረሻው ምዘና እና ምስክር ወረቀት 100% ሲጠናቀቅ ይከፈታሉ።',
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="progressionMode"
                          checked={progressionMode === 'OPEN'}
                          onChange={() => setProgressionMode('OPEN')}
                          className="h-4 w-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    {progressionMode === 'OPEN' && (
                      <div className="border-t border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-slate-600 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 mt-0.5 shrink-0" />
                          <span>
                            {tBilingual(
                              'Learners can explore any topic and take module or lesson quizzes in any order.',
                              'ተማሪዎች ማንኛውንም ርዕስ መርጠው መማር እና የሞጁል ወይም የትምህርት ጥያቄዎችን በማንኛውም ቅደም ተከተል መውሰድ ይችላሉ።',
                            )}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <span>
                            {tBilingual(
                              'The Final Assessment and Certificate remain locked until all preceding lessons and quizzes are completed.',
                              'ሁሉም ቀደም ሲል የነበሩ ትምህርቶች እና ፈተናዎች እስኪጠናቀቁ ድረስ የመጨረሻው ምዘና እና ምስክር ወረቀት ተቆልፈው ይቆያሉ።',
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{tBilingual('Time-Spent Requirement', 'የቆይታ ጊዜ መስፈርት')}</CardTitle>
                    <CardDescription>
                      {tBilingual(
                        "Learners must spend at least this percentage of a lesson or module's configured duration before it can be marked complete.",
                        'ተማሪዎች አንድ ትምህርት ወይም ሞጁል እንደተጠናቀቀ ከመመዝገቡ በፊት ከተመደበው የቆይታ ጊዜ ቢያንስ ይህንን መቶኛ ማሳለፍ አለባቸው።',
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>{tBilingual('Required time spent', 'አስፈላጊ የቆይታ ጊዜ')}</span>
                    <span className="text-indigo-600 font-bold">{timeSpentPercent}%</span>
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
                      className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <span className="text-xs text-slate-400">
                      {tBilingual(
                        `e.g. a 20-minute lesson requires ${Math.ceil(20 * 60 * (timeSpentPercent / 100))} second(s) spent before completion.`,
                        `ለምሳሌ ባለ 20 ደቂቃ ትምህርት ከመጠናቀቁ በፊት ${Math.ceil(20 * 60 * (timeSpentPercent / 100))} ሰከንዶች ቆይታ ያስፈልገዋል።`,
                      )}
                    </span>
                  </div>
                  {timeSpentPercent === 0 ? (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {tBilingual(
                        '0% disables the time requirement entirely — lessons can be completed instantly.',
                        '0% የጊዜ መስፈርቱን ሙሉ በሙሉ ያሰናክላል — ትምህርቶች ወዲያውኑ ሊጠናቀቁ ይችላሉ።',
                      )}
                    </p>
                  ) : null}
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>
                      {tBilingual('Assessment Retake Cooldown', 'የምዘና ድጋሚ ሙከራ ማረፊያ ጊዜ')}
                    </CardTitle>
                    <CardDescription>
                      {tBilingual(
                        'Once a learner exhausts every attempt on an assessment, they may retake it again after this many minutes. Set to 0 to keep attempts permanently locked out.',
                        'ተማሪ በምዘና ላይ የተሰጡትን ሙከራዎች ከጨረሰ በኋላ ከዚህ ደቂቃዎች በኋላ እንደገና ሊሞክር ይችላል። ሙከራዎች በቋሚነት እንዲቆለፉ 0 ያድርጉት።',
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min={0}
                      value={retakeCooldownMinutes}
                      onChange={(e) =>
                        setRetakeCooldownMinutes(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <span className="text-sm text-slate-600 font-medium">
                      {tBilingual('minutes', 'ደቂቃዎች')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {retakeCooldownMinutes === 0
                      ? tBilingual(
                          'Retakes are disabled — max attempts reached is a permanent lockout.',
                          'ድጋሚ ሙከራዎች ተሰናክለዋል — ከፍተኛው ሙከራ ሲደረስ በቋሚነት ይቆለፋል።',
                        )
                      : tBilingual(
                          `A learner who exhausts their attempts can retake the assessment ${retakeCooldownMinutes} minute(s) after their last submission.`,
                          `ሙከራዎቹን ያጠናቀቀ ተማሪ ከመጨረሻው ምዝገባው ከ ${retakeCooldownMinutes} ደቂቃ(ዎች) በኋላ እንደገና መሞከር ይችላል።`,
                        )}
                  </p>
                </div>
              </Card>

              {/* Card 4: Global Assessment & Certification Pass Mark */}
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>
                        {tBilingual(
                          'Global Assessment & Certification Pass Mark',
                          'አጠቃላይ የምዘና እና ምስክር ወረቀት ማለፊያ ነጥብ',
                        )}
                      </CardTitle>
                      <Badge variant="green" className="text-[10px] py-0 px-1.5 font-bold">
                        {tBilingual('Dual Threshold', 'ድርብ ገደብ')}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {tBilingual(
                        'The global minimum score required to pass individual assessments and earn course certification. Learners must meet or exceed this mark on each quiz and in their total weighted course grade.',
                        'የግል ምዘናዎችን ለማለፍ እና የኮርስ የምስክር ወረቀት ለማግኘት የሚያስፈልገው አጠቃላይ ዝቅተኛ ውጤት። ተማሪዎች በእያንዳንዱ ፈተና እና በጠቅላላው የክብደት ውጤታቸው ይህንን ማሟላት አለባቸው።',
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>{tBilingual('Passing threshold', 'የማለፊያ መስፈርት')}</span>
                    <span className="text-emerald-700 font-bold text-base">{passingScorePercent}%</span>
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
                      className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-semibold text-slate-800"
                    />
                    <span className="text-xs text-slate-500">
                      {tBilingual(
                        'Select preset standard:',
                        'ፈጣን መደበኛ ምረቃ፦',
                      )}
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
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-slate-700 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>
                        <strong>{tBilingual('Per-Assessment Gate:', 'በእያንዳንዱ ምዘና፦')}</strong>{' '}
                        {tBilingual(
                          `Learners must score at least ${passingScorePercent}% on every quiz to pass it, retaking attempts until reached.`,
                          `ተማሪዎች እያንዳንዱን ፈተና ለማለፍ ቢያንስ ${passingScorePercent}% ማግኘት አለባቸው፤ እስኪያልፉ ድረስ ድጋሚ ይሞክራሉ።`,
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>
                        <strong>{tBilingual('Certification Gate:', 'የምስክር ወረቀት መስፈርት፦')}</strong>{' '}
                        {tBilingual(
                          `Total course grade (sum of weighted assessments) must also reach ${passingScorePercent}% to unlock the certificate.`,
                          `የምስክር ወረቀቱን ለመክፈት አጠቃላይ የተመዘነ የኮርስ ውጤት ቢያንስ ${passingScorePercent}% መድረስ አለበት።`,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="flex items-center gap-3">
            {coursePolicyUpdatedAt ? (
              <p className="text-xs text-slate-400">
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
              <h2 className="text-base font-bold text-slate-900">
                {tBilingual('Live Sessions & Attendance Policy', 'የቀጥታ ክፍለ-ጊዜዎች እና የክትትል ፖሊሲ')}
              </h2>
              <p className="text-xs text-slate-500">
                {tBilingual(
                  'Define platform-wide attendance visibility for participants and stay qualification thresholds.',
                  'ለመላው መድረክ የተሳታፊዎችን የክትትል ታይነት እና የቆይታ ብቁነት ገደቦችን ይወስኑ።',
                )}
              </p>
            </div>
            <Button
              onClick={() => void saveLivePolicy()}
              isLoading={savingLivePolicy}
              loadingText={tBilingual('Saving Policy…', 'ፖሊሲን በማስቀመጥ ላይ…')}
              disabled={loadingLivePolicy}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4" />
              {tBilingual('Save Live Session Policy', 'የቀጥታ ክፍለ-ጊዜ ፖሊሲን አስቀምጥ')}
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
              <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-soft ring-super-soft">
                <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        {tBilingual(
                          'Permit All Actors to View Session Attendance',
                          'ሁሉም ተጠቃሚዎች የክፍለ-ጊዜውን ክትትል እንዲያዩ ፍቀድ',
                        )}
                      </h3>
                      <Badge variant={allowAllViewAttendance ? 'green' : 'slate'}>
                        {allowAllViewAttendance
                          ? tBilingual('Permitted to All', 'ለሁሉም ተፈቅዷል')
                          : tBilingual('Restricted to Staff', 'ለሠራተኞች ብቻ የተገደበ')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {tBilingual(
                        'Determine whether learners and non-staff participants can inspect attendance logs.',
                        'ተማሪዎች እና ሰራተኛ ያልሆኑ ተሳታፊዎች የክትትል መዝገቦችን መመልከት መቻላቸውን ይወስኑ።',
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {allowAllViewAttendance
                          ? tBilingual('Public Dynamic Attendance Log', 'የህዝብ ተለዋዋጭ የክትትል መዝገብ')
                          : tBilingual(
                              'Restricted Staff Attendance Log',
                              'የተገደበ የሰራተኞች የክትትል መዝገብ',
                            )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {allowAllViewAttendance
                          ? tBilingual(
                              'All participants, including enrolled learners, can open the attendance modal and observe real-time join times, stay durations, and verification statuses.',
                              'የተመዘገቡ ተማሪዎችን ጨምሮ ሁሉም ተሳታፊዎች የክትትል መስኮቱን በመክፈት የተቀላቀሉበትን ሰዓት፣ የቆይታ ጊዜ እና የማረጋገጫ ሁኔታዎችን በቅጽበት መከታተል ይችላሉ።',
                            )
                          : tBilingual(
                              'Only trainers, course owners, training administrators, and system administrators can view session attendee rosters.',
                              'አሰልጣኞች፣ የኮርስ ባለቤቶች፣ የስልጠና አስተዳዳሪዎች እና የስርዓት አስተዳዳሪዎች ብቻ የተሳታፊዎችን ዝርዝር ማየት ይችላሉ።',
                            )}
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

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-800 flex items-start gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
                    <span>
                      {tBilingual(
                        'Individual session creators can still toggle visibility specifically per session, but this master switch defines the platform standard for all live sessions.',
                        'የግል ክፍለ-ጊዜ ፈጣሪዎች ለእያንዳንዱ ክፍለ-ጊዜ ታይነቱን መወሰን ይችላሉ፤ ነገር ግን ይህ ዋና መቀየሪያ ለመላው መድረክ የቀጥታ ክፍለ-ጊዜዎች ነባሪውን ይወስናል።',
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Stay Threshold */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft">
                <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      {tBilingual(
                        'Minimum Active Stay Threshold for "Present" Status',
                        'እንደ "ተገኝቷል" ለመቆጠር ዝቅተኛው የቆይታ መቶኛ',
                      )}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {tBilingual(
                        'Required percentage of total session duration a participant must stay connected.',
                        'ተሳታፊው መቆየት ያለበት አጠቃላይ የክፍለ-ጊዜው የቆይታ ጊዜ መቶኛ።',
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>{tBilingual('Threshold percentage', 'የብቁነት መቶኛ')}</span>
                      <span className="text-emerald-700 font-bold text-base">
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
                          className="w-24 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                        />
                        <span className="absolute right-3 text-sm text-slate-400 font-semibold">
                          %
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {tBilingual(
                          'Minimum 10%, Maximum 100%. Recommended: 60%.',
                          'ዝቅተኛ 10%፣ ከፍተኛ 100%። የሚመከረው፡ 60%።',
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic calculation preview */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {tBilingual('Qualification Preview:', 'የብቁነት ቅድመ-ዕይታ፡')}
                    </p>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                      <li>
                        {tBilingual(
                          'For a 60-minute session: Learner must stay connected for at least',
                          'ለ 60-ደቂቃ ክፍለ-ጊዜ፡ ተማሪው ቢያንስ መቆየት አለበት፡',
                        )}{' '}
                        <span className="font-semibold text-emerald-700">
                          {Math.round(60 * (numericThreshold / 100))}{' '}
                          {tBilingual('minutes', 'ደቂቃዎች')}
                        </span>{' '}
                        {tBilingual('to be marked PRESENT.', 'እንደ ተገኝቷል ለመመዝገብ።')}
                      </li>
                      <li>
                        {tBilingual(
                          `Learners with less than ${numericThreshold}% active stay will automatically be marked ABSENT in audit exports.`,
                          `ከ ${numericThreshold}% በታች የቆዩ ተማሪዎች በክትትል ሰነዶች ላይ በቀጥታ አልተገኘም (ቀሪ) ተብለው ይመዘገባሉ።`,
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Rolling Rescheduler & Day Gap Policy */}
            <div className="relative overflow-hidden rounded-2xl border border-violet-200/90 bg-white p-6 shadow-soft ring-super-soft">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {tBilingual(
                          'Institutional Day Gap Between Cycles',
                          'በዙሮች መካከል ያለው የተቋም የቀናት ልዩነት',
                        )}
                      </h3>
                      <Badge variant="indigo" className="text-[10px] py-0 px-2 font-bold">
                        {tBilingual('Rolling Cycle Engine', 'ተከታታይ ዙር ሞተር')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
                      {tBilingual(
                        'When a live session completes, the engine automatically calculates the next session date by finding the latest upcoming scheduled session for the course and adding this policy day gap. Original start hours and durations are preserved.',
                        'አንድ የቀጥታ ክፍለ-ጊዜ ሲጠናቀቅ ስርዓቱ የመጨረሻውን የኮርስ መርሐግብር ተከትሎ በዚህ የተቋም የፖሊሲ ቀን ልዩነት መሠረት ቀጣዩን ዙር በራስ-ሰር ያዘጋጃል። የመጀመሪያው ሰዓትና ቆይታ ሳይለወጥ ይጠበቃል።',
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* Day Gap Controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>{tBilingual('Policy Day Gap Between Cycles', 'በዙሮች መካከል ያለው የፖሊሲ የቀናት ልዩነት')}</span>
                    <span className="text-violet-700 font-bold text-base">
                      {rescheduleDayGap} {tBilingual('Days', 'ቀናት')}
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
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        {preset} {tBilingual('Days', 'ቀናት')}
                        {preset === 10 && ` (${tBilingual('Default', 'ነባሪ')})`}
                      </button>
                    ))}

                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-slate-500">
                        {tBilingual('Custom:', 'ብጁ፡')}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={rescheduleDayGap}
                        onChange={(e) => setRescheduleDayGap(e.target.value)}
                        className="w-24 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
                      />
                      <span className="text-xs text-slate-400">
                        {tBilingual('days', 'ቀናት')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Concrete Example Box */}
                <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-2">
                  <p className="text-xs font-bold text-violet-900">
                    {tBilingual('Rolling Cycle Rule Example:', 'የተከታታይ ዙር ደንብ ምሳሌ፡')}
                  </p>
                  <p className="text-xs text-violet-800 leading-relaxed">
                    {tBilingual(
                      `If a course has 3 sessions (Session 1 on Nov 1, Session 2 on Nov 10, Session 3 on Nov 20) with a ${rescheduleDayGap}-day gap: when Session 1 ends on Nov 1, Session 1 is rescheduled for Nov 20 + ${rescheduleDayGap} days. Newly enrolled learners can attend Session 1 on that date, while previously attended learners already have verified credit and do not need to repeat it. Course publishers retain full rights to manually adjust trainer, date, or time after automatic rescheduling.`,
                      `አንድ ኮርስ 3 ክፍለ-ጊዜዎች ቢኖሩት (ክፍለ-ጊዜ 1 በህዳር 1፣ ክፍለ-ጊዜ 2 በህዳር 10፣ ክፍለ-ጊዜ 3 በህዳር 20) እና የ ${rescheduleDayGap} ቀናት ልዩነት ቢኖር፦ ክፍለ-ጊዜ 1 በህዳር 1 ሲጠናቀቅ ክፍለ-ጊዜ 1 ለህዳር 20 + ${rescheduleDayGap} ቀናት እንደገና ይዘጋጃል። አዲስ የተመዘገቡ ተማሪዎች በዚያ ቀን መከታተል ይችላሉ፤ ቀደም ሲል ያጠናቀቁ ተማሪዎች ደግሞ ምስክር ወረቀታቸው አይቋረጥም። የኮርስ አዘጋጆች ከዳግም መርሐግብር በኋላ አሰልጣኙን ወይም ቀኑን በእጅ ማስተካከል ይችላሉ።`,
                    )}
                  </p>
                </div>

                {/* Institutional Working Calendar Highlights */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                      <CalendarCheck className="h-4 w-4 text-emerald-600" />
                      <span>{tBilingual('Monday – Saturday Active', 'ከሰኞ – ቅዳሜ የሥራ ቀናት')}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                      {tBilingual(
                        'Standard Ethiopian public sector & revenue academic training days are fully respected.',
                        'መደበኛ የኢትዮጵያ የመንግሥት ዘርፍና የገቢዎች አካዳሚ የስልጠና ቀናት ሙሉ በሙሉ ይከበራሉ።',
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <span>{tBilingual('Sundays Strictly Skipped', 'እሑዶች አይካተቱም')}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                      {tBilingual(
                        'If a computed date lands on a Sunday, the engine automatically rolls it forward to Monday.',
                        'የተሰላው ቀን እሁድ ላይ ካረፈ ሞተሩ በቀጥታ ወደ ሰኞ ያስተላልፈዋል።',
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                      <Award className="h-4 w-4 text-indigo-600" />
                      <span>{tBilingual('Statutory Holidays Skipped', 'ህጋዊ የህዝብ በዓላት')}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                      {tBilingual(
                        'National holidays registered in the table below are automatically bypassed to the next open working day.',
                        'ከዚህ በታች የተመዘገቡ ብሄራዊ በዓላት በራስ-ሰር ታልፈው ወደ ቀጣዩ የሥራ ቀን ይዘዋወራሉ።',
                      )}
                    </p>
                  </div>
                </div>

                {/* Public Holidays Collapsible Management */}
                <div className="border-t border-slate-200/80 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {tBilingual('Ethiopian Statutory Public Holidays', 'የኢትዮጵያ ህጋዊ የህዝብ በዓላት')}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {tBilingual(
                          `${holidays.length} registered holiday(s) currently active in the calendar engine.`,
                          `በቀን መቁጠሪያው ውስጥ ${holidays.length} ንቁ በዓላት ተመዝግበዋል።`,
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSeedDefaults()}
                        isLoading={seedingHolidays}
                        loadingText={tBilingual('Seeding…', 'በማስገባት ላይ…')}
                        className="text-xs text-violet-700 border-violet-200 hover:bg-violet-50 cursor-pointer"
                      >
                        {tBilingual('Seed Standard Holidays', 'መደበኛ በዓላትን አስገባ')}
                      </Button>

                      <button
                        type="button"
                        onClick={() => setShowHolidays(!showHolidays)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {showHolidays
                          ? tBilingual('Hide Table', 'ሰንጠረዡን ደብቅ')
                          : tBilingual('Manage Holidays', 'በዓላትን አስተዳድር')}
                        {showHolidays ? (
                          <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {showHolidays && (
                    <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      {/* Add Holiday Form */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
                        <input
                          type="text"
                          placeholder={tBilingual('Holiday name (e.g. Adwa Victory Day)', 'የበዓሉ ስም (ለምሳሌ የአድዋ ድል በዓል)')}
                          value={newHolidayName}
                          onChange={(e) => setNewHolidayName(e.target.value)}
                          className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                        />
                        <input
                          type="date"
                          value={newHolidayDate}
                          onChange={(e) => setNewHolidayDate(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
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
                          {tBilingual('Add Holiday', 'በዓል አክል')}
                        </Button>
                      </div>

                      {/* Holiday List Table */}
                      {loadingHolidays ? (
                        <p className="text-xs text-slate-400 py-2">
                          {tBilingual('Loading public holidays…', 'የህዝብ በዓላትን በመጫን ላይ…')}
                        </p>
                      ) : holidays.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500">
                          <p>{tBilingual('No public holidays registered yet.', 'እስካሁን የተመዘገበ የህዝብ በዓል የለም።')}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {tBilingual(
                              'Click "Seed Standard Holidays" above to populate Ethiopian statutory holidays automatically.',
                              'የኢትዮጵያ ህጋዊ በዓላትን በራስ-ሰር ለማስገባት ከላይ "መደበኛ በዓላትን አስገባ" የሚለውን ይጫኑ።',
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs">
                              <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold sticky top-0">
                                <tr>
                                  <th className="px-3 py-2">{tBilingual('Holiday Name', 'የበዓሉ ስም')}</th>
                                  <th className="px-3 py-2">{tBilingual('Date', 'ቀን')}</th>
                                  <th className="px-3 py-2 text-right">{tBilingual('Actions', 'እርምጃዎች')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {holidays.map((h) => {
                                  const dateStr = new Date(h.holidayDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    weekday: 'short',
                                  });
                                  return (
                                    <tr key={h.id} className="hover:bg-slate-50/80">
                                      <td className="px-3 py-2 font-medium text-slate-800">
                                        {h.nameEn}
                                        {h.nameAm && <span className="ml-2 text-slate-400">({h.nameAm})</span>}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600">{dateStr}</td>
                                      <td className="px-3 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteHoliday(h.id)}
                                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                          title={tBilingual('Delete Holiday', 'በዓሉን ሰርዝ')}
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
              <p className="text-xs text-slate-400">
                Last updated {new Date(livePolicyUpdatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
