'use client';

import { useCourseStore } from '@/lib/stores/course-store';
import PageShell from '@/components/shared/PageShell';
import { EnrollmentForm } from '@/components/features/enroll/EnrollmentForm';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function EnrollmentsPage() {
  const courses = useCourseStore((s) => s.courses);
  const { t } = useTranslation('dashboard');

  return (
    <PageShell
      role="training_admin"
      title={t('enrollmentsPage.courseEnrolledStudentsRoster')}
      description={t('enrollmentsPage.inspectEnrolledLearnersTrackRealTime')}
    >
      <EnrollmentForm />
    </PageShell>
  );
}
