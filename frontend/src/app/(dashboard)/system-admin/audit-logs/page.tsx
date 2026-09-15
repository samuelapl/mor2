"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import type { ApiAuditLog } from "@/lib/api/types";
import { exportAuditCsv, fetchAuditLogs } from "@/lib/api/monitoring";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuditLogs({ limit: 100 })
      .then((res) => {
        if (!cancelled) setLogs(res.data);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) =>
      [
        log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
        log.action,
        log.entity,
        log.entityId ?? "",
      ].some((field) => field.toLowerCase().includes(q)),
    );
  }, [logs, query]);

  const { page, totalPages, setPage, pageItems } = usePagination(filtered, 10);

  const download = async () => {
    setError(null);
    try {
      const csv = await exportAuditCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to export the audit log.");
    }
  };

  return (
    <PageShell
      role="system_admin"
      title="Audit Logs"
      description="A chronological trail of actions performed across the system."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actor, action or target…"
            className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
        <Button size="sm" variant="outline" onClick={download}>
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <Table columns={["Timestamp", "Actor", "Action", "Entity"]}>
        {pageItems.map((log) => (
          <tr key={log.id}>
            <Td className="whitespace-nowrap">
              <Badge variant="slate">{new Date(log.createdAt).toLocaleString()}</Badge>
            </Td>
            <Td className="font-medium text-slate-900">
              {log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}
            </Td>
            <Td>
              <span className="text-slate-600">{log.action}</span>
            </Td>
            <Td>
              <span className="text-slate-600">{log.entity}</span>
              {log.entityId ? (
                <span className="block text-[11px] text-slate-400">{log.entityId}</span>
              ) : null}
            </Td>
          </tr>
        ))}
        {filtered.length === 0 ? (
          <tr>
            <Td colSpan={4} className="py-10 text-center text-xs text-slate-400">
              No audit entries match your search.
            </Td>
          </tr>
        ) : null}
      </Table>
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </PageShell>
  );
}