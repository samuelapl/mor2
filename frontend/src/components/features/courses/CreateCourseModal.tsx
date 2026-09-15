"use client";

import { Modal } from "@/components/ui/Modal";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";

interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCourseModal({ open, onClose }: CreateCourseModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Create New Course"
      subtitle="Add course details, attach materials, and build the final assessment."
    >
      <CourseCreationWizard onDone={onClose} onCancel={onClose} />
    </Modal>
  );
}
