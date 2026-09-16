import { api } from "./client";
import type { ApiPermissionsByResource, ApiRoleWithPermissions } from "./types";

export async function fetchPermissionsRegistry(): Promise<ApiPermissionsByResource> {
  return api<ApiPermissionsByResource>("admin/permissions");
}

export async function fetchRolesWithPermissions(): Promise<ApiRoleWithPermissions[]> {
  return api<ApiRoleWithPermissions[]>("admin/roles");
}

export async function setRolePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<ApiRoleWithPermissions> {
  return api<ApiRoleWithPermissions>(`admin/roles/${roleId}/permissions`, {
    method: "POST",
    body: { permissionIds },
  });
}

export async function revokeRolePermission(
  roleId: string,
  permissionId: string,
): Promise<ApiRoleWithPermissions> {
  return api<ApiRoleWithPermissions>(`admin/roles/${roleId}/permissions/${permissionId}`, {
    method: "DELETE",
  });
}

export async function createRole(input: {
  name: string;
  label: string;
  description?: string;
}): Promise<ApiRoleWithPermissions> {
  return api<ApiRoleWithPermissions>("admin/roles", { method: "POST", body: input });
}

export async function deleteRole(roleId: string): Promise<{ message: string }> {
  return api<{ message: string }>(`admin/roles/${roleId}`, { method: "DELETE" });
}
