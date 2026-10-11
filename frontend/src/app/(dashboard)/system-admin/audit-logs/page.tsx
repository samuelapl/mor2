'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { ApiAuditLog } from '@/lib/api/types';
import { exportAuditCsv, fetchAuditLogs } from '@/lib/api/monitoring';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { Table, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { filterSearchIconClass, filterSearchInputClass } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';

export default function AuditLogsPage() {
  const { t } = useTranslation('admin');
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [query, setQuery] = useState('');
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
        log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        log.action,
        log.entity,
        log.entityId ?? '',
        log.ipAddress ?? '',
      ].some((field) => field.toLowerCase().includes(q)),
    );
  }, [logs, query]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    filtered,
    10,
  );

  const download = async () => {
    setError(null);
    try {
      const csv = await exportAuditCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Unable to export the audit log.');
    }
  };

  return (
    <PageShell
      role="system_admin"
      title={t('auditLogsPage.auditLogs')}
      description={t('auditLogsPage.aChronologicalTrailOfActionsPerformed')}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className={filterSearchIconClass} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('auditLogsPage.searchActorActionTargetOrIp')}
            className={filterSearchInputClass}
          />
        </div>
        <Button size="sm" variant="outline" onClick={download}>
          <Download className="h-3.5 w-3.5" />
          {t('auditLogsPage.downloadCsv')}
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <Table
        columns={[
          t('auditLogsPage.timestamp'),
          t('auditLogsPage.actor'),
          t('auditLogsPage.action'),
          t('auditLogsPage.entity'),
          t('auditLogsPage.ipAddress'),
        ]}
      >
        {pageItems.map((log) => (
          <tr key={log.id}>
            <Td className="whitespace-nowrap">
              <Badge variant="slate">{new Date(log.createdAt).toLocaleString()}</Badge>
            </Td>
            <Td className="font-medium text-foreground">
              {log.user
                ? `${log.user.firstName} ${log.user.lastName}`
                : t('auditLogsPage.system')}
            </Td>
            <Td>
              <span className="text-secondary-foreground">{log.action}</span>
            </Td>
            <Td>
              <span className="text-secondary-foreground">{log.entity}</span>
              {log.entityId ? (
                <span className="block text-[11px] text-subtle-foreground">{log.entityId}</span>
              ) : null}
            </Td>
            <Td>
              <span className="font-mono text-[11px] text-muted-foreground">{log.ipAddress ?? '—'}</span>
            </Td>
          </tr>
        ))}
        {filtered.length === 0 ? (
          <tr>
            <Td colSpan={5} className="py-10 text-center text-xs text-subtle-foreground">
              {t('auditLogsPage.noAuditEntriesMatchYourSearch')}
            </Td>
          </tr>
        ) : null}
      </Table>
      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </div>
    </PageShell>
  );
}
