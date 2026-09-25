import { api } from './client';
import type { ApiDashboardStats, ApiLandingStats } from './types';

/* -------------------------------------------------------------------------- */
/*  Public landing page                                                         */
/* -------------------------------------------------------------------------- */

export async function fetchLandingStats(): Promise<ApiLandingStats> {
  return api<ApiLandingStats>('public/landing-stats');
}

/* -------------------------------------------------------------------------- */
/*  Admin dashboard                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchDashboardStats(
  params: { from?: string; to?: string } = {},
): Promise<ApiDashboardStats> {
  return api<ApiDashboardStats>('admin/dashboard/stats', { query: params });
}
