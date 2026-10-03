'use client';

import { useState } from 'react';
import type { Course, CourseDeliveryMode } from '@/types';
import { DeliveryFormatModal } from './creator/modal/DeliveryFormatModal';
import { CourseCreatorShell } from './creator/CourseCreatorShell';
import { DEFAULT_DELIVERY_MODE } from '@/constants/delivery-modes';
import { StudioPortal } from '@/components/shared/StudioPortal';

export interface CourseCreationWizardProps {
  onDone: () => void;
  onCancel: () => void;
  /** When provided the wizard runs in edit mode for an existing draft/rejected course. */
  editingCourse?: Course | null;
}

export function CourseCreationWizard({ onDone, onCancel, editingCourse }: CourseCreationWizardProps) {
  // If editing an existing course, we bypass format selection modal
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(!editingCourse);
  const [deliveryMode, setDeliveryMode] = useState<CourseDeliveryMode>(editingCourse?.deliveryMode ?? DEFAULT_DELIVERY_MODE);

  if (showDeliveryModal && !editingCourse) {
    return (
      <DeliveryFormatModal
        open={showDeliveryModal}
        initialMode={deliveryMode}
        onSelect={(mode) => {
          setDeliveryMode(mode);
          setShowDeliveryModal(false);
        }}
        onCancel={onCancel}
      />
    );
  }

  return (
    <StudioPortal>
      <CourseCreatorShell onDone={onDone} onCancel={onCancel} editingCourse={editingCourse} initialDeliveryMode={deliveryMode} />
    </StudioPortal>
  );
}
