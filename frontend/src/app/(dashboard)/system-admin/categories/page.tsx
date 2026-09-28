'use client';

import { useEffect, useState } from 'react';
import { Edit3, Plus, Tag, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from '@/lib/toast';
import {
  fetchLookupCategories,
  createLookupCategory,
  updateLookupCategory,
  deleteLookupCategory,
  type ApiLookupCategory,
  type LookupCategoryType,
} from '@/lib/api/lookup-categories';

const TYPE_TABS: { type: LookupCategoryType; label: string; description: string }[] = [
  {
    type: 'COURSE_CATEGORY',
    label: 'Course Categories',
    description: 'Categories used to classify courses (e.g. Tax Law, Customs, Leadership).',
  },
  {
    type: 'COURSE_LEVEL',
    label: 'Course Levels',
    description: 'Difficulty levels available when creating a course (e.g. Basic, Advanced).',
  },
  {
    type: 'QUESTION_TYPE',
    label: 'Question Types',
    description: 'Assessment question formats (e.g. Multiple Choice, True/False, Short Answer).',
  },
];

const EMPTY_FORM = {
  value: '',
  labelEn: '',
  labelAm: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const [activeType, setActiveType] = useState<LookupCategoryType>('COURSE_CATEGORY');
  const [items, setItems] = useState<ApiLookupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiLookupCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiLookupCategory | null>(null);

  // Form
  const [form, setForm] = useState({ ...EMPTY_FORM });

  async function load() {
    setLoading(true);
    try {
      const data = await fetchLookupCategories(activeType, true);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function openEdit(item: ApiLookupCategory) {
    setEditing(item);
    setForm({
      value: item.value,
      labelEn: item.labelEn,
      labelAm: item.labelAm,
      description: item.description ?? '',
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.labelEn.trim() || !form.labelAm.trim()) {
      toast.error('English and Amharic labels are required');
      return;
    }
    if (!editing && !form.value.trim()) {
      toast.error('Value / slug is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateLookupCategory(editing.id, {
          labelEn: form.labelEn.trim(),
          labelAm: form.labelAm.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder),
        });
        toast.success('Category updated');
      } else {
        await createLookupCategory({
          type: activeType,
          value: form.value.trim(),
          labelEn: form.labelEn.trim(),
          labelAm: form.labelAm.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
          sortOrder: Number(form.sortOrder),
        });
        toast.success('Category created');
      }
      setModalOpen(false);
      void load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLookupCategory(deleteTarget.id);
      toast.success('Category deleted');
      setDeleteTarget(null);
      void load();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete category');
    }
  }

  async function toggleActive(item: ApiLookupCategory) {
    try {
      await updateLookupCategory(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'Category deactivated' : 'Category activated');
      void load();
    } catch {
      toast.error('Failed to update status');
    }
  }

  const displayed = showInactive ? items : items.filter((i) => i.isActive);
  const currentTab = TYPE_TABS.find((t) => t.type === activeType)!;

  return (
    <PageShell
      role="system_admin"
      title="Lookup Categories"
      description="Manage dynamic category values used across course creation and assessments."
    >
      {/* Type Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActiveType(tab.type)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              activeType === tab.type
                ? 'border-indigo-600 bg-indigo-600 text-white shadow'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{currentTab.description}</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            {items.length} total · {items.filter((i) => i.isActive).length} active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description={`Add your first ${currentTab.label.toLowerCase()} to get started.`}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Value / Slug</th>
                <th className="px-4 py-3">English Label</th>
                <th className="px-4 py-3">Amharic Label</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${!item.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {item.value}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {item.labelEn}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.labelAm}</td>
                  <td className="px-4 py-3 text-slate-500">{item.sortOrder}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.isActive ? 'green' : 'slate'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title={item.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => void toggleActive(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        {item.isActive ? (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {editing ? 'Edit Category' : `New ${currentTab.label.replace(/s$/, '')}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{activeType}</p>
              </div>
            </div>

            <div className="space-y-4">
              {!editing && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Value / Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder="e.g. TAX_LAW (auto-uppercased)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white font-mono"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Unique key — used internally. Cannot be changed after creation.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    English Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.labelEn}
                    onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
                    placeholder="e.g. Tax Law"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Amharic Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.labelAm}
                    onChange={(e) => setForm((f) => ({ ...f, labelAm: e.target.value }))}
                    placeholder="e.g. የግብር ህግ"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief description..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} isLoading={saving}>
                {editing ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmModal
          open
          title="Delete Category"
          description={`Delete "${deleteTarget.labelEn}"? This cannot be undone. If courses reference this category they will keep their stored value, but it will no longer appear in dropdowns.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
