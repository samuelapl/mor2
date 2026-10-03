'use client';

import { useState } from 'react';
import {
  Building2,
  Check,
  Globe2,
  Layers,
  Radio,
  Sparkles,
  Users2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { CourseDeliveryMode } from '@/types';
import { DEFAULT_DELIVERY_MODE, isDeliveryModeEnabled } from '@/constants/delivery-modes';
import { cn } from '@/lib/utils';

interface DeliveryFormatModalProps {
  open: boolean;
  initialMode?: CourseDeliveryMode;
  onSelect: (mode: CourseDeliveryMode) => void;
  onCancel: () => void;
}

export function DeliveryFormatModal({
  open,
  initialMode = DEFAULT_DELIVERY_MODE,
  onSelect,
  onCancel,
}: DeliveryFormatModalProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const [selected, setSelected] = useState<CourseDeliveryMode>(isDeliveryModeEnabled(initialMode) ? initialMode : DEFAULT_DELIVERY_MODE);

  const options: Array<{
    id: CourseDeliveryMode;
    titleEn: string;
    titleAm: string;
    badgeEn: string;
    badgeAm: string;
    descriptionEn: string;
    descriptionAm: string;
    icon: typeof Globe2;
    featuresEn: string[];
    featuresAm: string[];
    accentColor: string;
    badgeBg: string;
  }> = [
    {
      id: 'ONLINE_ONLY',
      titleEn: 'Online Self-Paced',
      titleAm: 'የመስመር ላይ (ራስ-አገዝ)',
      badgeEn: 'Recommended',
      badgeAm: 'ተመራጭ',
      descriptionEn:
        'Learners study at their own pace using video streams, rich documents, downloadable attachments, and automated quizzes.',
      descriptionAm:
        'ሰልጣኞች በራሳቸው ፍጥነት በቪዲዮ፣ በሰነዶች እና በራስ-ሰር በሚታረሙ ፈተናዎች አማካኝነት ይማራሉ።',
      icon: Globe2,
      featuresEn: [
        'Module-by-module linear progression',
        'Automated checkpoint & final quizzes',
        'Instant digital completion certificates',
      ],
      featuresAm: [
        'ደረጃ በደረጃ የሞዱሎች ቅደም ተከተል',
        'ራስ-ሰር የፈተና ውጤት እና ማለፊያ',
        'ወዲያውኑ የሚወርድ ዲጂታል ሰርተፊኬት',
      ],
      accentColor: 'indigo',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    },
    {
      id: 'IN_PERSON_ONLY',
      titleEn: 'In-Person Classroom',
      titleAm: 'በአካል በክፍል ውስጥ',
      badgeEn: 'Physical Venues',
      badgeAm: 'በስልጠና ማዕከል',
      descriptionEn:
        'Held at designated Ministry of Revenues training venues and regional branches with scheduled sessions, physical attendance, and classroom practicals.',
      descriptionAm:
        'በገቢዎች ሚኒስቴር የስልጠና አዳራሾች ወይም በቅርንጫፎች በአካል የሚሰጥ ስልጠና፤ የመገኘት ምዝገባን እና የክፍል ውስጥ ልምምድን ያካትታል።',
      icon: Building2,
      featuresEn: [
        'Venue & room booking integration',
        'QR code and PIN attendance tracking',
        'On-site trainer evaluation & grading',
      ],
      featuresAm: [
        'የስልጠና አዳራሽ እና ቦታ መመደብ',
        'በQR ኮድ እና በPIN የመገኘት ምዝገባ',
        'በአሰልጣኙ የሚደረግ ቀጥተኛ ግምገማ',
      ],
      accentColor: 'amber',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/60',
    },
    {
      id: 'BOTH',
      titleEn: 'Hybrid / Blended Learning',
      titleAm: 'ድብልቅ ስልጠና (ኦንላይን እና በአካል)',
      badgeEn: 'Blended',
      badgeAm: 'ድብልቅ',
      descriptionEn:
        'The best of both worlds. Learners complete digital self-paced preparation modules and attend scheduled live virtual or in-person workshops.',
      descriptionAm:
        'ሁለቱንም ያጣመረ ተመራጭ ዘዴ። ሰልጣኞች ዲጂታል ዝግጅትን በኦንላይን አጠናቀው በታቀዱ የቀጥታ የቪዲዮ ወይም የአካል ውይይቶች ይሳተፋሉ።',
      icon: Layers,
      featuresEn: [
        'Full self-paced digital modules',
        'Virtual sessions (LiveKit/Zoom) or venue classes',
        'Comprehensive assessment & official certification',
      ],
      featuresAm: [
        'ሙሉ የኦንላይን የሞዱል ይዘቶች',
        'የቀጥታ ስርጭት ወይም የአካል አውደ ጥናቶች',
        'የተሟላ ምዘና እና ይፋዊ ሰርተፊኬት',
      ],
      accentColor: 'emerald',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    },
  ];

  const handleConfirm = () => {
    onSelect(selected);
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={tBilingual('Select Course Delivery Format', 'የኮርሱን አሰጣጥ ዘዴ ይምረጡ')}
      subtitle={tBilingual(
        'Choose how learners will experience this course. You can fine-tune sessions and scheduling at any time.',
        'ሰልጣኞች ይህንን ኮርስ እንዴት እንደሚማሩ ይምረጡ። የክፍለ-ጊዜ እና የቦታ መርሃ-ግብርን በማንኛውም ጊዜ ማስተካከል ይችላሉ።',
      )}
      size="xl"
    >
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.map((opt) => {
            const enabled = isDeliveryModeEnabled(opt.id);
            const isSelected = enabled && selected === opt.id;
            const Icon = opt.icon;
            const select = () => enabled && setSelected(opt.id);

            return (
              <div
                key={opt.id}
                role="button"
                tabIndex={enabled ? 0 : -1}
                aria-disabled={!enabled}
                aria-pressed={isSelected}
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select();
                  }
                }}
                className={cn(
                  'relative rounded-2xl border p-5 text-left transition flex flex-col justify-between group',
                  !enabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 grayscale'
                    : isSelected
                      ? 'cursor-pointer border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md'
                      : 'cursor-pointer border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/50 shadow-2xs',
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl transition',
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-700',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                          enabled ? opt.badgeBg : 'bg-slate-100 text-slate-500 border-slate-200',
                        )}
                      >
                        {enabled ? tBilingual(opt.badgeEn, opt.badgeAm) : tBilingual('Coming soon', 'በቅርቡ')}
                      </span>
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-3.5 text-base font-bold text-slate-900">
                    {tBilingual(opt.titleEn, opt.titleAm)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {tBilingual(opt.descriptionEn, opt.descriptionAm)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  {(isAmharic ? opt.featuresAm : opt.featuresEn).map(
                    (feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            {tBilingual('Cancel', 'ይቅር')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 shadow-md shadow-indigo-600/20"
          >
            {tBilingual('Continue to Studio', 'ወደ ስቱዲዮ ይቀጥሉ')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
