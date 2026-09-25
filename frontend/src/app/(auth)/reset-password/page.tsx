import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata = {
  title: 'Reset Password · MoR Learning Management System',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
