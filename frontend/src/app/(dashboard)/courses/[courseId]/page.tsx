'use client';

import { useParams } from 'next/navigation';
import { CourseReviewShell } from '@/components/features/courses/review/CourseReviewShell';

export default function CourseReviewPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || '';

  if (!courseId) {
    return <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">Course ID is missing.</div>;
  }

  return <CourseReviewShell courseId={courseId} />;
}
