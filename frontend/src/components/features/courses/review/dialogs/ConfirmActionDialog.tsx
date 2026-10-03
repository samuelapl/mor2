'use client';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface ConfirmActionDialogProps {
  action: 'archive' | 'delete' | null;
  courseTitle: string;
  busy: boolean;
  onConfirm: (action: 'archive' | 'delete') => void;
  onClose: () => void;
}

/** Shared confirmation for the destructive course actions. */
export function ConfirmActionDialog({ action, courseTitle, busy, onConfirm, onClose }: ConfirmActionDialogProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const isDelete = action === 'delete';

  const title = isDelete ? tBilingual('Delete Course', 'ኮርስ ሰርዝ') : tBilingual('Archive Course', 'ኮርስ አስቀምጥ');
  const description = isDelete
    ? isAmharic
      ? `"${courseTitle}" ይሰረዝ? ይህ እርምጃ ሊቀለበስ አይችልም እና ሁሉንም ተያያዥ ይዘቶች በቋሚነት ያስወግዳል።`
      : `Delete "${courseTitle}"? This action cannot be undone and will permanently remove all associated course content.`
    : isAmharic
      ? `"${courseTitle}" ወደ ማህደር ይቀመጥ? ከንቁ ካታሎግ ይወጣል።`
      : `Archive "${courseTitle}"? It will move out of the active catalog.`;

  return (
    <ConfirmModal
      open={action !== null}
      title={title}
      description={description}
      confirmText={title}
      variant={isDelete ? 'danger' : 'warning'}
      isLoading={busy}
      onConfirm={() => {
        if (action) onConfirm(action);
      }}
      onClose={() => !busy && onClose()}
    />
  );
}
