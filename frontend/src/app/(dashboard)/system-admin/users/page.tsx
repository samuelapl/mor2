"use client";

import { Fragment, useMemo, useState } from "react";
import { CheckCircle2, Eye, ShieldCheck, ShieldOff, Trash2, XCircle } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/constants/roles";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Table, Td } from "@/components/ui/Table";
import { Badge, UserStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { ViewToggle, type ViewMode } from "@/components/ui/ViewToggle";
import { UserDetailModal } from "@/components/features/users/UserDetailModal";
import type { Role, User } from "@/types";

function roleBadgeVariant(role: Role) {
  switch (role) {
    case "system_admin":
      return "red";
    case "content_approver":
    case "training_admin":
      return "blue";
    case "trainer":
      return "amber";
    case "learner":
      return "slate";
    default:
      return "green";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UsersPage() {
  const {
    currentUser,
    users,
    changeUserRole,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    deactivateUser,
    reactivateUser,
    deleteUser,
    bulkUserAction,
  } = useLms();
  const { can } = usePermissions();
  const canManage = can("user.manage");

  const [flash, setFlash] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<ViewMode>("table");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"suspend" | "delete" | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(users.map((user) => user.department))).sort(),
    [users],
  );
  const [department, setDepartment] = useState("all");

  // A filter change can hide selected rows, so start the selection over rather than act on
  // users the admin can no longer see.
  const withClearedSelection =
    (setter: (value: string) => void) =>
    (value: string) => {
      setter(value);
      setSelectedIds(new Set());
    };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (role !== "all" && user.role !== role) return false;
      if (status !== "all" && user.status !== status) return false;
      if (department !== "all" && user.department !== department) return false;
      if (!q) return true;
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone.toLowerCase().includes(q)
      );
    });
  }, [users, search, role, status, department]);

  const { page, totalPages, setPage, pageItems } = usePagination(filtered, 10);

  // You can't bulk-act on your own account (the backend refuses deleting it anyway).
  const isSelectable = (user: User) => canManage && user.id !== currentUser?.id;
  const selectableOnPage = pageItems.filter(isSelectable);
  const allOnPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((user) => selectedIds.has(user.id));
  const selectableFiltered = filtered.filter(isSelectable);
  const selectedUsers = users.filter((user) => selectedIds.has(user.id));
  // Only active users can be suspended; the rest of the selection is skipped.
  const suspendableSelected = selectedUsers.filter((user) => user.status === "active");

  const toggleSelected = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const user of selectableOnPage) {
        if (allOnPageSelected) next.delete(user.id);
        else next.add(user.id);
      }
      return next;
    });
  };

  const confirmBulk = async () => {
    if (!bulkAction) return;
    const targets = bulkAction === "suspend" ? suspendableSelected : selectedUsers;
    setBusy(true);
    const result = await bulkUserAction(bulkAction, targets.map((user) => user.id));
    setBusy(false);
    setBulkAction(null);
    if (!result.ok) {
      setFlash(result.message);
      return;
    }
    const verb = bulkAction === "suspend" ? "suspended" : "deleted";
    const failedNames = targets
      .filter((user) => result.failed.includes(user.id))
      .map((user) => user.name);
    setFlash(
      failedNames.length
        ? `${result.succeeded} user(s) ${verb}. Failed: ${failedNames.join(", ")}.`
        : `${result.succeeded} user(s) ${verb}.`,
    );
    // Keep the ones that failed selected so they can be retried.
    setSelectedIds(new Set(result.failed));
  };

  const selectBox = (user: User) =>
    isSelectable(user) ? (
      <input
        type="checkbox"
        checked={selectedIds.has(user.id)}
        onChange={() => toggleSelected(user.id)}
        aria-label={`Select ${user.name}`}
        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
      />
    ) : null;

  const detailUser = detailUserId ? (users.find((u) => u.id === detailUserId) ?? null) : null;

  const changeRole = async (userId: string, nextRole: Role) => {
    const user = users.find((item) => item.id === userId);
    const result = await changeUserRole(userId, nextRole);
    setFlash(result.ok ? `${user?.name ?? "User"} is now ${ROLE_LABELS[nextRole]}` : result.message);
  };

  const approve = async (userId: string) => {
    setBusy(true);
    const result = await approveRegistrationRequest(userId);
    setFlash(result.ok ? "Registration approved." : result.message);
    setBusy(false);
  };

  const reject = async (userId: string, reason?: string) => {
    setBusy(true);
    const result = await rejectRegistrationRequest(userId, reason?.trim() || undefined);
    setRejectTarget(null);
    setRejectReason("");
    setFlash(result.ok ? "Registration rejected." : result.message);
    setBusy(false);
  };

  const suspend = async (userId: string) => {
    setBusy(true);
    const result = await deactivateUser(userId);
    setFlash(result.ok ? "User suspended." : result.message);
    setBusy(false);
  };

  const reactivate = async (userId: string) => {
    setBusy(true);
    const result = await reactivateUser(userId);
    setFlash(result.ok ? "User reactivated." : result.message);
    setBusy(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteUser(deleteTarget.id);
    setFlash(result.ok ? `${deleteTarget.name} was deleted.` : result.message);
    setDeleteTarget(null);
    setBusy(false);
  };

  const deleteButton = (user: User) =>
    user.id === currentUser?.id ? null : (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => setDeleteTarget(user)}
        aria-label={`Delete ${user.name}`}
        className="text-red-600 hover:border-red-300 hover:text-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </Button>
    );

  const statusActions = (user: User) => {
    if (!canManage) return null;
    return (
      <div className="flex items-center gap-1.5">
        {statusButton(user)}
        {deleteButton(user)}
      </div>
    );
  };

  const statusButton = (user: User) => {
    if (user.status === "pending") {
      return (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="success" disabled={busy} onClick={() => void approve(user.id)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => {
              setRejectTarget(rejectTarget === user.id ? null : user.id);
              setRejectReason("");
            }}
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }
    if (user.status === "suspended") {
      return (
        <Button size="sm" variant="success" disabled={busy} onClick={() => void reactivate(user.id)}>
          <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
        </Button>
      );
    }
    return (
      <Button size="sm" variant="danger" disabled={busy} onClick={() => void suspend(user.id)}>
        <ShieldOff className="h-3.5 w-3.5" /> Suspend
      </Button>
    );
  };

  return (
    <PageShell
      role={currentUser?.role ?? "system_admin"}
      title="Users & Roles"
      description="Manage user accounts, approval status, and role assignments."
      actions={<ViewToggle view={view} onChange={setView} />}
    >
      {flash ? (
        <div className="mb-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
          <CheckCircle2 className="h-4 w-4" />
          {flash}
        </div>
      ) : null}

      <FilterBar
        search={search}
        onSearchChange={withClearedSelection(setSearch)}
        searchPlaceholder="Search name, email or phone…"
        selects={[
          {
            id: "role",
            label: "Role",
            value: role,
            onChange: withClearedSelection(setRole),
            options: [
              { value: "all", label: "All" },
              ...ROLES.map((item) => ({ value: item, label: ROLE_LABELS[item] })),
            ],
          },
          {
            id: "status",
            label: "Status",
            value: status,
            onChange: withClearedSelection(setStatus),
            options: [
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "active", label: "Active" },
              { value: "rejected", label: "Rejected" },
              { value: "suspended", label: "Suspended" },
            ],
          },
          {
            id: "department",
            label: "Department",
            value: department,
            onChange: withClearedSelection(setDepartment),
            options: [
              { value: "all", label: "All" },
              ...departments.map((item) => ({ value: item, label: item })),
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setRole("all");
          setStatus("all");
          setDepartment("all");
          setSelectedIds(new Set());
        }}
        hasActiveFilters={search !== "" || role !== "all" || status !== "all" || department !== "all"}
      />

      {selectedUsers.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 px-4 py-2.5 text-sm text-indigo-900">
          <span className="font-semibold">{selectedUsers.length} selected</span>
          {selectedUsers.length < selectableFiltered.length ? (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(selectableFiltered.map((user) => user.id)))}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Select all {selectableFiltered.length} matching
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={busy || suspendableSelected.length === 0}
              onClick={() => setBulkAction("suspend")}
            >
              <ShieldOff className="h-3.5 w-3.5" /> Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setBulkAction("delete")}
              className="text-red-600 hover:border-red-300 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title="No users match" description="Clear filters to see the full directory." />
      ) : view === "table" ? (
        <>
        <Table
          columns={[
            ...(canManage
              ? [
                  {
                    name: "select",
                    className: "w-10",
                    label: (
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        disabled={selectableOnPage.length === 0}
                        onChange={togglePage}
                        aria-label="Select all on this page"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                      />
                    ),
                  },
                ]
              : []),
            "User",
            "Email",
            "Department",
            "Status",
            "Role",
            "Actions",
          ]}
        >
          {pageItems.map((user) => (
            <Fragment key={user.id}>
              <tr className={selectedIds.has(user.id) ? "bg-indigo-50/40" : undefined}>
                {canManage ? <Td className="w-10">{selectBox(user)}</Td> : null}
                <Td>
                  <span className="font-medium text-slate-900">{user.name}</span>
                  <span className="block text-[11px] text-slate-400">{user.phone}</span>
                </Td>
                <Td>
                  <span className="text-slate-500">{user.email}</span>
                </Td>
                <Td>
                  <span className="text-slate-500">{user.department || "—"}</span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <UserStatusBadge status={user.status} />
                    {user.mustChangePassword ? (
                      <Badge variant="amber">Must change password</Badge>
                    ) : null}
                  </div>
                </Td>
                <Td>
                  {canManage ? (
                    <select
                      value={user.role}
                      onChange={(event) => void changeRole(user.id, event.target.value as Role)}
                      className="rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    >
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {ROLE_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={roleBadgeVariant(user.role)}>{ROLE_LABELS[user.role]}</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailUserId(user.id)}
                      aria-label="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {statusActions(user)}
                  </div>
                </Td>
              </tr>
              {rejectTarget === user.id ? (
                <tr key={`${user.id}-reject`}>
                  <Td colSpan={canManage ? 7 : 6}>
                    <div className="flex flex-col gap-2 rounded-xl border border-red-200/70 bg-red-50/60 p-3">
                      <RichTextArea
                        rows={2}
                        value={rejectReason}
                        onChange={(val) => setRejectReason(val)}
                        placeholder="Reason (optional) — emailed to the applicant (supports formatting, bold, bullet points)…"
                        compact
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRejectTarget(null);
                            setRejectReason("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          onClick={() => void reject(user.id, rejectReason)}
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  </Td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </Table>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((user) => (
            <div
              key={user.id}
              className={`rounded-2xl border bg-white p-4 shadow-soft ring-super-soft ${
                selectedIds.has(user.id) ? "border-indigo-300 ring-2 ring-indigo-500/20" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt="Avatar"
                    className="h-11 w-11 shrink-0 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm">
                    {getInitials(user.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                {selectBox(user)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge variant={roleBadgeVariant(user.role)}>{ROLE_LABELS[user.role]}</Badge>
                <UserStatusBadge status={user.status} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetailUserId(user.id)}
                  aria-label="View details"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {statusActions(user)}
              </div>
              {rejectTarget === user.id ? (
                <div className="mt-2 flex flex-col gap-2 rounded-xl border border-red-200/70 bg-red-50/60 p-3">
                  <RichTextArea
                    rows={2}
                    value={rejectReason}
                    onChange={(val) => setRejectReason(val)}
                    placeholder="Reason (optional)"
                    compact
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRejectTarget(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void reject(user.id, rejectReason)}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user?"
        subtitle={deleteTarget?.email}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void confirmDelete()}>
              <Trash2 className="h-4 w-4" /> {busy ? "Deleting…" : "Delete user"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{deleteTarget?.name}</span> will be removed
          from the users list and can no longer sign in. Their course history, certificates and
          audit records are kept, and their email can be registered again.
        </p>
      </Modal>

      <Modal
        open={Boolean(bulkAction)}
        onClose={() => setBulkAction(null)}
        title={bulkAction === "suspend" ? "Suspend selected users?" : "Delete selected users?"}
        subtitle={
          bulkAction === "suspend"
            ? `${suspendableSelected.length} user(s)`
            : `${selectedUsers.length} user(s)`
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setBulkAction(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void confirmBulk()}>
              {bulkAction === "suspend" ? (
                <>
                  <ShieldOff className="h-4 w-4" /> {busy ? "Suspending…" : "Suspend users"}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> {busy ? "Deleting…" : "Delete users"}
                </>
              )}
            </Button>
          </div>
        }
      >
        {bulkAction === "suspend" ? (
          <p className="text-sm text-slate-600">
            {suspendableSelected.length} active user(s) will be signed out and blocked from signing
            in until reactivated.
            {selectedUsers.length > suspendableSelected.length
              ? ` ${selectedUsers.length - suspendableSelected.length} selected user(s) are not active and will be skipped.`
              : ""}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            {selectedUsers.length} user(s) will be removed from the users list and can no longer
            sign in. Their course history, certificates and audit records are kept, and their
            emails can be registered again.
          </p>
        )}
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600">
          {(bulkAction === "suspend" ? suspendableSelected : selectedUsers).map((user) => (
            <li key={user.id}>
              <span className="font-semibold text-slate-800">{user.name}</span> · {user.email}
            </li>
          ))}
        </ul>
      </Modal>

      <UserDetailModal
        user={detailUser}
        onClose={() => setDetailUserId(null)}
        onChangeRole={(userId, nextRole) => void changeRole(userId, nextRole)}
        onApprove={(userId) => void approve(userId)}
        onReject={(userId) => void reject(userId)}
        onSuspend={(userId) => void suspend(userId)}
        onReactivate={(userId) => void reactivate(userId)}
      />
    </PageShell>
  );
}
