import { api } from "./client";

export interface ApiCoursePolicy {
  id: string;
  timeSpentPercent: number;
  retakeCooldownMinutes: number;
  updatedAt: string;
  updatedBy: string | null;
}

export async function fetchCoursePolicy(): Promise<ApiCoursePolicy> {
  return api<ApiCoursePolicy>("policy");
}

export async function updateCoursePolicy(body: {
  timeSpentPercent?: number;
  retakeCooldownMinutes?: number;
}): Promise<ApiCoursePolicy> {
  return api<ApiCoursePolicy>("policy", { method: "PATCH", body });
}
