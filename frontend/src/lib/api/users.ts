import { api } from "./client";
import type {
  ApiPaginated,
  ApiUser,
  AssignRoleBody,
  BackendApprovalStatus,
  BackendRoleName,
  BulkCreateUserItem,
  BulkCreateUsersResult,
  CreateActorBody,
  CreateActorResult,
} from "./types";

export async function fetchUsers(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    registrationStatus?: BackendApprovalStatus;
  } = {},
): Promise<ApiPaginated<ApiUser>> {
  return api<ApiPaginated<ApiUser>>("users", {
    query: {
      ...params,
      limit: params.limit ?? 100,
    } as Record<string, string | number | boolean | undefined>,
  });
}

/** Active trainers only, for a trainer-assignment picker — narrower than fetchUsers, callable by anyone holding course.assign_trainer. */
export async function fetchTrainers(): Promise<ApiPaginated<ApiUser>> {
  return api<ApiPaginated<ApiUser>>("users/trainers");
}

export async function approveRegistration(
  userId: string,
): Promise<{ message: string; user: ApiUser }> {
  return api<{ message: string; user: ApiUser }>(`users/${userId}/approve-registration`, {
    method: "POST",
  });
}

export async function rejectRegistration(
  userId: string,
  reason?: string,
): Promise<{ message: string; user: ApiUser }> {
  return api<{ message: string; user: ApiUser }>(`users/${userId}/reject-registration`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export async function assignRole(
  userId: string,
  role: BackendRoleName,
): Promise<unknown> {
  const body: AssignRoleBody = { userId, role };
  return api<unknown>("users/assign-role", { method: "POST", body });
}

export async function removeRole(
  userId: string,
  role: BackendRoleName,
): Promise<unknown> {
  return api<unknown>(`users/${userId}/roles/${role}`, { method: "DELETE" });
}

export async function deactivateUser(userId: string): Promise<unknown> {
  return api<unknown>(`users/${userId}/deactivate`, { method: "POST" });
}

/** Bulk-creates users from a spreadsheet import (idempotent by email). */
export async function bulkCreateUsers(
  rows: BulkCreateUserItem[],
): Promise<BulkCreateUsersResult> {
  return api<BulkCreateUsersResult>("users/bulk", { method: "POST", body: { users: rows } });
}

/** Manually registers a single actor — created pre-approved and active, no queue. */
export async function createActor(body: CreateActorBody): Promise<CreateActorResult> {
  return api<CreateActorResult>("users/actors", { method: "POST", body });
}
