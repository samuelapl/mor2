"use client";

import type { ReactNode } from "react";
import { CheckCircle2, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge, UserStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, ROLES } from "@/constants/roles";
import { usePermissions } from "@/lib/usePermissions";
import type { Role, User } from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  );
}

interface UserDetailModalProps {
  user: User | null;
  onClose: () => void;
  onChangeRole: (userId: string, role: Role) => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onSuspend: (userId: string) => void;
  onReactivate: (userId: string) => void;
  isLoading?: boolean;
}

export function UserDetailModal({
  user,
  onClose,
  onChangeRole,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
  isLoading = false,
}: UserDetailModalProps) {
  const { can } = usePermissions();
  const canManage = can("user.manage");

  return (
    <Modal open={Boolean(user)} onClose={onClose} title="User details" subtitle={user?.email} size="md">
      {user ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-white"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-semibold text-white shadow-md">
                {getInitials(user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <Row label="Phone" value={user.phone || "—"} />
            <Row label="Department" value={user.department || "—"} />
            <Row label="TIN" value={user.tin || "—"} />
            <Row
              label="Role"
              value={
                canManage ? (
                  <select
                    value={user.role}
                    onChange={(event) => onChangeRole(user.id, event.target.value as Role)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant="indigo">{ROLE_LABELS[user.role]}</Badge>
                )
              }
            />
            <Row label="Status" value={<UserStatusBadge status={user.status} />} />
            <Row label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
            <Row
              label="Last login"
              value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
            />
            <Row
              label="Last updated"
              value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"}
            />
          </div>

          {canManage ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              {user.status === "pending" ? (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    isLoading={isLoading}
                    disabled={isLoading}
                    onClick={() => onApprove(user.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={isLoading}
                    onClick={() => onReject(user.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </>
              ) : user.status === "suspended" ? (
                <Button
                  size="sm"
                  variant="success"
                  isLoading={isLoading}
                  disabled={isLoading}
                  onClick={() => onReactivate(user.id)}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  isLoading={isLoading}
                  disabled={isLoading}
                  onClick={() => onSuspend(user.id)}
                >
                  <ShieldOff className="h-3.5 w-3.5" /> Suspend
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
