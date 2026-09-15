import { api } from "./client";
import type { ApiDashboardStats } from "./types";

/* -------------------------------------------------------------------------- */
/*  Admin dashboard                                                             */
/* -------------------------------------------------------------------------- */

export async function fetchDashboardStats(
  params: { from?: string; to?: string } = {},
): Promise<ApiDashboardStats> {
  return api<ApiDashboardStats>("admin/dashboard/stats", { query: params });
}