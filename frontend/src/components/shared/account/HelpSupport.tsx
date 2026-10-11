'use client';

import { useState } from 'react';
import { ChevronDown, Keyboard, Mail, Phone } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface HelpSupportProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpSupport({ open, onClose }: HelpSupportProps) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const { t } = useTranslation('common');

  const faqs = [
    {
      q: t('helpSupport.howDoIResetMyPassword'),
      a: t('helpSupport.openAccountSecurityAndEnterYour'),
    },
    {
      q: t('helpSupport.howDoISwitchTheInterface'),
      a: t('helpSupport.openAccountPreferencesAndChooseEnglish'),
    },
    {
      q: t('helpSupport.whoApprovesNewRegistrations'),
      a: t('helpSupport.aSystemAdministratorOrTrainingAdministra'),
    },
    {
      q: t('helpSupport.howDoIGetACourse'),
      a: t('helpSupport.certificatesAreIssuedAutomaticallyOnceYo'),
    },
  ];

  const shortcuts = [
    {
      keys: 'Esc',
      action: t('helpSupport.closeTheOpenModalOrPanel'),
    },
    {
      keys: 'Ctrl / Cmd + K',
      action: t('helpSupport.focusTheSearchBarWhereAvailable'),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('accountMenu.helpSupport')}
      subtitle={t('helpSupport.faqsContactInformationAndShortcuts')}
      size="lg"
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            {t('helpSupport.frequentlyAskedQuestions')}
          </h3>
          <div className="divide-y divide-border/60 rounded-xl border border-border">
            {faqs.map((item, index) => (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === index ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-secondary-foreground hover:bg-muted"
                >
                  {item.q}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-subtle-foreground transition-transform',
                      expanded === index && 'rotate-180',
                    )}
                  />
                </button>
                {expanded === index ? (
                  <p className="px-4 pb-3 text-sm text-muted-foreground">{item.a}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            {t('helpSupport.contactSupport')}
          </h3>
          <div className="space-y-2 rounded-xl border border-border bg-muted/60 p-4 text-sm text-secondary-foreground">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-subtle-foreground" /> support@mor.gov.et
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-subtle-foreground" /> +251 11 000 0000
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            <Keyboard className="h-3.5 w-3.5" />{' '}
            {t('helpSupport.keyboardShortcuts')}
          </h3>
          <div className="divide-y divide-border/60 rounded-xl border border-border">
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{s.action}</span>
                <kbd className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-subtle-foreground">
          {t('helpSupport.morLearningManagementSystemV10')}
        </p>
      </div>
    </Modal>
  );
}
