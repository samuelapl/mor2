'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Shield,
  Clock,
  Laptop,
  Filter,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import type { ApiAuditLog } from '@/lib/api/types';
import {
  exportAuditCsv,
  fetchAuditLogs,
  updateAuditLog,
  deleteAuditLog,
} from '@/lib/api/monitoring';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';
import PageShell from '@/components/shared/PageShell';
import { Table, Td } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { filterSearchIconClass, filterSearchInputClass } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';

import { formatAuditAction } from '@/lib/auditUtils';

export default function AuditLogsPage() {
  const { t } = useTranslation('admin');
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [selectedLog, setSelectedLog] = useState<ApiAuditLog | null>(null);
  const [editingLog, setEditingLog] = useState<ApiAuditLog | null>(null);
  const [editAction, setEditAction] = useState('');
  const [editReason, setEditReason] = useState('');
  const [deletingLog, setDeletingLog] = useState<ApiAuditLog | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchAuditLogs({ limit: 250 })
      .then((res) => {
        setLogs(res.data || []);
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute unique roles present in current logs for the filter dropdown
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const log of logs) {
      if (log.actorRole) roles.add(log.actorRole);
    }
    return Array.from(roles).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    let result = logs;

    if (outcomeFilter !== 'ALL') {
      result = result.filter((l) => (l.outcome || 'SUCCESS').toUpperCase() === outcomeFilter);
    }

    if (roleFilter !== 'ALL') {
      result = result.filter(
        (l) => (l.actorRole || '').toUpperCase() === roleFilter.toUpperCase(),
      );
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((log) => {
        const cleanAction = formatAuditAction(log.action).title;
        const actorName = log.actor || (log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System');
        const role = log.actorRole || '';
        const rawAction = log.action || '';
        const resource = log.resource || log.entity || '';
        const outcome = log.outcome || '';
        const source = log.source || log.ipAddress || '';
        const reason = log.reason || '';
        const changes = log.changes || '';

        return [actorName, role, cleanAction, rawAction, resource, outcome, source, reason, changes].some((f) =>
          f.toLowerCase().includes(q),
        );
      });
    }

    return result;
  }, [logs, query, outcomeFilter, roleFilter]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    filtered,
    15,
  );

  const download = async () => {
    setError(null);
    try {
      const csv = await exportAuditCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-log-enterprise-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Unable to export the audit log.');
    }
  };

  const formatUtcTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    } catch {
      return iso;
    }
  };

  const handleOpenEdit = (log: ApiAuditLog) => {
    setEditingLog(log);
    const formatted = formatAuditAction(log.action);
    setEditAction(log.action);
    setEditReason(log.reason || '');
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    setSavingEdit(true);
    try {
      const updated = await updateAuditLog(editingLog.id, {
        action: editAction.trim() || editingLog.action,
        reason: editReason.trim(),
      });
      setLogs((prev) =>
        prev.map((l) => (l.id === editingLog.id ? { ...l, ...updated, action: editAction.trim() || l.action, reason: editReason.trim() } : l)),
      );
      toast.success('Audit log record updated successfully');
      setEditingLog(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update audit log');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLog) return;
    setDeletingId(deletingLog.id);
    try {
      await deleteAuditLog(deletingLog.id);
      setLogs((prev) => prev.filter((l) => l.id !== deletingLog.id));
      toast.success('Audit log record deleted successfully');
      setDeletingLog(null);
      if (selectedLog?.id === deletingLog.id) {
        setSelectedLog(null);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete audit log entry');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageShell
      role="system_admin"
      title="Audit Trail & System Events"
      description="Enterprise tamper-evident audit log tracking timestamps, actors, actions, resources, outcomes, and state diffs."
    >
      {/* ── Filter & Search Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search box */}
          <div className="relative w-full max-w-xs sm:max-w-sm">
            <Search className={filterSearchIconClass} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Actor, Action, Resource, IP..."
              className={filterSearchInputClass}
            />
          </div>

          {/* Outcome Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-input bg-card px-2.5 py-1.5 shadow-2xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILURE">Failure Only</option>
            </select>
          </div>

          {/* Actor Role Filter */}
          {availableRoles.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-input bg-card px-2.5 py-1.5 shadow-2xs">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button size="sm" variant="ghost" onClick={loadData} title="Refresh logs">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Export Button */}
        <Button size="sm" variant="outline" onClick={download} className="shrink-0 shadow-2xs">
          <Download className="h-3.5 w-3.5 mr-1" />
          Export CSV (9 Standard Columns)
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger border border-danger/30 font-medium">
          {error}
        </p>
      ) : null}

      {/* ── 9 Standard Reference Columns Audit Table ── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-soft">
        <Table
          columns={[
            'Timestamp (UTC)',
            'Actor',
            'Actor Role',
            'What Happened (Action)',
            'Resource',
            'Outcome',
            'Changes',
            'Source',
            'Actions',
          ]}
        >
          {pageItems.map((log) => {
            const actorName =
              log.actor ||
              (log.user ? `${log.user.firstName} ${log.user.lastName}` : log.userId || 'SYSTEM');
            const actorRole = log.actorRole || 'SYSTEM';
            const outcome = (log.outcome || (log.action.endsWith('_FAILED') ? 'FAILURE' : 'SUCCESS')).toUpperCase();
            const resource = log.resource || `${log.entity}${log.entityId ? `_${log.entityId.slice(0, 8)}` : ''}`;
            const timeUtc = log.timestampUtc || log.createdAt;
            const changes = log.changes || '—';
            const source = log.source || log.ipAddress || '—';
            const isSuccess = outcome === 'SUCCESS';
            const actionInfo = formatAuditAction(log.action);

            return (
              <tr
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="hover:bg-muted/40 transition cursor-pointer group"
              >
                {/* 1. Timestamp UTC */}
                <Td className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-subtle-foreground shrink-0" />
                    <span>{formatUtcTime(timeUtc)}</span>
                  </div>
                </Td>

                {/* 2. Actor */}
                <Td className="font-semibold text-foreground whitespace-nowrap">
                  <span className="truncate max-w-[140px] block" title={actorName}>
                    {actorName}
                  </span>
                </Td>

                {/* 3. Actor Role */}
                <Td className="whitespace-nowrap">
                  <Badge variant="outline" className="font-mono text-[10px] tracking-wide uppercase">
                    {actorRole.replace('_', ' ')}
                  </Badge>
                </Td>

                {/* 4. Action (Clean human-readable message what actor did) */}
                <Td className="min-w-[180px]">
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {actionInfo.title}
                  </span>
                </Td>

                {/* 5. Resource */}
                <Td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-[11px] text-secondary-foreground border border-border/60">
                    {resource}
                  </span>
                </Td>

                {/* 6. Outcome Badge */}
                <Td className="whitespace-nowrap">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success border border-success/30">
                      <CheckCircle2 className="h-3 w-3" />
                      SUCCESS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-bold text-danger border border-danger/30">
                      <XCircle className="h-3 w-3" />
                      FAILURE
                    </span>
                  )}
                </Td>

                {/* 7. Changes diff */}
                <Td className="max-w-[200px]">
                  <span
                    className="block truncate font-mono text-[11px] text-muted-foreground"
                    title={changes}
                  >
                    {changes}
                  </span>
                </Td>

                {/* 8. Source */}
                <Td className="whitespace-nowrap font-mono text-[11px] text-muted-foreground max-w-[130px] truncate" title={source}>
                  {source}
                </Td>

                {/* 9. Edit / Delete / Inspect Action buttons */}
                <Td className="whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      title="Inspect event details"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(log)}
                      title="Edit audit log"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-primary-soft hover:text-primary hover:border-primary/40 transition shadow-2xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingLog(log)}
                      title="Delete audit record"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-danger-soft hover:text-danger hover:border-danger/40 transition shadow-2xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
          {filtered.length === 0 && !loading ? (
            <tr>
              <Td colSpan={9} className="py-12 text-center text-xs text-subtle-foreground italic">
                No audit log entries match the current search or filters.
              </Td>
            </tr>
          ) : null}
        </Table>
      </div>

      <div className="mt-4">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[15, 30, 50, 100]}
        />
      </div>

      {/* ── Detailed Event Inspection Modal ── */}
      {selectedLog && (
        <Modal
          open={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event Details: ${formatAuditAction(selectedLog.action).title}`}
        >
          <div className="space-y-5 text-sm">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Timestamp (UTC)
                </span>
                <span className="font-mono text-xs font-bold text-foreground mt-0.5 block">
                  {formatUtcTime(selectedLog.timestampUtc || selectedLog.createdAt)}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Actor & Role
                </span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">
                    {selectedLog.actor || (selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : 'System')}
                  </span>
                  <Badge variant="outline" className="text-[9px] uppercase font-mono">
                    {selectedLog.actorRole || 'SYSTEM'}
                  </Badge>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Outcome
                </span>
                <div className="mt-0.5">
                  {(selectedLog.outcome || 'SUCCESS').toUpperCase() === 'SUCCESS' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      SUCCESS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-danger">
                      <XCircle className="h-3.5 w-3.5" />
                      FAILURE
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Affected Resource
                </span>
                <span className="font-mono text-xs font-bold text-secondary-foreground mt-0.5 block">
                  {selectedLog.resource || `${selectedLog.entity}${selectedLog.entityId ? `_${selectedLog.entityId}` : ''}`}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Source Origin
                </span>
                <span className="font-mono text-xs text-muted-foreground mt-0.5 block truncate" title={selectedLog.source || selectedLog.ipAddress || ''}>
                  {selectedLog.source || selectedLog.ipAddress || 'Direct'}
                </span>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Reason / Rationale
                </span>
                <span className="text-xs text-secondary-foreground mt-0.5 block italic">
                  {selectedLog.reason || 'None specified'}
                </span>
              </div>
            </div>

            {/* Changes Summary */}
            {selectedLog.changes && selectedLog.changes !== '—' && (
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Detected Mutation (Old → New)
                </h5>
                <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-3 font-mono text-xs text-primary leading-relaxed break-all">
                  {selectedLog.changes}
                </div>
              </div>
            )}

            {/* Raw Before / After State Diff */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>BEFORE VALUES</span>
                  <span className="text-[10px] font-mono text-subtle-foreground">oldValues</span>
                </div>
                <pre className="max-h-56 overflow-auto rounded-xl border border-border/80 bg-muted/50 p-3 font-mono text-[11px] text-secondary-foreground">
                  {selectedLog.oldValues
                    ? JSON.stringify(selectedLog.oldValues, null, 2)
                    : '// No prior state recorded'}
                </pre>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>AFTER VALUES</span>
                  <span className="text-[10px] font-mono text-subtle-foreground">newValues</span>
                </div>
                <pre className="max-h-56 overflow-auto rounded-xl border border-border/80 bg-muted/50 p-3 font-mono text-[11px] text-secondary-foreground">
                  {selectedLog.newValues
                    ? JSON.stringify(selectedLog.newValues, null, 2)
                    : '// No state modification recorded'}
                </pre>
              </div>
            </div>

            {/* Request Context Footnote */}
            {selectedLog.userAgent && (
              <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-[11px] text-subtle-foreground">
                <Laptop className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={selectedLog.userAgent}>
                  {selectedLog.userAgent}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const target = selectedLog;
                  setSelectedLog(null);
                  handleOpenEdit(target);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Audit Log Modal ── */}
      {editingLog && (
        <Modal
          open={Boolean(editingLog)}
          onClose={() => setEditingLog(null)}
          title="Edit Audit Log Entry"
        >
          <div className="space-y-4 text-sm">
            <p className="text-xs text-muted-foreground">
              Modify the recorded action description or provide supplementary explanatory rationale for this audit event.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Action / Event Identifier
              </label>
              <input
                type="text"
                value={editAction}
                onChange={(e) => setEditAction(e.target.value)}
                placeholder="e.g. COURSE_UPDATED or Course updated"
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Reason / Explanatory Notes
              </label>
              <textarea
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Enter clarification, administrative notes, or reason for action..."
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setEditingLog(null)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={savingEdit}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deletingLog && (
        <Modal
          open={Boolean(deletingLog)}
          onClose={() => setDeletingLog(null)}
          title="Delete Audit Log Record"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft/60 p-3.5 text-danger">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs uppercase tracking-wide">Confirm Deletion</p>
                <p className="text-xs mt-1 text-danger/90 leading-relaxed">
                  Are you sure you want to delete this audit log record? This action will permanently remove the event from the database audit trail.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1 font-mono text-xs">
              <div><span className="text-muted-foreground">Action:</span> <strong className="text-foreground">{formatAuditAction(deletingLog.action).title}</strong></div>
              <div><span className="text-muted-foreground">Resource:</span> <span className="text-foreground">{deletingLog.resource || deletingLog.entity}</span></div>
              <div><span className="text-muted-foreground">Time:</span> <span className="text-foreground">{formatUtcTime(deletingLog.timestampUtc || deletingLog.createdAt)}</span></div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setDeletingLog(null)} disabled={Boolean(deletingId)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={Boolean(deletingId)}
                loadingText="Deleting..."
              >
                Delete Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
