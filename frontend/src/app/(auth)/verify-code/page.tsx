import { Suspense } from 'react';
import VerifyCodeForm from './VerifyCodeForm';

export const metadata = {
  title: 'Enter Code · MoR Learning Management System',
};

export default function VerifyCodePage() {
  return (
    <Suspense fallback={null}>
      <VerifyCodeForm />
    </Suspense>
  );
}
