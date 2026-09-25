"use client";

import { useState } from "react";
import { ChevronDown, Keyboard, Mail, Phone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface HelpSupportProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpSupport({ open, onClose }: HelpSupportProps) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const { tBilingual } = useTranslation();

  const faqs = [
    {
      q: tBilingual("How do I reset my password?", "የይለፍ ቃሌን እንዴት መቀየር እችላለሁ?"),
      a: tBilingual(
        "Open Account → Security and enter your current and new password. You'll need to sign in again on your other devices afterwards.",
        "መለያ → ደህንነት የሚለውን ከፍተው አሁን ያለውን እና አዲሱን የይለፍ ቃል ያስገቡ። ከዚያ በኋላ በሌሎች መሳሪያዎችዎ ላይ እንደገና መግባት ይኖርብዎታል።"
      ),
    },
    {
      q: tBilingual("How do I switch the interface language?", "የስርዓቱን ቋንቋ እንዴት መቀየር እችላለሁ?"),
      a: tBilingual(
        "Open Account → Preferences and choose English or Amharic, or use the language toggle in the header/sidebar. Your choice is saved automatically.",
        "በራስጌው ወይም በጎን ማውጫው ላይ ያለውን የቋንቋ መምረጫ በመጠቀም ወይም መለያ → ምርጫዎች ውስጥ በመግባት እንግሊዝኛ ወይም አማርኛ መምረጥ ይችላሉ።"
      ),
    },
    {
      q: tBilingual("Who approves new registrations?", "አዳዲስ ምዝገባዎችን የሚያጸድቀው ማን ነው?"),
      a: tBilingual(
        "A System Administrator or Training Administrator reviews and approves new sign-ups before they can log in.",
        "የስርዓት አስተዳዳሪ ወይም የስልጠና አስተዳዳሪ አዳዲስ ተጠቃሚዎች ከመግባታቸው በፊት መረጃቸውን መርምረው ያጸድቃሉ።"
      ),
    },
    {
      q: tBilingual("How do I get a course certificate?", "የኮርስ ማጠናቀቂያ ሰርተፍኬት እንዴት ማግኘት እችላለሁ?"),
      a: tBilingual(
        "Certificates are issued automatically once you complete all modules and pass the final assessment, if one is required.",
        "ሁሉንም ሞጁሎች አጠናቀው የማጠቃለያ ፈተናውን ካለፉ በኋላ ሰርተፍኬቱ በራስ-ሰር ይዘጋጅልዎታል።"
      ),
    },
  ];

  const shortcuts = [
    {
      keys: "Esc",
      action: tBilingual("Close the open modal or panel", "ክፍት የሆነውን መስኮት ወይም ፓነል ዝጋ"),
    },
    {
      keys: "Ctrl / Cmd + K",
      action: tBilingual("Focus the search bar (where available)", "ወደ ፍለጋ ሳጥኑ ሂድ"),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tBilingual("Help & Support", "እርዳታ እና ድጋፍ")}
      subtitle={tBilingual(
        "FAQs, contact information, and shortcuts",
        "ተደጋጋሚ ጥያቄዎች፣ የእውቂያ መረጃ እና አቋራጮች"
      )}
      size="lg"
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tBilingual("Frequently asked questions", "ተደጋጋሚ ጥያቄዎች")}
          </h3>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {faqs.map((item, index) => (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === index ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {item.q}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                      expanded === index && "rotate-180",
                    )}
                  />
                </button>
                {expanded === index ? (
                  <p className="px-4 pb-3 text-sm text-slate-500">{item.a}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tBilingual("Contact support", "የቴክኒክ ድጋፍ አግኝ")}
          </h3>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" /> support@mor.gov.et
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" /> +251 11 000 0000
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Keyboard className="h-3.5 w-3.5" /> {tBilingual("Keyboard shortcuts", "የቁልፍ ሰሌዳ አቋራጮች")}
          </h3>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-500">{s.action}</span>
                <kbd className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">
          {tBilingual("MoR Learning Management System · v1.0.0", "የገቢዎች ሚኒስቴር የስልጠና ማስተዳደሪያ ስርዓት · v1.0.0")}
        </p>
      </div>
    </Modal>
  );
}
