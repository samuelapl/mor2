"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/constants/roles";
import { roleFromApi } from "@/lib/api/transform";
import type { ApiUser } from "@/lib/api/types";

type BadgeVariant = Parameters<typeof Badge>[0]["variant"];

function statusOf(user: ApiUser): { label: string; variant: BadgeVariant } {
  if (user.registrationStatus === "PENDING") return { label: "Pending approval", variant: "amber" };
  if (user.registrationStatus === "REJECTED") return { label: "Rejected", variant: "red" };
  return user.isActive ? { label: "Active", variant: "green" } : { label: "Suspended", variant: "red" };
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  );
}

interface DetailsTabProps {
  profile: ApiUser | null;
  loading: boolean;
}

export default function DetailsTab({ profile, loading }: DetailsTabProps) {
  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const status = statusOf(profile);

  return (
    <div className="divide-y divide-slate-100">
      <Row label="Email" value={profile.email} />
      <Row
        label="Roles"
        value={
          <div className="flex flex-wrap justify-end gap-1.5">
            {profile.roles.map((r) => (
              <Badge key={r.id} variant="indigo">
                {ROLE_LABELS[roleFromApi(r.role)]}
              </Badge>
            ))}
          </div>
        }
      />
      <Row label="Status" value={<Badge variant={status.variant} dot>{status.label}</Badge>} />
      <Row label="Member since" value={new Date(profile.createdAt).toLocaleDateString()} />
      <Row
        label="Last login"
        value={profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "Never"}
      />
    </div>
  );
}
