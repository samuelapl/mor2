'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Course, CourseDeliveryMode } from '@/types';
import { DeliveryFormatModal } from './creator/modal/DeliveryFormatModal';
import { CourseCreatorShell } from './creator/CourseCreatorShell';

export interface CourseCreationWizardProps {
  onDone: () => void;
  onCancel: () => void;
  /** When provided the wizard runs in edit mode for an existing draft/rejected course. */
  editingCourse?: Course | null;
}

export function CourseCreationWizard({ onDone, onCancel, editingCourse }: CourseCreationWizardProps) {
  // If editing an existing course, we bypass format selection modal
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(!editingCourse);
  const [deliveryMode, setDeliveryMode] = useState<CourseDeliveryMode>(editingCourse?.deliveryMode ?? 'BOTH');

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

/**
 * Every consumer mounts the wizard inside a dialog, so the studio is lifted to
 * <body> as a full-screen layer to escape the dialog's chrome and scroll container.
 */
function StudioPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!mounted) return null;
  return createPortal(<div className="fixed inset-0 z-[100] bg-slate-50">{children}</div>, document.body);
}
