'use client';

import { useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { fetchCourseEnrollmentCount } from '@/lib/api/courses';

interface ConfirmActionDialogProps {
  action: 'archive' | 'delete' | null;
  courseTitle: string;
  courseId?: string;
  busy: boolean;
  onConfirm: (action: 'archive' | 'delete') => void;
  onClose: () => void;
}

/** Shared confirmation for the destructive course actions. */
export function ConfirmActionDialog({
  action,
  courseTitle,
  courseId,
  busy,
  onConfirm,
  onClose,
}: ConfirmActionDialogProps) {
  const { tBilingual, isAmharic } = useTranslation();
  const isDelete = action === 'delete';
  const [learnerCount, setLearnerCount] = useState<number | null>(null);

  useEffect(() => {
    if (isDelete && courseId) {
      let alive = true;
      fetchCourseEnrollmentCount(courseId)
        .then((count) => {
          if (alive) setLearnerCount(count);
        })
        .catch(() => {
          if (alive) setLearnerCount(null);
        });
      return () => {
        alive = false;
      };
    } else {
      setLearnerCount(null);
    }
  }, [isDelete, courseId]);

  const title = isDelete
    ? tBilingual('Delete Course', 'ኮርስ ሰርዝ')
    : tBilingual('Archive Course', 'ኮርስ አስቀምጥ');

  const learnerNoticeEn =
    learnerCount !== null && learnerCount > 0
      ? ` ⚠️ Notice: This course currently has ${learnerCount} enrolled learner(s). Confirming this deletion will automatically delete and cancel all learner enrollments for this course.`
      : '';

  const learnerNoticeAm =
    learnerCount !== null && learnerCount > 0
      ? ` ⚠️ ማሳሰቢያ፦ ይህ ኮርስ በአሁኑ ወቅት ${learnerCount} የተመዘገቡ ተማሪዎች አሉት። ኮርሱን መሰረዝ የተማሪዎቹን ምዝገባ በራስ-ሰር ይሰርዛል።`
      : '';

  const description = isDelete
    ? isAmharic
      ? `"${courseTitle}" ይሰረዝ? ይህ እርምጃ ሊቀለበስ አይችልም እና ሁሉንም ተያያዥ ይዘቶች በቋሚነት ያስወግዳል።${learnerNoticeAm}`
      : `Delete "${courseTitle}"? This action cannot be undone and will permanently remove all associated course content.${learnerNoticeEn}`
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
