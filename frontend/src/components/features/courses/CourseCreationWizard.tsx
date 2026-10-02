'use client';

import React, { useState } from 'react';
import type { Course, CourseDeliveryMode } from '@/types';
import { DeliveryFormatModal } from './creator/modal/DeliveryFormatModal';
import { CourseCreatorShell } from './creator/CourseCreatorShell';

export interface CourseCreationWizardProps {
  onDone: () => void;
  onCancel: () => void;
  /** When provided the wizard runs in edit mode for an existing draft/rejected course. */
  editingCourse?: Course | null;
}

export function CourseCreationWizard({
  onDone,
  onCancel,
  editingCourse,
}: CourseCreationWizardProps) {
  // If editing an existing course, we bypass format selection modal
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(!editingCourse);
  const [deliveryMode, setDeliveryMode] = useState<CourseDeliveryMode>(
    editingCourse?.deliveryMode ?? 'BOTH',
  );

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
    <CourseCreatorShell
      onDone={onDone}
      onCancel={onCancel}
      editingCourse={editingCourse}
      initialDeliveryMode={deliveryMode}
    />
  );
}
