"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ViewToggle, type ViewMode } from "@/components/ui/ViewToggle";
import {
  createRole,
  deleteRole,
  fetchPermissionsRegistry,
  fetchRolesWithPermissions,
  setRolePermissions,
} from "@/lib/api/permissions";
import { ApiError } from "@/lib/api/client";
import type { ApiPermission, ApiPermissionsByResource, ApiRoleWithPermissions } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function humanizeResource(resource: string): string {
  return resource
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  return Array.from(a).every((item) => b.has(item));
}

export default function RolesPermissionsPage() {
  const { currentUser, refreshPermissions } = useLms();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roles, setRoles] = useState<ApiRoleWithPermissions[]>([]);
  const [registry, setRegistry] = useState<ApiPermissionsByResource>({});
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const allPermissions = useMemo<ApiPermission[]>(
    () => Object.values(registry).flat(),
    [registry],
  );
  const idByCode = useMemo(
    () => new Map(allPermissions.map((p) => [p.code, p.id])),
    [allPermissions],
  );
  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (a.name === "SYSTEM_ADMIN") return 1;
        if (b.name === "SYSTEM_ADMIN") return -1;
        return a.label.localeCompare(b.label);
      }),
    [roles],
  );

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [reg, roleList] = await Promise.all([
        fetchPermissionsRegistry(),
        fetchRolesWithPermissions(),
      ]);
      setRegistry(reg);
      setRoles(roleList);
      setSelectedRoleId((current) => current ?? roleList[0]?.id ?? null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load the permission matrix.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    const role = roles.find((r) => r.id === selectedRoleId);
    if (!role) return;
    const ids = new Set(
      role.permissionCodes
        .map((code) => idByCode.get(code))
        .filter((id): id is string => Boolean(id)),
    );
    setSavedIds(ids);
    setDraftIds(new Set(ids));
  }, [selectedRoleId, roles, idByCode]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const isLocked = selectedRole?.name === "SYSTEM_ADMIN";
  const isDirty = !isLocked && !sameSet(draftIds, savedIds);

  const toggle = (permissionId: string) => {
    if (isLocked) return;
    setDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setFlash(null);
    try {
      const updated = await setRolePermissions(selectedRole.id, Array.from(draftIds));
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      // Refresh our own session too, in case the edited role is the signed-in admin's own —
      // the sidebar and gated pages should react without a re-login.
      void refreshPermissions();
      setFlash({
        type: "success",
        message: `${selectedRole.label} updated — changes take effect for signed-in users within about 15 seconds, no re-login needed.`,
      });
    } catch (err) {
      setFlash({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to save permissions.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraftIds(new Set(savedIds));
    setFlash(null);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleLabel.trim()) return;
    setCreating(true);
    setFlash(null);
    try {
      const role = await createRole({ name: newRoleName.trim(), label: newRoleLabel.trim() });
      setRoles((prev) => [...prev, role]);
      setSelectedRoleId(role.id);
      setNewRoleName("");
      setNewRoleLabel("");
      setShowNewRole(false);
      setFlash({ type: "success", message: `${role.label} created with 0 permissions.` });
    } catch (err) {
      setFlash({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to create role.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (role: ApiRoleWithPermissions) => {
    setDeletingId(role.id);
    setFlash(null);
    try {
      await deleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      setSelectedRoleId((current) => (current === role.id ? null : current));
      setFlash({ type: "success", message: `${role.label} deleted.` });
    } catch (err) {
      setFlash({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to delete role.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <PageShell
        role={currentUser?.role ?? "system_admin"}
        title="Roles & Permissions"
        description="Control what each role can see and do, live."
      >
        <p className="text-sm text-slate-500">Loading permission matrix…</p>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell
        role={currentUser?.role ?? "system_admin"}
        title="Roles & Permissions"
        description="Control what each role can see and do, live."
      >
        <EmptyState title="Couldn't load the matrix" description={loadError} />
      </PageShell>
    );
  }

  return (
    <PageShell
      role={currentUser?.role ?? "system_admin"}
      title="Roles & Permissions"
      description="Toggle exactly what each of the 6 roles can do. Changes apply to everyone with that role within ~15 seconds — no redeploy, no re-login."
      actions={<ViewToggle view={view} onChange={setView} />}
    >
      {flash ? (
        <div
          className={cn(
            "mb-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ring-1 ring-inset",
            flash.type === "success"
              ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 ring-emerald-600/10"
              : "border-red-200/70 bg-red-50/80 text-red-700 ring-red-600/10",
          )}
        >
          {flash.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 shrink-0" />
          )}
          {flash.message}
        </div>
      ) : null}

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRoles.map((role) => {
            const locked = role.name === "SYSTEM_ADMIN";
            const expanded = expandedCardId === role.id;
            return (
              <Card key={role.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-slate-900">
                      {locked ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : null}
                      {role.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {role.description || "No description provided."}
                    </p>
                  </div>
                  {!role.isSystem ? (
                    <button
                      type="button"
                      title="Delete role"
                      disabled={deletingId === role.id}
                      onClick={() => handleDeleteRole(role)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedCardId(expanded ? null : role.id)}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <span>
                    {role.permissionCodes.length} of {allPermissions.length} permissions
                  </span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-180")}
                  />
                </button>
                {expanded ? (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissionCodes.length === 0 ? (
                      <span className="text-xs text-slate-400">No permissions granted.</span>
                    ) : (
                      role.permissionCodes.map((code) => (
                        <Badge key={code} variant="slate" className="font-mono text-[10px]">
                          {code}
                        </Badge>
                      ))
                    )}
                  </div>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto justify-center"
                  onClick={() => {
                    setSelectedRoleId(role.id);
                    setView("table");
                  }}
                >
                  Edit permissions
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Role list panel */}
        <Card padded={false} className="h-fit overflow-hidden">
          <div className="border-b border-slate-200/80 px-4 py-3">
            <CardTitle>Roles</CardTitle>
            <CardDescription>Select a role to view or edit its permissions.</CardDescription>
          </div>

          <div className="flex flex-col p-2">
            {sortedRoles.map((role) => {
              const locked = role.name === "SYSTEM_ADMIN";
              const active = role.id === selectedRoleId;
              return (
                <div key={role.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "flex flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      active
                        ? "bg-gradient-to-r from-indigo-500/90 to-violet-500/80 text-white shadow-md shadow-indigo-500/20"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {locked ? (
                        <Lock className={cn("h-3.5 w-3.5", active ? "text-white/80" : "text-slate-400")} />
                      ) : null}
                      {role.label}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        active ? "text-white/80" : "text-slate-400",
                      )}
                    >
                      {role.permissionCodes.length}/{allPermissions.length}
                    </span>
                  </button>
                  {!role.isSystem ? (
                    <button
                      type="button"
                      title="Delete role"
                      disabled={deletingId === role.id}
                      onClick={() => handleDeleteRole(role)}
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Permission matrix panel */}
        {selectedRole ? (
          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
              <div>
                <CardTitle>{selectedRole.label}</CardTitle>
                <CardDescription>
                  Landing dashboard: <code className="text-slate-500">{selectedRole.dashboardPath}</code>
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewRole(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Role
                </Button>
                {isLocked ? (
                  <Badge variant="slate">
                    <Lock className="h-3 w-3" /> Locked — superuser, always all permissions
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={!isDirty || saving}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
                      <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-[65vh] divide-y divide-slate-100/80 overflow-y-auto">
              {Object.entries(registry).map(([resource, permissions]) => {
                const checkedCount = permissions.filter((p) =>
                  isLocked ? true : draftIds.has(p.id),
                ).length;
                return (
                  <div key={resource} className="px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {humanizeResource(resource)}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {checkedCount} of {permissions.length} checked
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {permissions.map((permission) => {
                        const checked = isLocked ? true : draftIds.has(permission.id);
                        return (
                          <label
                            key={permission.id}
                            className={cn(
                              "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                              isLocked
                                ? "cursor-not-allowed border-slate-100 bg-slate-50/70"
                                : "cursor-pointer border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/30",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isLocked}
                              onChange={() => toggle(permission.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-60"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-slate-800">
                                {permission.description ?? permission.code}
                              </span>
                              <span className="block truncate font-mono text-[11px] text-slate-400">
                                {permission.code}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <EmptyState title="No role selected" description="Choose a role from the list." />
        )}
      </div>
      )}

      <Modal
        open={showNewRole}
        onClose={() => setShowNewRole(false)}
        title="Add role"
        subtitle="Starts with zero permissions granted — build it up in the matrix after creating it."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowNewRole(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={creating || !newRoleName.trim() || !newRoleLabel.trim()}
              onClick={handleCreateRole}
            >
              {creating ? "Creating…" : "Create role"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Name</label>
            <input
              className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="e.g. REGIONAL_COORDINATOR"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Display label</label>
            <input
              className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="e.g. Regional Coordinator"
              value={newRoleLabel}
              onChange={(e) => setNewRoleLabel(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
