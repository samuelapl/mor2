"use client";

import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";
import type { Course } from "@/types";

interface EditCourseModalProps {
  open: boolean;
  onClose: () => void;
  course: Course | null;
}

export function EditCourseModal({ open, onClose, course }: EditCourseModalProps) {
  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={`Edit Course: ${course?.title ?? ""}`}
      subtitle={`${course?.code ?? ""} · Update curriculum, objectives, materials, and assessment`}
    >
      <div className="mx-auto max-w-5xl">
        {course ? (
          <CourseCreationWizard
            key={course.id}
            editingCourse={course}
            onDone={onClose}
            onCancel={onClose}
          />
        ) : null}
      </div>
    </WorkspaceDetailOverlay>
  );
}