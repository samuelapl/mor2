"use client";

import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Download, Trash2, UploadCloud, UserPlus } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROLE_LABELS, ROLES } from "@/constants/roles";
import type { Role } from "@/types";

interface RowDraft {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  password: string;
}

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (field !== "" || row.length > 0) {
        row.push(field);
      }
      field = "";
      if (row.length > 0) {
        rows.push(row);
        row = [];
      }
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeRole(value: string): Role {
  const candidate = value.trim().toLowerCase();
  const found = ROLES.find((role) => role === candidate);
  return found ?? "learner";
}

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BulkRegisterPage() {
  const { bulkRegisterUsers } = useLms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<"created" | "error" | null>(null);
  const [createdRows, setCreatedRows] = useState<RowDraft[]>([]);
  const [skippedRows, setSkippedRows] = useState<Array<{ email: string; reason: string }>>([]);
  const [saving, setSaving] = useState(false);

  const validRows = useMemo(
    () => rows.filter((row) => VALID_EMAIL.test(row.email.trim())),
    [rows],
  );

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const grid = parseCsv(text);
      if (grid.length === 0) return;
      const headerIndex = grid[0].some((cell) =>
        cell.toLowerCase().includes("email"),
      )
        ? 0
        : -1;
      const parsed: RowDraft[] = [];
      for (let i = headerIndex >= 0 ? headerIndex + 1 : 0; i < grid.length; i++) {
        const cells = grid[i];
        const firstName = (cells[0] ?? "").trim();
        const lastName = (cells[1] ?? "").trim();
        const email = (cells[2] ?? "").trim();
        const role = normalizeRole(cells[3] ?? "");
        const password = (cells[4] ?? "").trim();
        if (!firstName && !lastName && !email) continue;
        parsed.push({
          key: `row-${i}-${Date.now()}`,
          firstName,
          lastName,
          email,
          role,
          password,
        });
      }
      setRows(parsed);
      setFileName(file.name);
      setResult(null);
      setMessage(null);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = [
      "first_name,last_name,email,role,password",
      "Abebe,Kebede,abebe.kebede@mor.gov.et,learner,",
      "Sara,Ahmed,sara.ahmed@mor.gov.et,trainer,Welcome2026",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-register-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const patchRow = (key: string, patch: Partial<RowDraft>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const handleCreate = async () => {
    setSaving(true);
    setResult(null);
    setMessage(null);
    try {
      const outcome = await bulkRegisterUsers(validRows);
      setResult(outcome.ok ? "created" : "error");
      setMessage(outcome.ok ? "Users registered successfully." : outcome.message);
      if (outcome.ok) {
        setCreatedRows(validRows);
        setSkippedRows([]);
        setRows([]);
        setFileName(null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      role="system_admin"
      title="Bulk Register Users"
      description="Import a CSV of staff accounts. Duplicate emails are skipped automatically."
    >
      <PageSection
        title="Import a spreadsheet"
        description="Expected columns: first_name, last_name, email, role, password. Role defaults to learner and a policy-compliant password is generated when left blank."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" />
            Download template
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Choose CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readFile(file);
            }}
          />
          {fileName ? <Badge variant="green">{fileName}</Badge> : null}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Paste or import a CSV with a header row. Roles accepted:{" "}
          {ROLES.map((role) => ROLE_LABELS[role]).join(", ")}.
        </p>
      </PageSection>

      {rows.length === 0 ? (
        <EmptyState
          title="No rows loaded"
          description="Choose a CSV file above to preview its contents before creating accounts."
        />
      ) : (
        <PageSection
          title={`Preview (${rows.length} rows, ${validRows.length} valid)`}
          description="Review and tweak the imported records before registering them."
        >
          <Table columns={["First name", "Last name", "Email", "Role", "Password", ""]}>
            {rows.map((row) => {
              const valid = VALID_EMAIL.test(row.email.trim());
              return (
                <tr key={row.key}>
                  <Td>
                    <input
                      value={row.firstName}
                      onChange={(event) => patchRow(row.key, { firstName: event.target.value })}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-300"
                    />
                  </Td>
                  <Td>
                    <input
                      value={row.lastName}
                      onChange={(event) => patchRow(row.key, { lastName: event.target.value })}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-300"
                    />
                  </Td>
                  <Td>
                    <input
                      value={row.email}
                      onChange={(event) => patchRow(row.key, { email: event.target.value })}
                      className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-300"
                    />
                    {!valid ? (
                      <p className="mt-0.5 text-[10px] text-red-500">Invalid email</p>
                    ) : null}
                  </Td>
                  <Td>
                    <select
                      value={row.role}
                      onChange={(event) =>
                        patchRow(row.key, { role: event.target.value as Role })
                      }
                      className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-300"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <input
                      value={row.password}
                      placeholder="auto-generate"
                      onChange={(event) => patchRow(row.key, { password: event.target.value })}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-300"
                    />
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Td>
                </tr>
              );
            })}
          </Table>

          {message ? (
            <div
              className={
                result === "created"
                  ? "rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700"
                  : "rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700"
              }
            >
              {message}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={validRows.length === 0 || saving}
              onClick={handleCreate}
            >
              {saving ? (
                "Registering…"
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Register {validRows.length} user{validRows.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        </PageSection>
      )}

      {result === "created" ? (
        <PageSection
          title="Registration summary"
          description="Below is the confirmation of the records created."
        >
          <Table columns={["Name", "Email", "Role"]}>
            {createdRows.map((row, index) => (
              <tr key={`${row.key}-${index}`}>
                <Td>
                  <span className="font-medium text-slate-800">
                    {row.firstName} {row.lastName}
                  </span>
                </Td>
                <Td>{row.email}</Td>
                <Td>
                  <Badge variant="outline">{ROLE_LABELS[row.role]}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
          {skippedRows.length > 0 ? (
            <p className="text-xs text-amber-600">
              {skippedRows.length} row(s) skipped because the email was already registered or
              invalid.
            </p>
          ) : null}
        </PageSection>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
        <UploadCloud className="h-4 w-4 shrink-0 text-indigo-500" />
        Passwords left blank are auto-generated, meet the 8-character letter+number policy, and are
        returned once in the API response so the administrator can copy them.
      </div>
    </PageShell>
  );
}