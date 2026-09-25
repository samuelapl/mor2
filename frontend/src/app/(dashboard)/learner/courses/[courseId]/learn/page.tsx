'use client';

import { useParams } from 'next/navigation';
import { ClassroomShell } from '@/components/features/classroom/ClassroomShell';

interface LearnPageProps {
  params: {
    courseId: string;
  };
}

export default function LearnCoursePage({ params }: LearnPageProps) {
  const routeParams = useParams();
  const courseId = (params?.courseId as string) || (routeParams?.courseId as string) || '';

  if (!courseId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
        Course ID is missing.
      </div>
    );
  }

  return <ClassroomShell courseId={courseId} />;
}
