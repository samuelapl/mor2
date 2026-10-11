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
  const { isAmharic, t } = useTranslation('courses');
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
    ? t('confirmActionDialog.deleteCourse')
    : t('confirmActionDialog.archiveCourse');

  const learnerNotice =
    learnerCount !== null && learnerCount > 0 ? t('confirmActionDialog.learnerNotice', { learnerCount }) : '';

  const description = isDelete
    ? t('confirmActionDialog.deleteConfirm', { courseTitle, learnerNotice })
    : t('confirmActionDialog.archiveItWillMoveOutOf', { courseTitle });

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
