'use client';

import { useState } from 'react';
import {
  Building2,
  Check,
  Globe2,
  Radio,
  Sparkles,
  Users2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { NamespaceKey } from '@/lib/i18n';
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
  const { isAmharic, t } = useTranslation('courses');
  const [selected, setSelected] = useState<CourseDeliveryMode>(isDeliveryModeEnabled(initialMode) ? initialMode : DEFAULT_DELIVERY_MODE);

  const options: Array<{
    id: CourseDeliveryMode;
    titleKey: NamespaceKey<'courses'>;
    badgeKey: NamespaceKey<'courses'>;
    descriptionKey: NamespaceKey<'courses'>;
    icon: typeof Globe2;
    featuresKeys: NamespaceKey<'courses'>[];
    accentColor: string;
    badgeBg: string;
  }> = [
    {
      id: 'ONLINE_ONLY',
      titleKey: 'deliveryFormatModal.onlineSelfPaced',
      badgeKey: 'courseDetailsStage.recommended',
      descriptionKey: 'deliveryFormatModal.learnersStudyAtTheirOwnPace',
      icon: Globe2,
      featuresKeys: ['deliveryFormatModal.moduleByModuleLinearProgression', 'deliveryFormatModal.automatedCheckpointFinalQuizzes', 'deliveryFormatModal.instantDigitalCompletionCertificates'],
      accentColor: 'indigo',
      badgeBg: 'bg-primary-soft text-primary border-primary/20',
    },
    {
      id: 'IN_PERSON_ONLY',
      titleKey: 'deliveryFormatModal.inPersonClassroom',
      badgeKey: 'deliveryFormatModal.physicalVenues',
      descriptionKey: 'deliveryFormatModal.heldAtDesignatedMinistryOfRevenues',
      icon: Building2,
      featuresKeys: ['deliveryFormatModal.venueRoomBookingIntegration', 'deliveryFormatModal.qrCodeAndPinAttendanceTracking', 'deliveryFormatModal.onSiteTrainerEvaluationGrading'],
      accentColor: 'amber',
      badgeBg: 'bg-warning-soft text-warning border-warning/20',
    },
  ];

  const handleConfirm = () => {
    onSelect(selected);
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('deliveryFormatModal.selectCourseDeliveryFormat')}
      subtitle={t('deliveryFormatModal.chooseHowLearnersWillExperienceThis')}
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
                    ? 'cursor-not-allowed border-border bg-muted opacity-60 grayscale'
                    : isSelected
                      ? 'cursor-pointer border-primary bg-primary-soft/30 ring-2 ring-ring/20 shadow-md'
                      : 'cursor-pointer border-border bg-card hover:border-primary/30 hover:bg-muted/50 shadow-2xs',
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl transition',
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'bg-secondary text-secondary-foreground group-hover:bg-primary-soft group-hover:text-primary',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                          enabled ? opt.badgeBg : 'bg-secondary text-muted-foreground border-border',
                        )}
                      >
                        {enabled ? t(opt.badgeKey) : t('deliveryFormatModal.comingSoon')}
                      </span>
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-input bg-card',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-3.5 text-base font-bold text-foreground">
                    {t(opt.titleKey)}
                  </h3>
                  <p className="mt-1 text-xs text-secondary-foreground leading-relaxed">
                    {t(opt.descriptionKey)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
                  {opt.featuresKeys.map(
                    (feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-center gap-1.5 text-[11px] text-secondary-foreground font-medium"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span>{t(feat)}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border/80 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            {t('deliveryFormatModal.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 shadow-md shadow-indigo-600/20"
          >
            {t('deliveryFormatModal.continueToStudio')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
