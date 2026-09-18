"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Lock, Save, ShieldCheck, Users } from "lucide-react";
import { fetchSystemSettings, updateSystemSettings } from "@/lib/api/monitoring";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function SystemSettingsPage() {
  const { lang, setLang } = useLms();
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [notifications, setNotifications] = useState(true);
  const [openRegistration, setOpenRegistration] = useState(false);
  const [ssoEnabled, setSSOEnabled] = useState(true);

  // Live session attendance settings
  const [allowAllViewAttendance, setAllowAllViewAttendance] = useState(false);
  const [attendanceThreshold, setAttendanceThreshold] = useState("60");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSystemSettings()
      .then((settings) => {
        if (!cancelled && settings) {
          if (settings.allow_all_view_attendance !== undefined) {
            setAllowAllViewAttendance(settings.allow_all_view_attendance === "true");
          }
          if (settings.default_attendance_threshold) {
            setAttendanceThreshold(settings.default_attendance_threshold);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  const toggleClass = (active: boolean) =>
    cn(
      "relative inline-flex h-6 w-11 items-center rounded-full shadow-inner transition-colors duration-200 cursor-pointer",
      active
        ? "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/30"
        : "bg-slate-300",
    );

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);
    try {
      await updateSystemSettings({
        allow_all_view_attendance: String(allowAllViewAttendance),
        default_attendance_threshold: String(attendanceThreshold),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to persist system settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      role="system_admin"
      title="System Settings"
      description="Configure platform defaults, institutional security, and dynamic live session attendance permissions."
    >
      <div className="max-w-2xl space-y-6 pb-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Live Sessions & Attendance Governance Section */}
        <div className="space-y-4 rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-soft ring-super-soft">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Live Sessions &amp; Attendance Policy
              </h3>
              <p className="text-xs text-slate-500">
                Control dynamic attendance visibility for all actors and define qualification thresholds.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Dynamic Attendance Permission Toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Permit All Actors to View Session Attendance
                  </p>
                  <Badge variant={allowAllViewAttendance ? "green" : "slate"}>
                    {allowAllViewAttendance ? "Permitted to All" : "Restricted to Staff"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  When enabled, any participant (including learners) can dynamically open the attendance
                  modal and view attendees, join/leave timestamps, stay durations, and verification statuses.
                  When disabled, only course trainers and system administrators can view attendees.
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

            {/* Attendance Threshold Setting */}
            <div className="py-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Minimum Active Stay Threshold for &quot;Present&quot; Status (%)
              </label>
              <p className="mb-2 text-xs text-slate-500">
                The minimum percentage of total session duration a learner must stay connected
                across their join and rejoin intervals to be verified as <strong>PRESENT</strong> (e.g. 60%). Learners below this percentage are marked <strong>ABSENT</strong>.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={attendanceThreshold}
                  onChange={(e) => setAttendanceThreshold(e.target.value)}
                  className={cn(inputClass, "max-w-[120px]")}
                />
                <span className="text-xs font-semibold text-slate-600">
                  % of session duration
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* General System Information */}
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">System name</label>
            <input
              value="Ministry of Revenues — Learning Management System"
              readOnly
              className={cn(inputClass, "bg-slate-50")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Default language
              </label>
              <select
                value={lang}
                onChange={(event) => setLang(event.target.value as "en" | "am")}
                className={inputClass}
              >
                <option value="en">English</option>
                <option value="am">አማርኛ (Amharic)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Session timeout (minutes)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={sessionTimeout}
                onChange={(event) => setSessionTimeout(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Platform Integration Toggles */}
        <div className="divide-y divide-slate-100/80 rounded-2xl border border-slate-200/80 bg-white shadow-soft ring-super-soft">
          {[
            {
              label: "Email notifications",
              description: "Send email updates and session reminders to users and trainers.",
              value: notifications,
              set: setNotifications,
            },
            {
              label: "Open registration",
              description: "Allow new users to self-register via the login page.",
              value: openRegistration,
              set: setOpenRegistration,
            },
            {
              label: "SSO / e-services integration",
              description: "Single sign-on with the MoR eServices portal.",
              value: ssoEnabled,
              set: setSSOEnabled,
            },
          ].map((setting) => (
            <div key={setting.label} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{setting.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{setting.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={setting.value}
                onClick={() => setting.set(!setting.value)}
                className={toggleClass(setting.value)}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-xs",
                    setting.value ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="h-4 w-4" />
            {saving ? "Saving settings…" : "Save Settings"}
          </Button>
          {saved && (
            <Badge variant="green" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Settings updated successfully
            </Badge>
          )}
        </div>
      </div>
    </PageShell>
  );
}