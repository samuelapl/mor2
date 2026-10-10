'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { useTranslation } from '@/lib/i18n/useTranslation';

type ReasonDialogMode = 'reject' | 'returnToDraft';

type Bilingual = { en: string; am: string };

const COPY: Record<ReasonDialogMode, { title: Bilingual; label: Bilingual; placeholder: Bilingual; confirm: Bilingual; busy: Bilingual }> = {
  reject: {
    title: { en: 'Reject course', am: 'ኮርስ ውድቅ አድርግ' },
    label: { en: 'Reason for rejection', am: 'ውድቅ የተደረገበት ምክንያት' },
    placeholder: {
      en: 'Explain why this course is rejected. The course owner is notified with this reason and the course moves back to draft...',
      am: 'ይህ ኮርስ ለምን ውድቅ እንደተደረገ ያብራሩ። ለኮርሱ ባለቤት ማሳወቂያ ይላካል እና ኮርሱ ወደ ረቂቅ ይመለሳል...',
    },
    confirm: { en: 'Confirm Reject', am: 'ውድቅ ማድረግ አረጋግጥ' },
    busy: { en: 'Rejecting…', am: 'ውድቅ በማድረግ ላይ…' },
  },
  returnToDraft: {
    title: { en: 'Return course to draft', am: 'ኮርሱን ወደ ረቂቅ መልስ' },
    label: { en: 'What needs to change', am: 'መስተካከል ያለበት' },
    placeholder: {
      en: 'Explain what the owner should change or add (for example, online sessions). The approval is withdrawn, the owner is notified with this reason, and the course must be resubmitted for approval...',
      am: 'ባለቤቱ ምን ማስተካከል ወይም መጨመር እንዳለበት ያብራሩ (ለምሳሌ የኦንላይን ክፍለ ጊዜዎች)። ማጽደቁ ይሰረዛል፣ ለባለቤቱ በዚህ ምክንያት ማሳወቂያ ይላካል፣ ኮርሱም ለማጽደቅ በድጋሚ መላክ አለበት...',
    },
    confirm: { en: 'Return to draft', am: 'ወደ ረቂቅ መልስ' },
    busy: { en: 'Returning…', am: 'በመመለስ ላይ…' },
  },
};

interface RejectDialogProps {
  open: boolean;
  /** `reject`: decline a submission under review. `returnToDraft`: withdraw an approval. Defaults to `reject`. */
  mode?: ReasonDialogMode;
  onClose: () => void;
  courseLabel: string;
  busy: boolean;
  /** Resolves to null on success or an error message to show under the field. */
  onConfirm: (reason: string) => Promise<string | null>;
}

export function RejectDialog({ open, mode = 'reject', onClose, courseLabel, busy, onConfirm }: RejectDialogProps) {
  const { tBilingual } = useTranslation();
  const copy = COPY[mode];
  const t = (text: Bilingual) => tBilingual(text.en, text.am);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const confirm = async () => {
    const err = await onConfirm(reason);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(copy.title)}
      subtitle={courseLabel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tBilingual('Cancel', 'ሰርዝ')}
          </Button>
          <Button variant="danger" disabled={!reason.trim() || busy} onClick={() => void confirm()}>
            {busy ? t(copy.busy) : t(copy.confirm)}
          </Button>
        </>
      }
    >
      <TextArea
        id="courseRejectReason"
        label={t(copy.label)}
        required
        rows={3}
        value={reason}
        onChange={(val) => {
          setReason(val);
          setError(null);
        }}
        placeholder={t(copy.placeholder)}
        error={error}
      />
    </Modal>
  );
}
