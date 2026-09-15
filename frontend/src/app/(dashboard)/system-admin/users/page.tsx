"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/constants/roles";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { Table, Td } from "@/components/ui/Table";
import { Badge, UserStatusBadge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Role } from "@/types";

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

export default function UsersPage() {
  const { users, changeUserRole } = useLms();
  const [flash, setFlash] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

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

  const change = async (userId: string, nextRole: Role) => {
    const user = users.find((item) => item.id === userId);
    const result = await changeUserRole(userId, nextRole);
    setFlash(result.ok ? `${user?.name ?? "User"} is now ${ROLE_LABELS[nextRole]}` : result.message);
  };

  return (
    <PageShell
      role="system_admin"
      title="Users & Roles"
      description="Manage user accounts, approval status, and role assignments."
    >
      {flash ? (
        <div className="mb-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
          <CheckCircle2 className="h-4 w-4" />
          {flash}
        </div>
      ) : null}

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
      ) : (
        <Table columns={["User", "Email", "Department", "Status", "Role", "Change role"]}>
          {filtered.map((user) => (
            <tr key={user.id}>
              <Td>
                <span className="font-medium text-slate-900">{user.name}</span>
                <span className="block text-[11px] text-slate-400">{user.phone}</span>
              </Td>
              <Td>
                <span className="text-slate-500">{user.email}</span>
              </Td>
              <Td>
                <span className="text-slate-500">{user.department}</span>
              </Td>
              <Td>
                <UserStatusBadge status={user.status} />
              </Td>
              <Td>
                <Badge variant={roleBadgeVariant(user.role)}>{ROLE_LABELS[user.role]}</Badge>
              </Td>
              <Td>
                <select
                  value={user.role}
                  onChange={(event) => change(user.id, event.target.value as Role)}
                  className="rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                >
                  {ROLES.map((item) => (
                    <option key={item} value={item}>
                      {ROLE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </PageShell>
  );
}
