"use client";

import { Fragment, useMemo, useState } from "react";
import { CheckCircle2, Eye, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
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
import { RichTextArea } from "@/components/ui/RichTextArea";
import { ViewToggle, type ViewMode } from "@/components/ui/ViewToggle";
import { UserDetailModal } from "@/components/features/users/UserDetailModal";
import { toast } from "@/lib/toast";
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
  } = useLms();
  const { can } = usePermissions();
  const canManage = can("user.manage");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<ViewMode>("table");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(users.map((user) => user.department))).sort(),
    [users],
  );
  const [department, setDepartment] = useState("all");

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

  const detailUser = detailUserId ? (users.find((u) => u.id === detailUserId) ?? null) : null;

  const changeRole = async (userId: string, nextRole: Role) => {
    const user = users.find((item) => item.id === userId);
    setBusyUserId(userId);
    try {
      const result = await changeUserRole(userId, nextRole);
      if (result.ok) {
        toast.success(`${user?.name ?? "User"} role updated to ${ROLE_LABELS[nextRole]}`);
      } else {
        toast.error(result.message || "Failed to update role");
      }
    } catch {
      toast.error("An error occurred while updating role");
    } finally {
      setBusyUserId(null);
    }
  };

  const approve = async (userId: string) => {
    setBusyUserId(userId);
    try {
      const result = await approveRegistrationRequest(userId);
      if (result.ok) {
        toast.success("Registration approved successfully.");
      } else {
        toast.error(result.message || "Failed to approve registration");
      }
    } catch {
      toast.error("Failed to approve registration");
    } finally {
      setBusyUserId(null);
    }
  };

  const reject = async (userId: string, reason?: string) => {
    setBusyUserId(userId);
    try {
      const result = await rejectRegistrationRequest(userId, reason?.trim() || undefined);
      setRejectTarget(null);
      setRejectReason("");
      if (result.ok) {
        toast.success("Registration rejected.");
      } else {
        toast.error(result.message || "Failed to reject registration");
      }
    } catch {
      toast.error("Failed to reject registration");
    } finally {
      setBusyUserId(null);
    }
  };

  const suspend = async (userId: string) => {
    setBusyUserId(userId);
    try {
      const result = await deactivateUser(userId);
      if (result.ok) {
        toast.success("User account suspended.");
      } else {
        toast.error(result.message || "Failed to suspend user");
      }
    } catch {
      toast.error("Failed to suspend user");
    } finally {
      setBusyUserId(null);
    }
  };

  const reactivate = async (userId: string) => {
    setBusyUserId(userId);
    try {
      const result = await reactivateUser(userId);
      if (result.ok) {
        toast.success("User account reactivated.");
      } else {
        toast.error(result.message || "Failed to reactivate user");
      }
    } catch {
      toast.error("Failed to reactivate user");
    } finally {
      setBusyUserId(null);
    }
  };

  const statusActions = (user: User) => {
    if (!canManage) return null;
    const isBusy = busyUserId === user.id;

    if (user.status === "pending") {
      return (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="success"
            isLoading={isBusy}
            title="Approve registration"
            onClick={() => void approve(user.id)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isBusy}
            title="Reject registration"
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
        <Button
          size="sm"
          variant="success"
          isLoading={isBusy}
          onClick={() => void reactivate(user.id)}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="danger"
        isLoading={isBusy}
        onClick={() => void suspend(user.id)}
      >
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

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email or phone…"
        selects={[
          {
            id: "role",
            label: "Role",
            value: role,
            onChange: setRole,
            options: [
              { value: "all", label: "All" },
              ...ROLES.map((item) => ({ value: item, label: ROLE_LABELS[item] })),
            ],
          },
          {
            id: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
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
            onChange: setDepartment,
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
        }}
        hasActiveFilters={search !== "" || role !== "all" || status !== "all" || department !== "all"}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No users match" description="Clear filters to see the full directory." />
      ) : view === "table" ? (
        <>
          <Table columns={["User", "Email", "Department", "Status", "Role", "Actions"]}>
            {pageItems.map((user) => (
              <Fragment key={user.id}>
                <tr>
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
                    <UserStatusBadge status={user.status} />
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
                    <Td colSpan={6}>
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
                            isLoading={busyUserId === user.id}
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
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft ring-super-soft"
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
                        isLoading={busyUserId === user.id}
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

      <UserDetailModal
        user={detailUser}
        onClose={() => setDetailUserId(null)}
        onChangeRole={(userId, nextRole) => void changeRole(userId, nextRole)}
        onApprove={(userId) => void approve(userId)}
        onReject={(userId) => void reject(userId)}
        onSuspend={(userId) => void suspend(userId)}
        onReactivate={(userId) => void reactivate(userId)}
        isLoading={Boolean(busyUserId)}
      />
    </PageShell>
  );
}
