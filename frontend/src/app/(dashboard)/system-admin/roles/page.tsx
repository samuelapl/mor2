'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import PageShell from '@/components/shared/PageShell';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { ViewToggle, type ViewMode } from '@/components/ui/ViewToggle';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/toast';
import {
  createRole,
  deleteRole,
  fetchPermissionsRegistry,
  fetchRolesWithPermissions,
  setRolePermissions,
} from '@/lib/api/permissions';
import { ApiError } from '@/lib/api/client';
import type {
  ApiPermission,
  ApiPermissionsByResource,
  ApiRoleWithPermissions,
} from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

const RESOURCE_NAMES_AM: Record<string, string> = {
  course: 'ኮርስ',
  quiz: 'ፈተና / ኩዊዝ',
  assessment: 'ምዘና',
  question_bank: 'የጥያቄ ባንክ',
  attendance: 'ክትትል / መገኘት',
  result: 'ውጤት',
  student: 'ሰልጣኞች',
  enrollment: 'ምዝገባ',
  live_session: 'የቀጥታ ስልጠና',
  progress: 'የመማር እድገት',
  certificate: 'ሰርተፊኬት',
  user: 'ተጠቃሚዎች',
  role: 'ሚናዎች',
  permission: 'ፈቃዶች',
  dashboard: 'ዳሽቦርድ',
  audit: 'የኦዲት መዝገብ',
  course_policy: 'የኮርስ ፖሊሲ',
  feedback: 'የኮርስ ግብረ-መልስ',
};

const ROLE_NAMES_AM: Record<string, string> = {
  COURSE_OWNER: 'የኮርስ ባለቤት',
  CONTENT_APPROVER: 'የይዘት አጽዳቂ',
  TRAINING_ADMIN: 'የስልጠና አስተዳዳሪ',
  TRAINER: 'አሰልጣኝ',
  LEARNER: 'ሰልጣኝ',
  SYSTEM_ADMIN: 'የስርዓት አስተዳዳሪ',
  course_owner: 'የኮርስ ባለቤት',
  content_approver: 'የይዘት አጽዳቂ',
  training_admin: 'የስልጠና አስተዳዳሪ',
  trainer: 'አሰልጣኝ',
  learner: 'ሰልጣኝ',
  system_admin: 'የስርዓት አስተዳዳሪ',
  'Course Owner': 'የኮርስ ባለቤት',
  'Content Approver': 'የይዘት አጽዳቂ',
  'Training Administrator': 'የስልጠና አስተዳዳሪ',
  Trainer: 'አሰልጣኝ',
  Learner: 'ሰልጣኝ',
  'System Administrator': 'የስርዓት አስተዳዳሪ',
};

const PERMISSION_DESCRIPTIONS_AM: Record<string, string> = {
  // Course
  'course.create': 'ኮርስ ፍጠር',
  'course.update.own': 'የራስን ኮርስ አሻሽል',
  'course.update.all': 'ማንኛውንም ኮርስ አሻሽል',
  'course.view.own': 'የተፈጠሩ ኮርሶችን ተመልከት',
  'course.view.all': 'ሁሉንም ኮርሶች ተመልከት',
  'course.view.assigned': 'የተመደቡልኝን ኮርሶች ተመልከት',
  'course.browse': 'የታተሙ ኮርሶችን አስስ',
  'course.submit_approval': 'ለማጽደቅ ጥያቄ አቅርብ',
  'course.approve_reject': 'በግምገማ ላይ ያለን ኮርስ አጽድቅ ወይም ውድቅ አድርግ',
  'course.publish': 'ኮርስ አትም',
  'course.unpublish': 'ኮርስ ከህትመት አንሳ',
  'course.archive': 'ኮርስ በረቂቅ ሁኔታ አስቀምጥ',
  'course.delete': 'ኮርስ ሰርዝ',
  'course.assign_trainer': 'አሰልጣኝ መድብ',
  'course.manage_curriculum': 'ሞጁሎችን እና ትምህርቶችን አስተዳድር',
  'course.view_enrollments': 'የኮርስ ምዝገባዎችን ተመልከት',

  // Assessment / Quiz
  'quiz.create': 'ፈተና / ምዘና ፍጠር',
  'quiz.grade': 'የፈተና መልሶችን አርም',
  'assessment.submit': 'ፈተና ውሰድ / አስገባ',
  'question_bank.manage': 'የጥያቄዎች ባንክን አስተዳድር (ፍጠር፣ አርትዕ፣ ሰርዝ)',

  // Attendance
  'attendance.view': 'ክትትል ተመልከት',
  'attendance.manage': 'ክትትል መዝግብ',
  'attendance.override': 'የመገኘት መዝገብ አሻሽል',
  'attendance.checkin': 'የተማሪ የራስ መገኘት መዝግብ',

  // Result & Students
  'result.view.all': 'የማንኛውንም ተማሪ ውጤት ተመልከት',
  'result.view.own': 'የራስን ውጤት ተመልከት',
  'student.view': 'የተመዘገቡ ተማሪዎችን ተመልከት',
  'student.manage': 'ተማሪዎችን መዝግብ / ሰርዝ (በጅምላ)',
  'enrollment.self': 'የራስ ምዝገባ / መሰረዝ',
  'enrollment.view_all': 'የሁሉም ተጠቃሚዎች ምዝገባዎችን ተመልከት',

  // Live Sessions
  'live_session.manage_all': 'ሁሉንም የቀጥታ ክፍለ-ጊዜዎች አስተዳድር',
  'live_session.manage_own': 'የራስ የቀጥታ ክፍለ-ጊዜዎችን አስተዳድር',

  // Progress
  'progress.view': 'የተማሪዎችን እድገት ተመልከት',
  'progress.mark_own': 'ትምህርት ማጠናቀቅን መዝግብ',

  // Certificate
  'certificate.view': 'የራስን ሰርተፊኬት ተመልከት',
  'certificate.manage': 'የሰርተፊኬት ቅጾችን አስተዳድር እና አትም',

  // Users & System
  'user.view': 'ተጠቃሚዎችን ተመልከት',
  'user.manage': 'ተጠቃሚዎችን አስተዳድር (ፍጠር፣ በጅምላ፣ አጽድቅ)',
  'role.view': 'ሚናዎችን ተመልከት',
  'role.manage': 'ሚናዎችን እና ምደባን አስተዳድር',
  'permission.manage': 'የፈቃዶች ማትሪክስን አርትዕ',
  'dashboard.stats': 'የአስተዳዳሪ ዳሽቦርድ ስታቲስቲክስ ተመልከት',
  'audit.view': 'የኦዲት መዝገብ ተመልከት',
  'course_policy.manage': 'የኮርስ ማጠናቀቂያ ፖሊሲን አስተዳድር',

  // Feedback
  'feedback.manage': 'የኮርስ ግብረ-መልስ አስተዳድር',
  'feedback.view': 'የኮርስ ግብረ-መልስ ተመልከት',
};

function humanizeResource(resource: string, isAmharic?: boolean): string {
  const norm = resource.toLowerCase();
  if (isAmharic && RESOURCE_NAMES_AM[norm]) {
    return RESOURCE_NAMES_AM[norm];
  }
  return resource
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  return Array.from(a).every((item) => b.has(item));
}

export default function RolesPermissionsPage() {
  const { currentUser, refreshPermissions } = useLms();
  const { tBilingual, isAmharic } = useTranslation();

  const getRoleLabel = (label: string, name?: string) => {
    if (!isAmharic) return label;
    if (name && ROLE_NAMES_AM[name]) return ROLE_NAMES_AM[name];
    if (ROLE_NAMES_AM[label]) return ROLE_NAMES_AM[label];
    return label;
  };
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roles, setRoles] = useState<ApiRoleWithPermissions[]>([]);
  const [registry, setRegistry] = useState<ApiPermissionsByResource>({});
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<ApiRoleWithPermissions | null>(null);
  const [view, setView] = useState<ViewMode>('table');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const allPermissions = useMemo<ApiPermission[]>(() => Object.values(registry).flat(), [registry]);
  const idByCode = useMemo(
    () => new Map(allPermissions.map((p) => [p.code, p.id])),
    [allPermissions],
  );
  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => {
        if (a.name === 'SYSTEM_ADMIN') return 1;
        if (b.name === 'SYSTEM_ADMIN') return -1;
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
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load the permission matrix.');
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
  const isLocked = selectedRole?.name === 'SYSTEM_ADMIN';
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
    try {
      const updated = await setRolePermissions(selectedRole.id, Array.from(draftIds));
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      // Refresh our own session too, in case the edited role is the signed-in admin's own —
      // the sidebar and gated pages should react without a re-login.
      void refreshPermissions();
      try {
        window.dispatchEvent(new CustomEvent('mor_permissions_updated'));
        localStorage.setItem('mor_permissions_updated_at', String(Date.now()));
      } catch {
        // storage fallback
      }
      toast.success(`${selectedRole.label} permissions updated live across the workspace.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraftIds(new Set(savedIds));
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleLabel.trim()) return;
    setCreating(true);
    try {
      const role = await createRole({ name: newRoleName.trim(), label: newRoleLabel.trim() });
      setRoles((prev) => [...prev, role]);
      setSelectedRoleId(role.id);
      setNewRoleName('');
      setNewRoleLabel('');
      setShowNewRole(false);
      toast.success(`Role "${role.label}" created successfully.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create role.');
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingId(roleToDelete.id);
    try {
      await deleteRole(roleToDelete.id);
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      setSelectedRoleId((current) => (current === roleToDelete.id ? null : current));
      toast.success(`Role "${roleToDelete.label}" was deleted.`);
      setRoleToDelete(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete role.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <PageShell
        role={currentUser?.role ?? 'system_admin'}
        title="Roles & Permissions"
        description="Control what each role can see and do, live."
      >
        <div className="space-y-4">
          <TableSkeleton rows={6} columns={4} />
        </div>
      </PageShell>
    );
  }

  if (loadError) {
    return (
      <PageShell
        role={currentUser?.role ?? 'system_admin'}
        title="Roles & Permissions"
        description="Control what each role can see and do, live."
      >
        <EmptyState title="Couldn't load the matrix" description={loadError} />
      </PageShell>
    );
  }

  return (
    <PageShell
      role={currentUser?.role ?? 'system_admin'}
      title={tBilingual('Roles & Permissions', 'ሚናዎች እና ፈቃዶች')}
      description={tBilingual(
        'Toggle exactly what each role can do. Changes apply to everyone with that role within ~15 seconds — no redeploy, no re-login.',
        'እያንዳንዱ ሚና ምን ማድረግ እንደሚችል በትክክል ይወስኑ። ለውጦች በ 15 ሰከንዶች ውስጥ በዚያ ሚና ውስጥ ባሉ ሁሉም ተጠቃሚዎች ላይ ተፈጻሚ ይሆናሉ።',
      )}
      actions={<ViewToggle view={view} onChange={setView} />}
    >
      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRoles.map((role) => {
            const locked = role.name === 'SYSTEM_ADMIN';
            const expanded = expandedCardId === role.id;
            return (
              <Card key={role.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-slate-900">
                      {locked ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : null}
                      {getRoleLabel(role.label, role.name)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {role.description ||
                        tBilingual('No description provided.', 'ምንም መግለጫ አልተሰጠም።')}
                    </p>
                  </div>
                  {!role.isSystem ? (
                    <button
                      type="button"
                      title={tBilingual('Delete role', 'ሚና ሰርዝ')}
                      disabled={deletingId === role.id}
                      onClick={() => setRoleToDelete(role)}
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
                    {tBilingual(
                      `${role.permissionCodes.length} of ${allPermissions.length} permissions`,
                      `ከ ${allPermissions.length} ፈቃዶች ${role.permissionCodes.length} ተፈቅደዋል`,
                    )}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform',
                      expanded && 'rotate-180',
                    )}
                  />
                </button>
                {expanded ? (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissionCodes.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        {tBilingual('No permissions granted.', 'ምንም ፈቃዶች አልተሰጡም።')}
                      </span>
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
                    setView('table');
                  }}
                >
                  {tBilingual('Edit permissions', 'ፈቃዶችን አርትዕ')}
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
              <CardTitle>{tBilingual('Roles', 'ሚናዎች')}</CardTitle>
              <CardDescription>
                {tBilingual(
                  'Select a role to view or edit its permissions.',
                  'ፈቃዶቹን ለመመልከት ወይም ለማረም ሚና ይምረጡ።',
                )}
              </CardDescription>
            </div>

            <div className="flex flex-col p-2">
              {sortedRoles.map((role) => {
                const locked = role.name === 'SYSTEM_ADMIN';
                const active = role.id === selectedRoleId;
                return (
                  <div key={role.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={cn(
                        'flex flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        active
                          ? 'bg-gradient-to-r from-indigo-500/90 to-violet-500/80 text-white shadow-md shadow-indigo-500/20'
                          : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {locked ? (
                          <Lock
                            className={cn(
                              'h-3.5 w-3.5',
                              active ? 'text-white/80' : 'text-slate-400',
                            )}
                          />
                        ) : null}
                        {getRoleLabel(role.label, role.name)}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] tabular-nums',
                          active ? 'text-white/80' : 'text-slate-400',
                        )}
                      >
                        {role.permissionCodes.length}/{allPermissions.length}
                      </span>
                    </button>
                    {!role.isSystem ? (
                      <button
                        type="button"
                        title={tBilingual('Delete role', 'ሚና ሰርዝ')}
                        disabled={deletingId === role.id}
                        onClick={() => setRoleToDelete(role)}
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
                  <CardTitle>{getRoleLabel(selectedRole.label, selectedRole.name)}</CardTitle>
                  <CardDescription>
                    {tBilingual('Landing dashboard:', 'የመነሻ ዳሽቦርድ፡')}{' '}
                    <code className="text-slate-500">{selectedRole.dashboardPath}</code>
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewRole(true)}>
                    <Plus className="h-3.5 w-3.5" /> {tBilingual('Add Role', 'ሚና ጨምር')}
                  </Button>
                  {isLocked ? (
                    <Badge variant="slate">
                      <Lock className="h-3 w-3" />{' '}
                      {tBilingual(
                        'Locked — superuser, always all permissions',
                        'የተቆለፈ — ዋና አስተዳዳሪ፣ ሁልጊዜ ሙሉ ፈቃዶች',
                      )}
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={!isDirty || saving}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> {tBilingual('Reset', 'ወደ ነበረበት መልስ')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                        isLoading={saving}
                        loadingText={tBilingual('Saving…', 'በማስቀመጥ ላይ…')}
                      >
                        <Save className="h-3.5 w-3.5" /> {tBilingual('Save changes', 'ለውጦችን አስቀምጥ')}
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
                          {humanizeResource(resource, isAmharic)}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {isAmharic
                            ? `ከ ${permissions.length} ውስጥ ${checkedCount} ተመርጧል`
                            : `${checkedCount} of ${permissions.length} checked`}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {permissions.map((permission) => {
                          const checked = isLocked ? true : draftIds.has(permission.id);
                          return (
                            <label
                              key={permission.id}
                              className={cn(
                                'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                                isLocked
                                  ? 'cursor-not-allowed border-slate-100 bg-slate-50/70'
                                  : 'cursor-pointer border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/30',
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
                                  {isAmharic
                                    ? PERMISSION_DESCRIPTIONS_AM[permission.code] ||
                                      permission.description ||
                                      permission.code
                                    : (permission.description ?? permission.code)}
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

      <WorkspaceDetailOverlay
        open={showNewRole}
        onClose={() => setShowNewRole(false)}
        title={tBilingual('Create New Role', 'አዲስ ሚና ፍጠር')}
        subtitle={tBilingual(
          'Configure custom role identifiers and assign granular RBAC permissions.',
          'ብጁ ሚና መለያዎችን ያዋቅሩ እና ዝርዝር የፍቃድ ገደቦችን ይመድቡ።',
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewRole(false)}>
              {tBilingual('Cancel', 'ሰርዝ')}
            </Button>
            <Button
              size="sm"
              disabled={creating || !newRoleName.trim() || !newRoleLabel.trim()}
              isLoading={creating}
              loadingText={tBilingual('Creating role…', 'ሚና በመፍጠር ላይ…')}
              onClick={handleCreateRole}
            >
              {tBilingual('Create role', 'ሚና ፍጠር')}
            </Button>
          </div>
        }
      >
        <div className="w-full space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                {tBilingual('Role Code Name *', 'የሚና ኮድ ስም *')}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 font-mono"
                placeholder="e.g. REGIONAL_COORDINATOR"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                {tBilingual(
                  'Unique uppercase identifier used by backend authorization guards.',
                  'በስርዓቱ ውስጥ ለፍቃድ ማረጋገጫ የሚያገለግል ልዩ የካፒታል ፊደላት መለያ።',
                )}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                {tBilingual('Display Label *', 'የማሳያ ስም *')}
              </label>
              <input
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="e.g. Regional Coordinator"
                value={newRoleLabel}
                onChange={(e) => setNewRoleLabel(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                {tBilingual(
                  'Human-readable title shown in user directory and role badges.',
                  'በተጠቃሚዎች ማውጫ እና በሚና ባጆች ላይ የሚታይ ግልጽ ስም።',
                )}
              </p>
            </div>
          </div>
        </div>
      </WorkspaceDetailOverlay>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={confirmDeleteRole}
        title={tBilingual('Delete Role', 'ሚና ሰርዝ')}
        description={
          <>
            {tBilingual('Are you sure you want to delete role', 'ይህንን ሚና መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት')}{' '}
            <span className="font-semibold text-slate-800">&quot;{roleToDelete?.label}&quot;</span>?{' '}
            {tBilingual(
              'This action cannot be undone and will revoke permissions for all users assigned to this role.',
              'ይህ እርምጃ ሊመለስ አይችልም እንዲሁም በዚህ ሚና ለተመደቡ ተጠቃሚዎች ሁሉ ፈቃዶችን ይሰርዛል።',
            )}
          </>
        }
        confirmText={tBilingual('Delete Role', 'ሚና ሰርዝ')}
        variant="danger"
        isLoading={Boolean(deletingId)}
      />
    </PageShell>
  );
}
