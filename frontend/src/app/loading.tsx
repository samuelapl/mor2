import { PageLoader } from '@/components/ui/Spinner';

// Shown by Next.js while pages outside the dashboard (login, registration, …) load.
export default function RootLoading() {
  return <PageLoader fullScreen />;
}
