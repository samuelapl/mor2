"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Users,
  Video,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchCoursePolicy, updateCoursePolicy } from "@/lib/api/policy";
import { fetchSystemSettings, updateSystemSettings } from "@/lib/api/monitoring";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { CardSkeleton } from "@/components/ui/Skeleton";

type PolicyTab = "course" | "live_sessions";

export default function PoliciesPage() {
  const { currentUser } = useLms();
  const [activeTab, setActiveTab] = useState<PolicyTab>("course");

  // Course policy states
  const [loadingCoursePolicy, setLoadingCoursePolicy] = useState(true);
  const [savingCoursePolicy, setSavingCoursePolicy] = useState(false);
  const [timeSpentPercent, setTimeSpentPercent] = useState(50);
  const [retakeCooldownMinutes, setRetakeCooldownMinutes] = useState(0);
  const [coursePolicyUpdatedAt, setCoursePolicyUpdatedAt] = useState<string | null>(null);

  // Live session attendance policy states
  const [loadingLivePolicy, setLoadingLivePolicy] = useState(true);
  const [savingLivePolicy, setSavingLivePolicy] = useState(false);
  const [allowAllViewAttendance, setAllowAllViewAttendance] = useState(false);
  const [attendanceThreshold, setAttendanceThreshold] = useState("60");
  const [livePolicyUpdatedAt, setLivePolicyUpdatedAt] = useState<string | null>(null);

  // Load course policies
  const loadCoursePolicies = async () => {
    setLoadingCoursePolicy(true);
    try {
      const policy = await fetchCoursePolicy();
      setTimeSpentPercent(policy.timeSpentPercent);
      setRetakeCooldownMinutes(policy.retakeCooldownMinutes);
      setCoursePolicyUpdatedAt(policy.updatedAt);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Unable to load course policy settings.",
      );
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
          setAllowAllViewAttendance(settings.allow_all_view_attendance === "true");
        }
        if (settings.default_attendance_threshold) {
          setAttendanceThreshold(settings.default_attendance_threshold);
        }
        if (settings.updated_at) {
          setLivePolicyUpdatedAt(settings.updated_at);
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to load live session policy settings.",
      );
    } finally {
      setLoadingLivePolicy(false);
    }
  };

  useEffect(() => {
    void loadCoursePolicies();
    void loadLivePolicies();
  }, []);

  const saveCoursePolicy = async () => {
    setSavingCoursePolicy(true);
    try {
      const policy = await updateCoursePolicy({ timeSpentPercent, retakeCooldownMinutes });
      setTimeSpentPercent(policy.timeSpentPercent);
      setRetakeCooldownMinutes(policy.retakeCooldownMinutes);
      setCoursePolicyUpdatedAt(policy.updatedAt);
      toast.success("Course completion policies saved successfully.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Unable to save course policy settings.",
      );
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
      });
      setLivePolicyUpdatedAt(new Date().toISOString());
      toast.success("Live session attendance policy saved successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to persist live session policy settings.",
      );
    } finally {
      setSavingLivePolicy(false);
    }
  };

  const toggleClass = (active: boolean) =>
    cn(
      "relative inline-flex h-6 w-11 items-center rounded-full shadow-inner transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
      active
        ? "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/30"
        : "bg-slate-300",
    );

  const numericThreshold = Math.min(100, Math.max(10, parseInt(attendanceThreshold, 10) || 60));

  return (
    <PageShell
      role={currentUser?.role ?? "system_admin"}
      title="Policies"
      description="Manage institutional policies including course completion requirements, retake rules, and live session attendance governance."
    >
      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("course")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-xs",
            activeTab === "course"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
              : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80",
          )}
        >
          <Clock className="h-4 w-4" />
          <span>Course Completion Policies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("live_sessions")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-xs",
            activeTab === "live_sessions"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
              : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80",
          )}
        >
          <Video className="h-4 w-4" />
          <span>Live Sessions &amp; Attendance Policy</span>
          <Badge variant="indigo" className="ml-1 text-[10px] py-0 px-1.5">
            Relocated
          </Badge>
        </button>
      </div>

      {/* TAB 1: Course Completion Policies */}
      {activeTab === "course" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Course Completion &amp; Retake Rules</h2>
              <p className="text-xs text-slate-500">
                Applied globally to module progress calculations and assessment lockout policies.
              </p>
            </div>
            <Button
              onClick={() => void saveCoursePolicy()}
              isLoading={savingCoursePolicy}
              loadingText="Saving Policies…"
              disabled={loadingCoursePolicy}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4" />
              Save Course Policies
            </Button>
          </div>

          {loadingCoursePolicy ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <CardSkeleton count={2} />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Time-Spent Requirement</CardTitle>
                    <CardDescription>
                      Learners must spend at least this percentage of a lesson or module&apos;s configured
                      duration before it can be marked complete.
                    </CardDescription>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Required time spent</span>
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
                      e.g. a 20-minute lesson requires{" "}
                      {Math.ceil(20 * 60 * (timeSpentPercent / 100))} second(s) spent before completion.
                    </span>
                  </div>
                  {timeSpentPercent === 0 ? (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      0% disables the time requirement entirely — lessons can be completed instantly.
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
                    <CardTitle>Assessment Retake Cooldown</CardTitle>
                    <CardDescription>
                      Once a learner exhausts every attempt on an assessment, they may retake it again
                      after this many minutes. Set to 0 to keep attempts permanently locked out.
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
                    <span className="text-sm text-slate-600 font-medium">minutes</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {retakeCooldownMinutes === 0
                      ? "Retakes are disabled — max attempts reached is a permanent lockout."
                      : `A learner who exhausts their attempts can retake the assessment ${retakeCooldownMinutes} minute(s) after their last submission.`}
                  </p>
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
      {activeTab === "live_sessions" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Live Sessions &amp; Attendance Policy
              </h2>
              <p className="text-xs text-slate-500">
                Define platform-wide attendance visibility for participants and stay qualification thresholds.
              </p>
            </div>
            <Button
              onClick={() => void saveLivePolicy()}
              isLoading={savingLivePolicy}
              loadingText="Saving Policy…"
              disabled={loadingLivePolicy}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4" />
              Save Live Session Policy
            </Button>
          </div>

          {loadingLivePolicy ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CardSkeleton count={2} />
            </div>
          ) : (
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
                        Permit All Actors to View Session Attendance
                      </h3>
                      <Badge variant={allowAllViewAttendance ? "green" : "slate"}>
                        {allowAllViewAttendance ? "Permitted to All" : "Restricted to Staff"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Determine whether learners and non-staff participants can inspect attendance logs.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {allowAllViewAttendance
                          ? "Public Dynamic Attendance Log"
                          : "Restricted Staff Attendance Log"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        {allowAllViewAttendance
                          ? "All participants, including enrolled learners, can open the attendance modal and observe real-time join times, stay durations, and verification statuses."
                          : "Only trainers, course owners, training administrators, and system administrators can view session attendee rosters."}
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
                          "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-xs",
                          allowAllViewAttendance ? "translate-x-5" : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-800 flex items-start gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
                    <span>
                      Individual session creators can still toggle visibility specifically per session,
                      but this master switch defines the platform standard for all live sessions.
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
                      Minimum Active Stay Threshold for &quot;Present&quot; Status
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Required percentage of total session duration a participant must stay connected.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>Threshold percentage</span>
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
                        Minimum 10%, Maximum 100%. Recommended: 60%.
                      </span>
                    </div>
                  </div>

                  {/* Dynamic calculation preview */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Qualification Preview:</p>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                      <li>
                        For a <strong>60-minute</strong> session: Learner must stay connected for at least{" "}
                        <span className="font-semibold text-emerald-700">
                          {Math.round(60 * (numericThreshold / 100))} minutes
                        </span>{" "}
                        to be marked <strong>PRESENT</strong>.
                      </li>
                      <li>
                        Learners with less than {numericThreshold}% active stay will automatically be marked{" "}
                        <span className="font-semibold text-rose-600">ABSENT</span> in audit exports.
                      </li>
                    </ul>
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
