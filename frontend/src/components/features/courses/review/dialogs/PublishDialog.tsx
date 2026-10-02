'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { User } from '@/types';

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  courseLabel: string;
  trainerOptions: User[];
  busy: boolean;
  /** Assigns the trainer, then publishes. Resolves true when both succeed. */
  onAssignAndPublish: (trainerId: string) => Promise<boolean>;
}

/** Shown when publishing a course that has no trainer yet. */
export function PublishDialog({ open, onClose, courseLabel, trainerOptions, busy, onAssignAndPublish }: PublishDialogProps) {
  const { tBilingual } = useTranslation();
  const [trainerId, setTrainerId] = useState('');

  useEffect(() => {
    if (open) setTrainerId('');
  }, [open]);

  const confirm = async () => {
    if (await onAssignAndPublish(trainerId)) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tBilingual('Assign a trainer to publish', 'ለማተም አሰልጣኝ ይመድቡ')}
      subtitle={courseLabel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tBilingual('Cancel', 'ሰርዝ')}
          </Button>
          <Button variant="primary" disabled={!trainerId || busy} onClick={() => void confirm()}>
            {tBilingual('Assign & Publish', 'መድብ እና አትም')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          {tBilingual('This course needs a trainer assigned before it can be published to learners.', 'ይህ ኮርስ ለሰልጣኞች ከመታተሙ በፊት አሰልጣኝ መመደብ አለበት።')}
        </p>
        <select
          value={trainerId}
          onChange={(event) => setTrainerId(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 shadow-xs outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
        >
          <option value="">
            {trainerOptions.length ? tBilingual('Select a trainer…', 'አሰልጣኝ ይምረጡ…') : tBilingual('No trainers available', 'ምንም አሰልጣኞች የሉም')}
          </option>
          {trainerOptions.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {trainer.name} ({trainer.email})
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}
