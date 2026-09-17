"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { fetchMyProfile } from "@/lib/api/users";
import type { ApiUser } from "@/lib/api/types";
import ProfileTab from "./ProfileTab";
import SecurityTab from "./SecurityTab";
import DetailsTab from "./DetailsTab";
import PreferencesTab from "./PreferencesTab";

type TabKey = "profile" | "security" | "details" | "preferences";

const TABS: { key: TabKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
  { key: "details", label: "Details" },
  { key: "preferences", label: "Preferences" },
];

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AccountModal({ open, onClose }: AccountModalProps) {
  const [tab, setTab] = useState<TabKey>("profile");
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Account settings"
      subtitle="Manage your profile, security, and preferences"
      size="lg"
    >
      <div className="mb-5 flex gap-1 border-b border-slate-100 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <ProfileTab profile={profile} loading={loading} onUpdated={setProfile} />
      ) : null}
      {tab === "security" ? <SecurityTab /> : null}
      {tab === "details" ? <DetailsTab profile={profile} loading={loading} /> : null}
      {tab === "preferences" ? <PreferencesTab /> : null}
    </Modal>
  );
}
