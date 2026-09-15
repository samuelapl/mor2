"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PendingRegistrationsPage() {
  const { currentUser, users, approveRegistrationRequest, rejectRegistrationRequest } = useLms();
  const [flash, setFlash] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!currentUser || currentUser.role !== "system_admin") {
    return null;
  }

  const pending = users.filter((user) => user.status === "pending");

  const approve = async (userId: string) => {
    setBusy(true);
    const result = await approveRegistrationRequest(userId);
    setFlashOk(result.ok);
    setFlash(result.ok ? "Registration approved. The learner can now sign in." : result.message);
    setBusy(false);
  };

  const reject = async (userId: string) => {
    setBusy(true);
    const result = await rejectRegistrationRequest(
      userId,
      rejectReason.trim() || undefined,
    );
    setRejectTarget(null);
    setRejectReason("");
    setFlashOk(result.ok);
    setFlash(result.ok ? "Registration rejected." : result.message);
    setBusy(false);
  };

  return (
    <PageShell
      role="system_admin"
      title="Registration Requests"
      description="Public sign-ups require your approval before learners can sign in."
    >
      {flash ? (
        <div
          className={`mb-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ring-1 ring-inset ${
            flashOk
              ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 ring-emerald-600/10"
              : "border-red-200/70 bg-red-50/80 text-red-700 ring-red-600/10"
          }`}
        >
          {flash}
        </div>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          title="No pending registrations"
          description="All registration requests have been reviewed."
        />
      ) : (
        <Table columns={["Applicant", "Email", "Phone", "Submitted", "Actions"]}>
          {pending.map((user) => (
            <tr key={user.id}>
              <Td>
                <span className="font-medium text-slate-900">{user.name}</span>
                <span className="block text-[11px] text-slate-400">Pending approval</span>
              </Td>
              <Td>
                <span className="text-slate-500">{user.email}</span>
              </Td>
              <Td>
                <span className="text-slate-500">{user.phone || "—"}</span>
              </Td>
              <Td>
                <Badge variant="blue" dot>
                  {new Date(user.createdAt).toLocaleDateString()}
                </Badge>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    disabled={busy}
                    onClick={() => void approve(user.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
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
                    Reject
                  </Button>
                </div>
                {rejectTarget === user.id ? (
                  <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200/70 bg-red-50/60 p-2">
                    <textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Reason (optional) — emailed to the applicant"
                      className="w-full rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-red-300"
                    />
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void reject(user.id)}
                    >
                      Confirm
                    </Button>
                  </div>
                ) : null}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </PageShell>
  );
}