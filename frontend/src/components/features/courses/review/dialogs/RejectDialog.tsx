'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { RichTextArea } from '@/components/ui/RichTextArea';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  courseLabel: string;
  busy: boolean;
  /** Resolves to null on success or an error message to show under the field. */
  onConfirm: (reason: string) => Promise<string | null>;
}

export function RejectDialog({ open, onClose, courseLabel, busy, onConfirm }: RejectDialogProps) {
  const { tBilingual } = useTranslation();
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
      title={tBilingual('Reject course', 'ኮርስ ውድቅ አድርግ')}
      subtitle={courseLabel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tBilingual('Cancel', 'ሰርዝ')}
          </Button>
          <Button variant="danger" disabled={!reason.trim() || busy} onClick={() => void confirm()}>
            {busy ? tBilingual('Rejecting…', 'ውድቅ በማድረግ ላይ…') : tBilingual('Confirm Reject', 'ውድቅ ማድረግ አረጋግጥ')}
          </Button>
        </>
      }
    >
      <RichTextArea
        id="courseRejectReason"
        label={tBilingual('Reason for rejection', 'ውድቅ የተደረገበት ምክንያት')}
        required
        rows={3}
        value={reason}
        onChange={(val) => {
          setReason(val);
          setError(null);
        }}
        placeholder={tBilingual(
          'Explain why this course is rejected. The course owner is notified with this reason and the course moves back to draft...',
          'ይህ ኮርስ ለምን ውድቅ እንደተደረገ ያብራሩ። ለኮርሱ ባለቤት ማሳወቂያ ይላካል እና ኮርሱ ወደ ረቂቅ ይመለሳል...',
        )}
        error={error}
      />
    </Modal>
  );
}
