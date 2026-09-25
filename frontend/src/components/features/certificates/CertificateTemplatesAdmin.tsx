'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FilePlus2,
  ImagePlus,
  Loader2,
  Move,
  PenTool,
  Plus,
  QrCode,
  Send,
  ShieldCheck,
  Stamp,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { usePagination } from '@/lib/usePagination';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from '@/lib/toast';
import {
  activateCertificateTemplate,
  createCertificateTemplate,
  deleteCertificateTemplate,
  duplicateCertificateTemplate,
  fetchCertificateTemplates,
  updateCertificateTemplate,
} from '@/lib/api/certificates';
import { uploadAttachment, uploadCertificateTemplate } from '@/lib/api/files';
import type { ApiCertificateField, ApiCertificateTemplate } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { CertificateRenderer } from './CertificateRenderer';

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-700 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10';

const labelClass = 'mb-1 block text-[11px] font-bold text-slate-600 uppercase tracking-wider';

export function CertificateTemplatesAdmin() {
  const [templates, setTemplates] = useState<ApiCertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState(true);

  // Editor states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCertificateTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'text' | 'background'>('assets');
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [fields, setFields] = useState<ApiCertificateField[]>([]);
  const [uploadingAssetKey, setUploadingAssetKey] = useState<string | null>(null);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    templates,
    6,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCertificateTemplates();
      setTemplates(data);
    } catch (err) {
      setFlash(String(err));
      setFlashOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const notify = (ok: boolean, message: string) => {
    setFlashOk(ok);
    setFlash(message);
    if (ok) {
      toast.success(message);
    } else {
      toast.error(message);
    }
    setTimeout(() => {
      setFlash((current) => (current === message ? null : current));
    }, 5000);
  };

  // Helper to get or update a specific field
  const getField = (key: string): ApiCertificateField | undefined => {
    return fields.find((f) => f.key === key);
  };

  const updateField = (key: string, updates: Partial<ApiCertificateField>) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      }
      return [...prev, { key, ...updates }];
    });
  };

  // Drag-and-drop position updater
  const handleUpdateFieldPosition = (key: string, x: number, y: number) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], x, y };
        return next;
      }
      return [...prev, { key, x, y, visible: true }];
    });
  };

  const handleAssetUpload = async (key: string, file: File) => {
    setUploadingAssetKey(key);
    try {
      const localPreviewUrl = URL.createObjectURL(file);
      updateField(key, { imageUrl: localPreviewUrl, visible: true });

      const uploaded = await uploadAttachment(file, { purpose: 'certificate_asset' });
      if (uploaded.fileUrl) {
        updateField(key, { imageUrl: uploaded.fileUrl });
      }
      notify(true, `Uploaded asset successfully.`);
    } catch {
      notify(false, `Upload failed. Using local image preview.`);
    } finally {
      setUploadingAssetKey(null);
    }
  };

  // Multi-stamp actions
  const addStamp = () => {
    const newKey = `stamp_${Date.now()}`;
    const newStamp: ApiCertificateField = {
      key: newKey,
      x: 50,
      y: 82,
      size: 85,
      visible: true,
    };
    setFields((prev) => [...prev, newStamp]);
    setSelectedFieldKey(newKey);
    notify(true, 'Added new stamp. Drag it on the canvas to place it.');
  };

  const removeStamp = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key));
    if (selectedFieldKey === key) setSelectedFieldKey(null);
  };

  // Multi-signature actions
  const addSignature = () => {
    const newKey = `signature_${Date.now()}`;
    const newSig: ApiCertificateField = {
      key: newKey,
      x: 50,
      y: 82,
      text: '',
      title: '',
      width: 130,
      visible: true,
    };
    setFields((prev) => [...prev, newSig]);
    setSelectedFieldKey(newKey);
    notify(true, 'Added new signature. Drag it on the canvas to place it.');
  };

  const removeSignature = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key));
    if (selectedFieldKey === key) setSelectedFieldKey(null);
  };

  const openCreate = () => {
    setEditing(null);
    setName('New Executive Certificate Template');
    setDescription(
      'Professional certificate template featuring customizable company logo, dynamic QR code, stamps, and signatures.',
    );
    setBackgroundUrl(null);
    setBackgroundFile(null);
    setFields([
      {
        key: 'companyLogo',
        x: 14,
        y: 12,
        width: 140,
        text: 'Analyst Skill',
        title: 'eLearning Platform',
        visible: true,
      },
      { key: 'qrCode', x: 10, y: 28, size: 68, visible: true },
      { key: 'verifiedBadge', x: 88, y: 12, size: 75, text: 'VERIFIED', visible: true },
      {
        key: 'certificateTitle',
        x: 50,
        y: 20,
        size: 36,
        text: 'Certificate of Training',
        color: '#1e293b',
        bold: true,
        align: 'center',
      },
      {
        key: 'preamble',
        x: 50,
        y: 26,
        size: 13,
        text: 'THIS IS TO CERTIFY THAT',
        color: '#64748b',
        align: 'center',
      },
      { key: 'holderName', x: 50, y: 36, size: 38, color: '#0f172a', bold: true, align: 'center' },
      {
        key: 'completionText',
        x: 50,
        y: 44,
        size: 13,
        text: 'has successfully completed the training course',
        color: '#64748b',
        align: 'center',
      },
      { key: 'courseTitle', x: 50, y: 52, size: 24, color: '#1e293b', bold: true, align: 'center' },
      {
        key: 'courseDescription',
        x: 50,
        y: 60,
        size: 12,
        text: 'by participating & completing all modules and passing all evaluation tests.',
        color: '#64748b',
        align: 'center',
      },
      { key: 'courseHours', x: 15, y: 70, size: 12, color: '#1e293b', align: 'left' },
      { key: 'issuedAt', x: 85, y: 70, size: 12, color: '#1e293b', align: 'right' },
      {
        key: 'courseHours',
        x: 18,
        y: 72,
        size: 12,
        text: 'Course Hours :',
        color: '#1e293b',
        align: 'left',
        visible: true,
      },
      {
        key: 'issuedAt',
        x: 82,
        y: 72,
        size: 12,
        text: 'Date :',
        color: '#1e293b',
        align: 'right',
        visible: true,
      },
      { key: 'stamp', x: 50, y: 82, size: 85, visible: true },
      {
        key: 'signature1',
        x: 22,
        y: 82,
        text: 'MD. Morshedul Alam ACMA',
        title: 'CEO, Analyst Skill',
        width: 130,
        visible: true,
      },
      {
        key: 'signature2',
        x: 78,
        y: 82,
        text: 'Authorized Signatory',
        title: 'Director General, Ministry of Revenues',
        width: 130,
        visible: true,
      },
      {
        key: 'footerNote',
        x: 50,
        y: 96,
        size: 9,
        text: '~ Ministry of Revenues ETIMS Academy · Verified Credential ~',
        color: '#64748b',
        align: 'center',
      },
      { key: 'signature1', x: 50, y: 82, text: '', title: '', width: 130, visible: true },
      {
        key: 'footerNote',
        x: 50,
        y: 96,
        size: 9,
        text: '~ Analyst Skill is a professional e-Learning platform. Verify this certificate online ~',
        color: '#64748b',
        align: 'center',
        visible: true,
      },
    ]);
    setActiveTab('assets');
    setSelectedFieldKey(null);
    setEditorOpen(true);
  };

  const openEdit = (template: ApiCertificateTemplate) => {
    setEditing(template);
    setName(template.name);
    setDescription(template.description ?? '');
    setBackgroundUrl(template.backgroundUrl);
    setBackgroundFile(null);
    setFields(Array.isArray(template.fields) ? [...template.fields] : []);
    setActiveTab('assets');
    setSelectedFieldKey(null);
    setEditorOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      notify(false, 'Template name is required.');
      return;
    }
    setBusy(true);
    try {
      let resolvedBackground = backgroundUrl;
      if (backgroundFile) {
        try {
          const upload = await uploadCertificateTemplate(backgroundFile);
          resolvedBackground = upload.backgroundUrl;
        } catch {
          notify(false, 'Background image upload failed.');
          setBusy(false);
          return;
        }
      }

      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        backgroundUrl: resolvedBackground,
        fields,
      };

      if (editing) {
        await updateCertificateTemplate(editing.id, body);
        notify(true, `Template "${name}" updated successfully.`);
      } else {
        await createCertificateTemplate(body);
        notify(true, `Template "${name}" created successfully.`);
      }
      setEditorOpen(false);
      await refresh();
    } catch (err: any) {
      notify(false, `Failed to save template: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const activate = async (id: string) => {
    setBusy(true);
    try {
      await activateCertificateTemplate(id);
      notify(
        true,
        'Template activated! All new course completions will now issue this certificate design.',
      );
      await refresh();
    } catch (err: any) {
      notify(false, `Failed to activate: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (id: string) => {
    setBusy(true);
    try {
      await duplicateCertificateTemplate(id);
      notify(true, 'Template duplicated. You can now customize it independently.');
      await refresh();
    } catch (err: any) {
      notify(false, `Failed to duplicate: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!deletingTemplate) return;
    setBusy(true);
    try {
      await deleteCertificateTemplate(deletingTemplate.id);
      notify(true, `Template "${deletingTemplate.name}" deleted.`);
      setDeletingTemplate(null);
      await refresh();
    } catch (err: any) {
      notify(false, `Failed to delete template: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  // Live draft template for visual renderer preview
  const liveDraftTemplate: ApiCertificateTemplate = useMemo(() => {
    return {
      id: editing?.id || 'preview-id',
      name,
      description,
      isActive: editing?.isActive ?? false,
      backgroundUrl,
      fields,
      version: editing?.version ?? 1,
      createdById: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [editing, name, description, backgroundUrl, fields]);

  // Derived asset fields
  const logoField = getField('companyLogo') ||
    getField('logo') || {
      key: 'companyLogo',
      x: 14,
      y: 12,
      width: 140,
      text: 'Analyst Skill',
      visible: true,
    };
  const qrField = getField('qrCode') || { key: 'qrCode', x: 10, y: 28, size: 68, visible: true };
  const verifiedBadgeField = getField('verifiedBadge') || {
    key: 'verifiedBadge',
    x: 88,
    y: 12,
    text: 'VERIFIED',
    visible: true,
  };
  const titleField = getField('certificateTitle') || getField('headerTitle');
  const courseHoursField = getField('courseHours') || {
    key: 'courseHours',
    x: 18,
    y: 72,
    text: 'Course Hours :',
    visible: true,
  };
  const issuedAtField = getField('issuedAt') || {
    key: 'issuedAt',
    x: 82,
    y: 72,
    text: 'Date :',
    visible: true,
  };
  const footerNoteField = getField('footerNote') || {
    key: 'footerNote',
    x: 50,
    y: 96,
    text: '~ Analyst Skill is a professional e-Learning platform. Verify this certificate online ~',
    visible: true,
  };

  // Stamps & Signatures lists
  const stampFields = useMemo(() => {
    return fields.filter((f) => f.key === 'stamp' || f.key.startsWith('stamp'));
  }, [fields]);

  const signatureFields = useMemo(() => {
    return fields.filter(
      (f) => f.key === 'signature' || f.key.startsWith('signature') || f.key.startsWith('sig_'),
    );
  }, [fields]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
              Certificate Templates
            </h2>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {templates.length} templates seeded
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Configure, brand, and manage official certificate designs. Drag-and-drop brand assets,
            upload PNG seals and signatures, and activate the live platform template.
          </p>
        </div>

        <Button onClick={openCreate} disabled={busy} className="shrink-0 gap-2">
          <FilePlus2 className="h-4 w-4" />
          Create New Template
        </Button>
      </div>

      {flash && (
        <div
          className={cn(
            'rounded-xl border p-3.5 text-xs font-medium flex items-center justify-between gap-3 shadow-2xs animate-fade-in',
            flashOk
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800',
          )}
        >
          <div className="flex items-center gap-2">
            {flashOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <X className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{flash}</span>
          </div>
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-xs">Loading certificate templates…</p>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No certificate templates found"
          description="Create your first template to define the layout, company logo, stamp, and dual signatures for issued course certificates."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((template) => {
            const hasStamp = (template.fields ?? []).some((f) => f.key.startsWith('stamp'));
            const hasSigs = (template.fields ?? []).some((f) => f.key.startsWith('sig'));

            return (
              <div
                key={template.id}
                className={cn(
                  'flex flex-col justify-between overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:shadow-md',
                  template.isActive
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                    : 'border-slate-200/90 shadow-2xs',
                )}
              >
                <div>
                  {/* Template Visual Thumbnail */}
                  <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden group">
                    <div className="absolute inset-0 flex items-center justify-center transform scale-[0.38] origin-center pointer-events-none select-none">
                      <div className="w-[840px]">
                        <CertificateRenderer
                          template={template}
                          studentName="Meron Kassa"
                          courseTitle="Advanced Excel &amp; Data Analytics for Revenue Reporting"
                          completionDate="23 September 2026"
                          certificateNumber="ETIMS-CERT-2026-0001"
                          verificationCode="MOR-VERIF-778"
                          durationHours={30}
                        />
                      </div>
                    </div>

                    {/* Gradient Overlay & Badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30 pointer-events-none" />

                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <Badge
                        variant={template.isActive ? 'amber' : 'slate'}
                        className={cn(
                          'shadow-xs font-bold text-[11px]',
                          template.isActive && 'bg-amber-500 text-slate-950 border-amber-600',
                        )}
                      >
                        {template.isActive ? '★ Active Template' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="absolute right-3 top-3">
                      <Badge
                        variant="outline"
                        className="bg-slate-900/80 text-white border-white/20 text-[10px]"
                      >
                        v{template.version}
                      </Badge>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/90">
                      <span className="font-semibold truncate pr-2">{template.name}</span>
                      <span className="text-[10px] text-white/70 shrink-0">
                        {(template.fields ?? []).length} elements
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 truncate">
                        {template.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {template.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        <QrCode className="h-3 w-3 text-indigo-600" /> Dynamic QR
                      </span>
                      {hasStamp && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          <Stamp className="h-3 w-3 text-amber-600" /> Official Stamp
                        </span>
                      )}
                      {hasSigs && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          <PenTool className="h-3 w-3 text-emerald-600" /> Authorized Signatures
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                  <div className="flex items-center justify-between gap-2 pt-3">
                    <div className="flex items-center gap-2">
                      {!template.isActive ? (
                        <Button
                          size="sm"
                          variant="success"
                          disabled={busy}
                          onClick={() => void activate(template.id)}
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="h-3 w-3" />
                          Set Active
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 px-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Live Default
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => openEdit(template)}
                        className="text-xs"
                      >
                        Customize
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void duplicate(template.id)}
                        disabled={busy}
                        title="Duplicate template"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeletingTemplate({ id: template.id, name: template.name })
                        }
                        disabled={busy}
                        title="Delete template"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[6, 12, 24, 48]}
      />

      {/* Visual Template Customizer & Drag-and-Drop Canvas Overlay */}
      <WorkspaceDetailOverlay
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? `Customize: ${name}` : 'Create Certificate Template'}
        subtitle="Drag brand assets directly on the live canvas to position them. Upload PNG stamps, dual signatures, and company logos."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void save()} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        }
      >
        <div className="w-full space-y-6 pb-12">
          {/* Top metadata row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Template Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Modern Executive (Analyst Skill)"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description / Notes</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal notes or purpose of this design"
                className={inputClass}
              />
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={cn(
                'pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5',
                activeTab === 'assets'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              <Stamp className="h-3.5 w-3.5" />
              Brand Assets (Logo, Stamps, Signatures, QR)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={cn(
                'pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5',
                activeTab === 'text'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              <Type className="h-3.5 w-3.5" />
              Typography &amp; Content
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('background')}
              className={cn(
                'pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5',
                activeTab === 'background'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Background Canvas
            </button>
          </div>

          {/* 2-Column Split: Controls on Left, Real-Time Interactive Draggable Canvas on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Controls Column */}
            <div className="lg:col-span-5 space-y-5">
              {/* Info banner explaining drag-and-drop */}
              <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 to-blue-50/40 p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
                <Move className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Visual Drag Positioning:</strong> Drag any logo, stamp, signature, or QR
                  code directly on the preview to place it. No manual X/Y coordinates needed!
                </p>
              </div>

              {activeTab === 'assets' && (
                <div className="space-y-4">
                  {/* 1. Company Logo Asset */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <ImagePlus className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Company Logo &amp; Brand
                          </h4>
                          <p className="text-[10px] text-slate-400">Drag on preview to position</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={logoField.visible !== false}
                          onChange={(e) =>
                            updateField(logoField.key, { visible: e.target.checked })
                          }
                          className="rounded accent-indigo-600"
                        />
                        Visible
                      </label>
                    </div>

                    {/* Logo Image Preview & Upload */}
                    <div className="space-y-2">
                      {logoField.imageUrl ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoField.imageUrl}
                            alt="Logo preview"
                            className="h-9 max-w-[140px] object-contain"
                          />
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:underline">
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleAssetUpload(logoField.key, f);
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => updateField(logoField.key, { imageUrl: undefined })}
                              className="text-xs text-rose-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
                          <Upload className="h-3.5 w-3.5 text-slate-500" />
                          {uploadingAssetKey === logoField.key
                            ? 'Uploading Logo…'
                            : 'Upload Company Logo (PNG / JPG)'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void handleAssetUpload(logoField.key, f);
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelClass}>Brand Name</label>
                        <input
                          value={logoField.text ?? 'Analyst Skill'}
                          onChange={(e) => updateField(logoField.key, { text: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Subtitle / Tagline</label>
                        <input
                          value={logoField.title ?? 'eLearning Platform'}
                          onChange={(e) => updateField(logoField.key, { title: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Logo Max Width</span>
                        <span className="font-mono">{logoField.width ?? 140}px</span>
                      </div>
                      <input
                        type="range"
                        min={60}
                        max={240}
                        value={logoField.width ?? 140}
                        onChange={(e) =>
                          updateField(logoField.key, { width: Number(e.target.value) })
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>

                  {/* 2. Official Stamps (Multiple Stamps, PNG uploads, drag-and-drop) */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <Stamp className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Official Stamps &amp; Seals
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Upload PNG seal &amp; drag to position
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addStamp}
                        className="text-xs gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Stamp
                      </Button>
                    </div>

                    {stampFields.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No stamps currently added. Click &ldquo;Add Stamp&rdquo; to place an
                        official seal.
                      </p>
                    ) : (
                      stampFields.map((stamp, idx) => (
                        <div
                          key={stamp.key}
                          className={cn(
                            'p-3 rounded-xl border space-y-3 transition-all',
                            selectedFieldKey === stamp.key
                              ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30'
                              : 'border-slate-200 bg-slate-50/50',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Stamp className="h-3.5 w-3.5 text-amber-600" />
                              Official Stamp #{idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-semibold text-slate-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={stamp.visible !== false}
                                  onChange={(e) =>
                                    updateField(stamp.key, { visible: e.target.checked })
                                  }
                                  className="rounded accent-amber-600 mr-1"
                                />
                                Visible
                              </label>
                              <button
                                type="button"
                                onClick={() => removeStamp(stamp.key)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Delete stamp"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Stamp PNG upload */}
                          {stamp.imageUrl ? (
                            <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={stamp.imageUrl}
                                alt="Stamp preview"
                                className="h-10 w-10 object-contain drop-shadow-xs"
                              />
                              <div className="flex items-center gap-2 text-xs">
                                <label className="cursor-pointer font-semibold text-amber-700 hover:underline">
                                  Change PNG
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) void handleAssetUpload(stamp.key, f);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => updateField(stamp.key, { imageUrl: undefined })}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  Use Vector Seal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50/50 transition">
                              <Upload className="h-3.5 w-3.5 text-amber-600" />
                              {uploadingAssetKey === stamp.key
                                ? 'Uploading Stamp PNG…'
                                : 'Upload Stamp PNG Image'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleAssetUpload(stamp.key, f);
                                }}
                              />
                            </label>
                          )}

                          {/* Size Slider (Updates live) */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                              <span>Stamp Size</span>
                              <span className="font-mono">{stamp.size ?? 85}px</span>
                            </div>
                            <input
                              type="range"
                              min={40}
                              max={160}
                              value={stamp.size ?? 85}
                              onChange={(e) =>
                                updateField(stamp.key, { size: Number(e.target.value) })
                              }
                              className="w-full accent-amber-600"
                            />
                          </div>

                          <p className="text-[10px] text-slate-400 italic">
                            💡 Drag this stamp on the live canvas preview to move it anywhere.
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 3. Authorized Signatures (Multiple Signatures, PNG upload or cursive) */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <PenTool className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Authorized Signatories
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Add signatures &amp; drag anywhere
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addSignature}
                        className="text-xs gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Signatory
                      </Button>
                    </div>

                    {signatureFields.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No signatories added. Click &ldquo;Add Signatory&rdquo; to place a
                        signature.
                      </p>
                    ) : (
                      signatureFields.map((sig, idx) => (
                        <div
                          key={sig.key}
                          className={cn(
                            'p-3.5 rounded-xl border space-y-3 transition-all',
                            selectedFieldKey === sig.key
                              ? 'border-emerald-400 bg-emerald-50/20 ring-1 ring-emerald-400/30'
                              : 'border-slate-200 bg-slate-50/50',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <PenTool className="h-3.5 w-3.5 text-emerald-600" />
                              Signatory #{idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-semibold text-slate-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sig.visible !== false}
                                  onChange={(e) =>
                                    updateField(sig.key, { visible: e.target.checked })
                                  }
                                  className="rounded accent-emerald-600 mr-1"
                                />
                                Visible
                              </label>
                              <button
                                type="button"
                                onClick={() => removeSignature(sig.key)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Delete signature"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelClass}>Signer Name</label>
                              <input
                                value={sig.text ?? ''}
                                onChange={(e) => updateField(sig.key, { text: e.target.value })}
                                placeholder="e.g. Authorized Signatory"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Signer Title</label>
                              <input
                                value={sig.title ?? ''}
                                onChange={(e) => updateField(sig.key, { title: e.target.value })}
                                placeholder="e.g. Executive Director"
                                className={inputClass}
                              />
                            </div>
                          </div>

                          {/* Signature PNG upload */}
                          {sig.imageUrl ? (
                            <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sig.imageUrl}
                                alt="Signature preview"
                                className="h-8 max-w-[120px] object-contain"
                              />
                              <div className="flex items-center gap-2 text-xs">
                                <label className="cursor-pointer font-semibold text-emerald-700 hover:underline">
                                  Change PNG
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) void handleAssetUpload(sig.key, f);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => updateField(sig.key, { imageUrl: undefined })}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  Use Cursive Font
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50/50 transition">
                              <Upload className="h-3.5 w-3.5 text-emerald-600" />
                              {uploadingAssetKey === sig.key
                                ? 'Uploading Signature…'
                                : 'Upload Signature PNG (Transparent)'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleAssetUpload(sig.key, f);
                                }}
                              />
                            </label>
                          )}

                          {/* Width Slider (Updates live) */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                              <span>Signature Width</span>
                              <span className="font-mono">{sig.width ?? 130}px</span>
                            </div>
                            <input
                              type="range"
                              min={80}
                              max={220}
                              value={sig.width ?? 130}
                              onChange={(e) =>
                                updateField(sig.key, { width: Number(e.target.value) })
                              }
                              className="w-full accent-emerald-600"
                            />
                          </div>

                          <p className="text-[10px] text-slate-400 italic">
                            💡 Drag this signature on the canvas to place it anywhere.
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 4. QR Code & Verified Badge */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <QrCode className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Dynamic QR Verification &amp; Badge
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Drag QR &amp; adjust size live
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={qrField.visible !== false}
                          onChange={(e) => updateField(qrField.key, { visible: e.target.checked })}
                          className="rounded accent-blue-600"
                        />
                        QR Visible
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>QR Code Size</span>
                        <span className="font-mono">{qrField.size ?? 68}px</span>
                      </div>
                      <input
                        type="range"
                        min={44}
                        max={110}
                        value={qrField.size ?? 68}
                        onChange={(e) => updateField(qrField.key, { size: Number(e.target.value) })}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex-1 mr-3">
                        <label className={labelClass}>Verified Badge Text</label>
                        <input
                          value={verifiedBadgeField.text ?? 'VERIFIED'}
                          onChange={(e) =>
                            updateField(verifiedBadgeField.key, { text: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer mt-4">
                        <input
                          type="checkbox"
                          checked={verifiedBadgeField.visible !== false}
                          onChange={(e) =>
                            updateField(verifiedBadgeField.key, { visible: e.target.checked })
                          }
                          className="rounded accent-indigo-600"
                        />
                        Badge Visible
                      </label>
                    </div>
                  </div>

                  {/* 5. Course Hours & Issue Date Placement */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Move className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Course Hours &amp; Issue Date
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Dynamic student data · Drag on canvas to place
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            Course Hours
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={courseHoursField.visible !== false}
                              onChange={(e) =>
                                updateField(courseHoursField.key, { visible: e.target.checked })
                              }
                              className="rounded accent-indigo-600"
                            />
                            Show
                          </label>
                        </div>
                        <input
                          value={courseHoursField.text ?? 'Course Hours :'}
                          onChange={(e) =>
                            updateField(courseHoursField.key, { text: e.target.value })
                          }
                          placeholder="Prefix, e.g. Course Hours :"
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-1.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            Date of Issue
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={issuedAtField.visible !== false}
                              onChange={(e) =>
                                updateField(issuedAtField.key, { visible: e.target.checked })
                              }
                              className="rounded accent-indigo-600"
                            />
                            Show
                          </label>
                        </div>
                        <input
                          value={issuedAtField.text ?? 'Date :'}
                          onChange={(e) => updateField(issuedAtField.key, { text: e.target.value })}
                          placeholder="Prefix, e.g. Date :"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      💡 Course hours and issue date are dynamic. Drag either label directly on the
                      canvas preview to reposition.
                    </p>
                  </div>

                  {/* 6. Platform Footer Note */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Type className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Platform Footer Note</h4>
                          <p className="text-[10px] text-slate-400">
                            Accreditation statement at the bottom
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            footerNoteField.visible !== false && Boolean(footerNoteField.text)
                          }
                          onChange={(e) =>
                            updateField(footerNoteField.key, { visible: e.target.checked })
                          }
                          className="rounded accent-indigo-600"
                        />
                        Visible
                      </label>
                    </div>

                    <div>
                      <textarea
                        value={footerNoteField.text ?? ''}
                        onChange={(e) =>
                          updateField(footerNoteField.key, { text: e.target.value, visible: true })
                        }
                        placeholder="e.g. ~ Analyst Skill is a professional e-Learning platform. Verify this certificate online ~"
                        rows={2}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateField(footerNoteField.key, { text: '', visible: false })
                        }
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        Remove / Clear Note
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(footerNoteField.key, {
                            text: '~ Analyst Skill is a professional e-Learning platform. Verify this certificate online ~',
                            visible: true,
                          })
                        }
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        Reset Default Note
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Certificate Header &amp; Statements
                    </h4>
                    <div>
                      <label className={labelClass}>Main Certificate Title</label>
                      <input
                        value={titleField?.text ?? 'Certificate of Training'}
                        onChange={(e) => updateField('certificateTitle', { text: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Title Color</label>
                      <input
                        type="color"
                        value={titleField?.color ?? '#1e293b'}
                        onChange={(e) => updateField('certificateTitle', { color: e.target.value })}
                        className="h-8 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Preamble Text</label>
                      <input
                        value={getField('preamble')?.text ?? 'THIS IS TO CERTIFY THAT'}
                        onChange={(e) => updateField('preamble', { text: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Completion Phrase</label>
                      <input
                        value={
                          getField('completionText')?.text ??
                          'has successfully completed the training course'
                        }
                        onChange={(e) => updateField('completionText', { text: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Evaluation Description</label>
                      <textarea
                        value={
                          getField('courseDescription')?.text ??
                          'by participating & completing all modules and passing all evaluation tests.'
                        }
                        onChange={(e) => updateField('courseDescription', { text: e.target.value })}
                        rows={2}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Course Hours & Issue Date in Typography tab as well */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Course Hours &amp; Date Metadata Labels
                    </h4>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            Course Hours
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={courseHoursField.visible !== false}
                              onChange={(e) =>
                                updateField(courseHoursField.key, { visible: e.target.checked })
                              }
                              className="rounded accent-indigo-600"
                            />
                            Show
                          </label>
                        </div>
                        <input
                          value={courseHoursField.text ?? 'Course Hours :'}
                          onChange={(e) =>
                            updateField(courseHoursField.key, { text: e.target.value })
                          }
                          placeholder="Prefix, e.g. Course Hours :"
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-1.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            Date of Issue
                          </label>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={issuedAtField.visible !== false}
                              onChange={(e) =>
                                updateField(issuedAtField.key, { visible: e.target.checked })
                              }
                              className="rounded accent-indigo-600"
                            />
                            Show
                          </label>
                        </div>
                        <input
                          value={issuedAtField.text ?? 'Date :'}
                          onChange={(e) => updateField(issuedAtField.key, { text: e.target.value })}
                          placeholder="Prefix, e.g. Date :"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Note in Typography tab as well */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">Platform Footer Note</h4>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            footerNoteField.visible !== false && Boolean(footerNoteField.text)
                          }
                          onChange={(e) =>
                            updateField(footerNoteField.key, { visible: e.target.checked })
                          }
                          className="rounded accent-indigo-600"
                        />
                        Visible
                      </label>
                    </div>

                    <textarea
                      value={footerNoteField.text ?? ''}
                      onChange={(e) =>
                        updateField(footerNoteField.key, { text: e.target.value, visible: true })
                      }
                      placeholder="e.g. ~ Analyst Skill is a professional e-Learning platform. Verify this certificate online ~"
                      rows={2}
                      className={inputClass}
                    />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateField(footerNoteField.key, { text: '', visible: false })
                        }
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        Remove / Clear Note
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(footerNoteField.key, {
                            text: '~ Analyst Skill is a professional e-Learning platform. Verify this certificate online ~',
                            visible: true,
                          })
                        }
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        Reset Default Note
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'background' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Custom Background Canvas (PNG / JPG)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Upload a full-bleed A4 landscape border or background artwork. When omitted,
                      the high-fidelity geometric vector frame renders automatically.
                    </p>

                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:bg-slate-50 transition">
                      <ImagePlus className="h-8 w-8 text-slate-400 mb-2" />
                      <span className="text-xs font-semibold text-indigo-600">
                        {backgroundFile ? backgroundFile.name : 'Click to select background image'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Recommended: 1754 × 1240 px (A4 Landscape)
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBackgroundFile(file);
                            setBackgroundUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    {backgroundUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBackgroundUrl(null);
                          setBackgroundFile(null);
                        }}
                        className="w-full text-rose-600 hover:text-rose-700"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Remove Custom Background (Revert to Geometric Frame)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Real-Time Interactive Draggable Canvas Preview */}
            <div className="lg:col-span-7 sticky top-4 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-indigo-600" />
                  Interactive Live Canvas Preview
                </span>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Move className="h-3 w-3" /> Drag elements to position
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-900/5 p-4 shadow-inner overflow-hidden">
                <CertificateRenderer
                  template={liveDraftTemplate}
                  editable={true}
                  selectedFieldKey={selectedFieldKey}
                  onSelectField={setSelectedFieldKey}
                  onUpdateFieldPosition={handleUpdateFieldPosition}
                  studentName="Meron Kassa"
                  courseTitle="Advanced Excel &amp; Data Analytics for Revenue Reporting"
                  completionDate="23 September 2026"
                  certificateNumber="ETIMS-CERT-2026-0001"
                  verificationCode="MOR-VERIF-778"
                  durationHours={30}
                />
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-1">
                Click &amp; drag any logo, stamp, signature, or QR code on the canvas. Sizing
                sliders update instantly in the preview.
              </p>
            </div>
          </div>
        </div>
      </WorkspaceDetailOverlay>

      {/* Confirm Certificate Template Deletion Modal */}
      <ConfirmModal
        open={Boolean(deletingTemplate)}
        title="Delete Certificate Template"
        description={`Are you sure you want to delete template "${deletingTemplate?.name}"? This action cannot be undone and will affect newly issued certificates.`}
        confirmText="Delete Template"
        variant="danger"
        isLoading={busy}
        onConfirm={confirmRemove}
        onClose={() => !busy && setDeletingTemplate(null)}
      />
    </div>
  );
}
