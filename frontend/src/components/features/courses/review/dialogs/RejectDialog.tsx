'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import type { NamespaceKey } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';

type ReasonDialogMode = 'reject' | 'returnToDraft';

type CopyKey = NamespaceKey<'courses'>;

const COPY: Record<ReasonDialogMode, { title: CopyKey; label: CopyKey; placeholder: CopyKey; confirm: CopyKey; busy: CopyKey }> = {
  reject: {
    title: 'rejectDialog.rejectCourse',
    label: 'rejectDialog.reasonForRejection',
    placeholder: 'rejectDialog.explainWhyThisCourseIsRejected',
    confirm: 'rejectDialog.confirmReject',
    busy: 'rejectDialog.rejecting',
  },
  returnToDraft: {
    title: 'rejectDialog.returnCourseToDraft',
    label: 'rejectDialog.whatNeedsToChange',
    placeholder: 'rejectDialog.explainWhatTheOwnerShouldChange',
    confirm: 'reviewHeader.returnToDraft',
    busy: 'rejectDialog.returning',
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
  const { t } = useTranslation('courses');
  const copy = COPY[mode];
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
            {t('rejectDialog.cancel')}
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
