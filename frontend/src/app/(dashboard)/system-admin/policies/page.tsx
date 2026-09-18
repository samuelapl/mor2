"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, RotateCcw, Save, ShieldAlert, Timer } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchCoursePolicy, updateCoursePolicy } from "@/lib/api/policy";
import { ApiError } from "@/lib/api/client";

export default function CoursePoliciesPage() {
  const { currentUser } = useLms();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [timeSpentPercent, setTimeSpentPercent] = useState(50);
  const [retakeCooldownMinutes, setRetakeCooldownMinutes] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const policy = await fetchCoursePolicy();
      setTimeSpentPercent(policy.timeSpentPercent);
      setRetakeCooldownMinutes(policy.retakeCooldownMinutes);
      setUpdatedAt(policy.updatedAt);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load course policy settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const policy = await updateCoursePolicy({ timeSpentPercent, retakeCooldownMinutes });
      setTimeSpentPercent(policy.timeSpentPercent);
      setRetakeCooldownMinutes(policy.retakeCooldownMinutes);
      setUpdatedAt(policy.updatedAt);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save course policy settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      role={currentUser?.role ?? "system_admin"}
      title="Course Policies"
      description="Control the completion and retake rules applied across every course."
      actions={
        <Button onClick={() => void save()} disabled={loading || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-500" />
          Loading policy settings…
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
                  Learners must spend at least this percentage of a lesson or module's configured
                  duration before it can be marked complete.
                </CardDescription>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Required time spent</span>
                <span className="text-indigo-600">{timeSpentPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={timeSpentPercent}
                onChange={(e) => setTimeSpentPercent(Number(e.target.value))}
                className="w-full accent-indigo-600"
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
                  {Math.ceil(20 * 60 * (timeSpentPercent / 100))} second(s) spent before it can be
                  completed. Fractional percentages (e.g. 0.3) are supported.
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
                <span className="text-sm text-slate-600">minutes</span>
              </div>
              <p className="text-xs text-slate-500">
                {retakeCooldownMinutes === 0
                  ? "Retakes are disabled — max attempts reached is a permanent lock."
                  : `A learner who exhausts their attempts can retake the assessment ${retakeCooldownMinutes} minute(s) after their last submission.`}
              </p>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {saved ? (
          <Badge variant="green" dot>
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Saved
          </Badge>
        ) : null}
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-red-600">
            <ShieldAlert className="h-3.5 w-3.5" />
            {error}
          </p>
        ) : null}
        {updatedAt ? (
          <p className="text-xs text-slate-400">Last updated {new Date(updatedAt).toLocaleString()}</p>
        ) : null}
      </div>
    </PageShell>
  );
}
