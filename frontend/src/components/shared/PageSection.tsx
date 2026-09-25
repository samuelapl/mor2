"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { COMMON_TRANSLATIONS } from "@/lib/i18n/translations";

export interface BilingualText {
  en: string;
  am: string;
}

interface PageSectionProps {
  title: string | BilingualText | ReactNode;
  description?: string | BilingualText | ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function PageSection({
  title,
  description,
  action,
  children,
  className = "mb-8",
}: PageSectionProps) {
  const { lang } = useTranslation();
  const isAmharic = lang === "am";

  const renderText = (value?: string | BilingualText | ReactNode): ReactNode => {
    if (!value) return null;
    if (typeof value === "object" && value !== null && "en" in value && "am" in value) {
      const b = value as BilingualText;
      return isAmharic ? b.am : b.en;
    }
    if (typeof value === "string") {
      for (const entry of Object.values(COMMON_TRANSLATIONS)) {
        if (entry.en.toLowerCase() === value.toLowerCase()) {
          return isAmharic ? entry.am : entry.en;
        }
      }
      return value;
    }
    return value;
  };

  return (
    <section className={className}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-slate-900">
            {renderText(title)}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{renderText(description)}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}