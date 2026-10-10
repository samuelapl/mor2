import { Suspense } from 'react';
import VerifyEmailForm from './VerifyEmailForm';

export const metadata = {
  title: 'Verify Email · MoR Learning Management System',
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
