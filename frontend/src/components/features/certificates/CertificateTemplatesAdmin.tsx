"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  FilePlus2,
  ImagePlus,
  Loader2,
  Plus,
  Send,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  activateCertificateTemplate,
  createCertificateTemplate,
  deleteCertificateTemplate,
  duplicateCertificateTemplate,
  fetchCertificateTemplates,
  updateCertificateTemplate,
} from "@/lib/api/certificates";
import { uploadCertificateTemplate } from "@/lib/api/files";
import type {
  ApiCertificateField,
  ApiCertificateTemplate,
  BackendCertificateFieldAlign,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const FIELD_KEYS = [
  "holderName",
  "courseTitle",
  "courseCode",
  "orgName",
  "certificateNumber",
  "verificationCode",
  "issuedAt",
  "expiresAt",
];

const DEFAULT_FIELDS: FieldsDraft[] = [
  { key: "holderName", align: "center", x: 50, y: 38, size: 48, color: "#1e293b", bold: true },
  { key: "courseTitle", align: "center", x: 50, y: 52, size: 34, color: "#334155", bold: true },
  { key: "certificateNumber", align: "center", x: 50, y: 78, size: 14, color: "#64748b", bold: false },
  { key: "verificationCode", align: "center", x: 50, y: 82, size: 12, color: "#64748b", bold: false },
  { key: "issuedAt", align: "center", x: 50, y: 86, size: 12, color: "#64748b", bold: false },
];

const FIELD_LABELS: Record<string, string> = {
  holderName: "Holder name",
  courseTitle: "Course title",
  courseCode: "Course code",
  orgName: "Organization name",
  certificateNumber: "Certificate number",
  verificationCode: "Verification code",
  issuedAt: "Issue date",
  expiresAt: "Expiry date",
};

interface FieldsDraft {
  key: string;
  align: BackendCertificateFieldAlign;
  x: number;
  y: number;
  size: number;
  color: string;
  bold: boolean;
}

const blankField = (): FieldsDraft => ({
  key: "",
  align: "center",
  x: 50,
  y: 50,
  size: 20,
  color: "#334155",
  bold: false,
});

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function CertificateTemplatesAdmin() {
  const [templates, setTemplates] = useState<ApiCertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCertificateTemplate | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldsDraft[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await fetchCertificateTemplates());
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

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setBackgroundUrl(null);
    setBackgroundFile(null);
    setFields([...DEFAULT_FIELDS]);
    setEditorOpen(true);
  };

  const openEdit = (template: ApiCertificateTemplate) => {
    setEditing(template);
    setName(template.name);
    setDescription(template.description ?? "");
    setBackgroundUrl(template.backgroundUrl);
    setBackgroundFile(null);
    setFields(
      (template.fields ?? []).map((f) => ({
        key: f.key,
        align: f.align ?? "center",
        x: f.x ?? 50,
        y: f.y ?? 50,
        size: f.size ?? 20,
        color: f.color ?? "#334155",
        bold: f.bold ?? false,
      })),
    );
    setEditorOpen(true);
  };

  const notify = (ok: boolean, message: string) => {
    setFlashOk(ok);
    setFlash(message);
  };

  const save = async () => {
    if (!name.trim()) {
      notify(false, "Template name is required.");
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
          notify(false, "Background image upload failed.");
          setBusy(false);
          return;
        }
      }
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        backgroundUrl: resolvedBackground,
        fields: fields
          .filter((f) => f.key.trim() !== "")
          .map((f) => ({
            key: f.key.trim(),
            align: f.align,
            x: f.x,
            y: f.y,
            size: f.size,
            color: f.color,
            bold: f.bold,
          })) as ApiCertificateField[],
      };
      if (editing) {
        await updateCertificateTemplate(editing.id, body);
        notify(true, "Template updated.");
      } else {
        await createCertificateTemplate(body);
        notify(true, "Template created.");
      }
      setEditorOpen(false);
      await refresh();
    } catch (err) {
      notify(false, `Failed to save template: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  const activate = async (id: string) => {
    setBusy(true);
    try {
      await activateCertificateTemplate(id);
      notify(true, "Template is now active. New certificates will use it.");
      await refresh();
    } catch (err) {
      notify(false, `Failed to activate: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (id: string) => {
    setBusy(true);
    try {
      await duplicateCertificateTemplate(id);
      notify(true, "Duplicated. Activate it to use for new certificates.");
      await refresh();
    } catch (err) {
      notify(false, `Failed to duplicate: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteCertificateTemplate(id);
      notify(true, "Template deleted.");
      await refresh();
    } catch (err) {
      notify(false, `Failed to delete: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">Certificate Templates</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            The active template is used when issuing certificates for completed courses.
          </p>
        </div>
        <Button onClick={openCreate} disabled={busy}>
          <FilePlus2 className="h-4 w-4" />
          New template
        </Button>
      </div>

      {flash ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm",
            flashOk
              ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-700"
              : "border-red-200/70 bg-red-50/80 text-red-700",
          )}
        >
          {flash}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading templates…</p>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Create a template and activate it so completed courses issue certificates with your branding."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white shadow-sm",
                template.isActive ? "border-emerald-300/70 ring-1 ring-emerald-200/40" : "border-slate-200/80",
              )}
            >
              <div className="relative h-36 bg-slate-100">
                {template.backgroundUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={template.backgroundUrl}
                    alt={template.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <Award className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute left-2 top-2">
                  <Badge variant={template.isActive ? "green" : "slate"} dot>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="absolute right-2 top-2">
                  <Badge variant="outline">v{template.version}</Badge>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{template.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {template.description || "No description"}
                    </p>
                  </div>
                  <Badge variant="outline">{(template.fields ?? []).length} fields</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!template.isActive ? (
                    <Button size="sm" variant="success" disabled={busy} onClick={() => void activate(template.id)}>
                      <Send className="h-3.5 w-3.5" />
                      Activate
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => openEdit(template)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void duplicate(template.id)}>
                    Duplicate
                  </Button>
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => void remove(template.id, template.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="xl"
        title={editing ? "Edit template" : "New certificate template"}
        subtitle="Arrange the fields that will be rendered onto the certificate."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Template name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Background image (full-bleed, PNG / JPG)</label>
            <div className="flex items-center gap-3">
              <div className="relative h-24 w-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {backgroundUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={backgroundUrl} alt="Background preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                  <ImagePlus className="h-4 w-4" />
                  {backgroundFile ? backgroundFile.name : "Upload image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setBackgroundFile(file);
                        setBackgroundUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
                {backgroundUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBackgroundUrl(null);
                      setBackgroundFile(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove image
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFields([...DEFAULT_FIELDS])}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Use default layout
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelClass}>Fields</label>
              <Button size="sm" variant="outline" onClick={() => setFields((prev) => [...prev, blankField()])}>
                <Plus className="h-3.5 w-3.5" />
                Add field
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3"
                >
                  <div className="w-40">
                    <label className={labelClass}>Key</label>
                    <select
                      value={field.key}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === index ? { ...f, key: event.target.value } : f)),
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">Choose…</option>
                      {FIELD_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {FIELD_LABELS[key] ?? key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className={labelClass}>X %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={field.x}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === index ? { ...f, x: Number(event.target.value) } : f)),
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="w-20">
                    <label className={labelClass}>Y %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={field.y}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === index ? { ...f, y: Number(event.target.value) } : f)),
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="w-20">
                    <label className={labelClass}>Size pt</label>
                    <input
                      type="number"
                      min={6}
                      value={field.size}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === index ? { ...f, size: Number(event.target.value) } : f)),
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="w-24">
                    <label className={labelClass}>Align</label>
                    <select
                      value={field.align}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((f, i) =>
                            i === index
                              ? { ...f, align: event.target.value as BackendCertificateFieldAlign }
                              : f,
                          ),
                        )
                      }
                      className={inputClass}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="w-28">
                    <label className={labelClass}>Color</label>
                    <input
                      type="color"
                      value={field.color}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === index ? { ...f, color: event.target.value } : f)),
                        )
                      }
                      className="h-[38px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-1 shadow-sm"
                    />
                  </div>
                  <label className="mb-2.5 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={field.bold}
                      onChange={(event) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === index ? { ...f, bold: event.target.checked } : f)),
                        )
                      }
                      className="h-4 w-4 accent-indigo-600"
                    />
                    Bold
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mb-1 text-slate-400 hover:text-red-600"
                    onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {fields.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-center text-xs text-slate-400">
                  No fields. Without fields the certificate renders the default layout.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Save changes"
              ) : (
                "Create template"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}