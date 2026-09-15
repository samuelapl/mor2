"use client";

import { Modal } from "@/components/ui/Modal";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";
import type { Course } from "@/types";

interface EditCourseModalProps {
  open: boolean;
  onClose: () => void;
  course: Course | null;
}

export function EditCourseModal({ open, onClose, course }: EditCourseModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="screen"
      title="Edit Course"
      subtitle="Update the course details, curriculum, materials, and assessment before resubmitting for approval."
    >
      {course ? (
        <CourseCreationWizard
          key={course.id}
          editingCourse={course}
          onDone={onClose}
          onCancel={onClose}
        />
      ) : null}
    </Modal>
  );
}