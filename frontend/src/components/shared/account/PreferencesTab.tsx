"use client";

import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { Lang } from "@/types";

export default function PreferencesTab() {
  const { lang, updateLocale } = useLms();
  const { tBilingual } = useTranslation();
  const [saving, setSaving] = useState<Lang | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options: { key: Lang; label: string; native: string }[] = [
    { key: "en", label: tBilingual("English", "እንግሊዝኛ"), native: "English (EN)" },
    { key: "am", label: tBilingual("Amharic", "አማርኛ"), native: "አማርኛ (AM)" },
  ];

  const handleSelect = async (option: Lang) => {
    if (option === lang || saving) return;
    setSaving(option);
    setError(null);
    const result = await updateLocale(option);
    setSaving(null);
    if (!result.ok) {
      setError(
        result.message ??
          tBilingual("Failed to update language.", "ቋንቋውን ማዘመን አልተቻለም።")
      );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Globe className="h-4 w-4 text-slate-400" />
          {tBilingual("Display language", "የመተግበሪያው ቋንቋ")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => void handleSelect(option.key)}
              disabled={saving !== null}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-60",
                lang === option.key
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="text-xs text-slate-400">{option.native}</span>
              </span>
              {lang === option.key ? <Check className="h-4 w-4 text-indigo-600" /> : null}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-400">
        {tBilingual(
          "Your language choice is saved to your account and applied the next time you sign in.",
          "የመረጡት ቋንቋ በመለያዎ ውስጥ ይቀመጣል እንዲሁም በቀጣይ ሲገቡ በቀጥታ ይተገበራል።"
        )}
      </p>
    </div>
  );
}
