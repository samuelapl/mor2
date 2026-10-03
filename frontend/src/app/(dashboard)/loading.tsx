import { PageLoader } from '@/components/ui/Spinner';

// Shown by Next.js while any dashboard page loads; the sidebar and header stay in place.
export default function DashboardLoading() {
  return <PageLoader />;
}
