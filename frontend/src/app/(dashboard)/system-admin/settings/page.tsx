"use client";

import { useState } from "react";
import { Save } from "lucide-react";
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
  const [saved, setSaved] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

  const toggleClass = (active: boolean) =>
    cn(
      "relative inline-flex h-6 w-11 items-center rounded-full shadow-inner transition-colors duration-200",
      active
        ? "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/30"
        : "bg-slate-300",
    );

  const save = () => {
    setSaved(true);
  };

  return (
    <PageShell
      role="system_admin"
      title="System Settings"
      description="Configure platform defaults. These settings are simulated for the demo."
    >
      <div className="max-w-2xl space-y-6">
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">System name</label>
            <input value="Ministry of Revenues — ELTMS" readOnly className={cn(inputClass, "bg-slate-50")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Default language
              </label>
              <select value={lang} onChange={(event) => setLang(event.target.value as "en" | "am")} className={inputClass}>
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
          <div className="flex justify-end">
            <Badge variant="slate">System administrator access required</Badge>
          </div>
        </div>

        <div className="divide-y divide-slate-100/80 rounded-2xl border border-slate-200/80 bg-white shadow-soft ring-super-soft">
          {[
            {
              label: "Email notifications",
              description: "Send email updates to users and administrators.",
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
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                    setting.value ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
          {saved ? <Badge variant="green">Settings saved (simulated)</Badge> : null}
        </div>
      </div>
    </PageShell>
  );
}