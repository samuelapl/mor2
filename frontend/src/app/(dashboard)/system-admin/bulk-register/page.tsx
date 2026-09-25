"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Download, Trash2, UploadCloud, UserPlus } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/lib/usePagination";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ROLE_LABELS, ROLES } from "@/constants/roles";
import { isValidEmail, passwordIssues } from "@/constants/auth";
import { fetchRolesWithPermissions } from "@/lib/api/permissions";
import { roleToApi } from "@/lib/api/transform";
import type { BulkCreateUserResultRow } from "@/lib/api/types";
import { toast } from "@/lib/toast";

interface RowDraft {
  key: string;
  /** 1-based line in the imported file, so errors can point back to it. */
  line: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tin: string;
  /** Backend role name when recognised, otherwise the raw text from the file. */
  role: string;
  password: string;
}

interface RoleOption {
  name: string;
  label: string;
}

interface SkippedRow {
  line: number;
  email: string;
  reason: string;
}

type ColumnKey = "firstName" | "lastName" | "email" | "phone" | "password" | "tin" | "role";

const TEMPLATE_HEADER = "first_name,last_name,email,phone,password,tin,role";

/** Header aliases, compared after lower-casing and stripping everything but letters/digits. */
const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  firstName: ["firstname", "first", "givenname"],
  lastName: ["lastname", "last", "surname", "familyname"],
  email: ["email", "emailaddress", "mail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "telephone"],
  password: ["password"],
  tin: ["tin", "tinnumber", "taxpayeridentificationnumber"],
  role: ["role"],
};

const REQUIRED_COLUMNS: ColumnKey[] = ["firstName", "lastName", "email", "phone"];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  firstName: "first_name",
  lastName: "last_name",
  email: "email",
  phone: "phone",
  password: "password",
  tin: "tin",
  role: "role",
};

const DEFAULT_ROLE = "LEARNER";

const BUILT_IN_ROLE_OPTIONS: RoleOption[] = ROLES.map((role) => ({
  name: roleToApi(role),
  label: ROLE_LABELS[role],
}));

const cellInputClass =
  "rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-300";

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

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCsv(fileName: string, lines: string[]) {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Maps each known column to its index in the header row. */
function mapHeader(header: string[]): Partial<Record<ColumnKey, number>> {
  const indexes: Partial<Record<ColumnKey, number>> = {};
  header.forEach((cell, index) => {
    const key = normalizeKey(cell);
    const column = (Object.keys(COLUMN_ALIASES) as ColumnKey[]).find((candidate) =>
      COLUMN_ALIASES[candidate].includes(key),
    );
    if (column && indexes[column] === undefined) indexes[column] = index;
  });
  return indexes;
}

/** Accepts a role's backend name (LEARNER), frontend code (learner) or label (Learner). */
function resolveRole(value: string, options: RoleOption[]): string {
  const key = normalizeKey(value);
  if (!key) return DEFAULT_ROLE;
  const match = options.find(
    (option) => normalizeKey(option.name) === key || normalizeKey(option.label) === key,
  );
  return match?.name ?? value.trim();
}

function rowErrors(row: RowDraft, roleNames: Set<string>): string[] {
  const errors: string[] = [];
  if (!row.firstName.trim()) errors.push("First name is required");
  if (!row.lastName.trim()) errors.push("Last name is required");
  if (!isValidEmail(row.email.trim())) errors.push("Invalid email");
  if (!row.phone.trim()) errors.push("Phone is required");
  if (row.password.trim()) {
    const issue = passwordIssues(row.password);
    if (issue) errors.push(issue);
  }
  if (!roleNames.has(row.role)) errors.push(`Unknown role "${row.role}"`);
  return errors;
}

export default function BulkRegisterPage() {
  const { bulkRegisterUsers } = useLms();
  const { tBilingual } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const { page, totalPages, setPage, pageItems } = usePagination(rows, 10);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<"created" | "error" | null>(null);
  const [createdRows, setCreatedRows] = useState<BulkCreateUserResultRow[]>([]);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[]>([]);
  const [saving, setSaving] = useState(false);
  /** Row keys ticked for registration; every row starts ticked when a file loads. */
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>(BUILT_IN_ROLE_OPTIONS);

  // Custom roles live in the backend; fall back to the built-in list when the caller
  // lacks `role.view`.
  useEffect(() => {
    let cancelled = false;
    fetchRolesWithPermissions()
      .then((roles) => {
        if (cancelled || roles.length === 0) return;
        setRoleOptions(roles.map((role) => ({ name: role.name, label: role.label || role.name })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const roleNames = useMemo(() => new Set(roleOptions.map((role) => role.name)), [roleOptions]);
  const roleLabel = (name: string) =>
    roleOptions.find((role) => role.name === name)?.label ?? name;

  const errorsByKey = useMemo(
    () => new Map(rows.map((row) => [row.key, rowErrors(row, roleNames)])),
    [rows, roleNames],
  );
  const readyRows = useMemo(
    () => rows.filter((row) => (errorsByKey.get(row.key) ?? []).length === 0),
    [rows, errorsByKey],
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedKeys.has(row.key)),
    [rows, selectedKeys],
  );
  // Only ticked rows without errors are sent.
  const submitRows = useMemo(
    () => readyRows.filter((row) => selectedKeys.has(row.key)),
    [readyRows, selectedKeys],
  );
  const selectedWithErrors = selectedRows.length - submitRows.length;
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(rows.map((row) => row.key)));
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Excel prepends a byte-order mark to UTF-8 CSVs.
      const text = String(reader.result ?? "").replace(/^﻿/, "");
      const grid = parseCsv(text);
      setFileName(file.name);
      setResult(null);
      setMessage(null);
      setRows([]);
      setSelectedKeys(new Set());

      if (grid.length === 0) {
        setFileError("The file is empty.");
        return;
      }
      const columns = mapHeader(grid[0]);
      const missing = REQUIRED_COLUMNS.filter((column) => columns[column] === undefined);
      if (missing.length > 0) {
        setFileError(
          `Missing required column(s): ${missing.map((c) => COLUMN_LABELS[c]).join(", ")}. ` +
            "The first row must be a header row — download the template to see the format.",
        );
        return;
      }

      const cell = (cells: string[], column: ColumnKey) => {
        const index = columns[column];
        return index === undefined ? "" : (cells[index] ?? "").trim();
      };

      const stamp = Date.now();
      const parsed: RowDraft[] = [];
      for (let i = 1; i < grid.length; i++) {
        const cells = grid[i];
        if (cells.every((value) => !value.trim())) continue;
        parsed.push({
          key: `row-${i}-${stamp}`,
          line: i + 1,
          firstName: cell(cells, "firstName"),
          lastName: cell(cells, "lastName"),
          email: cell(cells, "email"),
          phone: cell(cells, "phone"),
          tin: cell(cells, "tin"),
          role: resolveRole(cell(cells, "role"), roleOptions),
          password: cell(cells, "password"),
        });
      }
      setFileError(parsed.length === 0 ? "The file has a header row but no users." : null);
      setRows(parsed);
      setSelectedKeys(new Set(parsed.map((row) => row.key)));
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    downloadCsv("bulk-register-template.csv", [
      TEMPLATE_HEADER,
      "Abebe,Kebede,abebe.kebede@mor.gov.et,+251911000000,Welcome2026,0012345678,learner",
      "Sara,Ahmed,sara.ahmed@mor.gov.et,+251922000000,,,trainer",
    ]);
  };

  const downloadCredentials = () => {
    downloadCsv("registered-users.csv", [
      "first_name,last_name,email,phone,role,password",
      ...createdRows.map((row) =>
        [row.firstName, row.lastName, row.email, row.phone ?? "", roleLabel(row.role), row.password]
          .map(toCsvCell)
          .join(","),
      ),
    ]);
  };

  const patchRow = (key: string, patch: Partial<RowDraft>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const handleCreate = async () => {
    const submitted = submitRows;
    setSaving(true);
    try {
      const outcome = await bulkRegisterUsers(
        submitted.map((row) => ({
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email.trim(),
          phone: row.phone.trim(),
          tin: row.tin.trim() || undefined,
          role: row.role,
          password: row.password.trim() ? row.password : undefined,
        })),
      );
      if (!outcome.ok) {
        setResult("error");
        setMessage(outcome.message);
        toast.error(outcome.message || "Failed to register users.");
        return;
      }

      const { created, skipped, totals } = outcome.result;
      // The API reports `row` as the 1-based position in the submitted array.
      const createdKeys = new Set(created.map((row) => submitted[row.row - 1]?.key));
      setCreatedRows(created);
      setSkippedRows(
        skipped.map((row) => ({
          line: submitted[row.row - 1]?.line ?? row.row,
          email: row.email,
          reason: row.reason,
        })),
      );
      // Keep skipped and not-yet-valid rows in the preview so they can be fixed and resent.
      setRows((prev) => prev.filter((row) => !createdKeys.has(row.key)));
      setResult("created");
      const summary =
        `${totals.created} user${totals.created === 1 ? "" : "s"} registered` +
        (totals.skipped > 0 ? `, ${totals.skipped} skipped.` : ".");
      setMessage(summary);
      if (totals.created > 0) toast.success(summary);
      else toast.warning(summary);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      role="system_admin"
      title={tBilingual("Bulk Register Users", "ተጠቃሚዎችን በብዛት መዝግብ")}
      description={tBilingual(
        "Import a CSV of user accounts. Accounts are created approved and active; duplicate emails are skipped.",
        "የተጠቃሚዎችን ዝርዝር በ CSV ፋይል ያስመጡ። መለያዎች በቀጥታ የጸደቁና ንቁ ሆነው ይፈጠራሉ፤ የተደገሙ ኢሜይሎች ይታለፋሉ።"
      )}
    >
      <PageSection
        title={tBilingual("Import a spreadsheet", "የተጠቃሚዎችን ሰነድ አስመጣ")}
        description={tBilingual(
          "Columns: first_name, last_name, email, phone (required) and password, tin, role (optional). A blank password is auto-generated, a blank role means Learner.",
          "አምዶች፡ first_name፣ last_name፣ email፣ phone (ግዴታ) እና password፣ tin፣ role (አማራጭ)። ባዶ ይለፍ ቃል በራሱ ይፈጠራል፤ ባዶ ሚና ማለት ተማሪ ነው።"
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" />
            {tBilingual("Download template", "የቅጽ አብነት አውርድ")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {tBilingual("Choose CSV", "CSV ፋይል ምረጥ")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) readFile(file);
              // Allow choosing the same file again after fixing it.
              event.target.value = "";
            }}
          />
          {fileName ? <Badge variant={fileError ? "red" : "green"}>{fileName}</Badge> : null}
        </div>
        {fileError ? (
          <div className="mt-3 rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700">
            {fileError}
          </div>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">
          {tBilingual(
            `Columns are matched by header name, so their order doesn't matter. Roles accepted: ${roleOptions.map((role) => role.label).join(", ")}. Tip: if you edit the file in Excel, format the phone and tin columns as Text so leading zeros are kept.`,
            `አምዶች በስሞቻቸው ስለሚዛመዱ ቅደም ተከተላቸው ለውጥ አያመጣም። ተቀባይነት ያላቸው ሚናዎች፡ ${roleOptions.map((role) => role.label).join(", ")}። ፍንጭ፡ ፋይሉን በ Excel ካስተካከሉ፣ የመነሻ ዜሮዎች እንዳይጠፉ የስልክ እና የግብር መለያ ቁጥር (TIN) አምዶችን እንደ Text ይቅረጹ።`
          )}
        </p>
      </PageSection>

      {rows.length === 0 ? (
        result ? null : (
          <EmptyState
            title={tBilingual("No rows loaded", "ምንም ረድፎች አልተጫኑም")}
            description={tBilingual(
              "Choose a CSV file above to preview its contents before creating accounts.",
              "መለያዎችን ከመፍጠርዎ በፊት ይዘቱን ለመገምገም ከላይ የ CSV ፋይል ይምረጡ።"
            )}
          />
        )
      ) : (
        <PageSection
          title={tBilingual(
            `Preview (${rows.length} rows, ${readyRows.length} ready, ${selectedRows.length} selected)`,
            `ቅድመ-ዕይታ (${rows.length} ረድፎች፣ ${readyRows.length} ዝግጁ፣ ${selectedRows.length} የተመረጡ)`
          )}
          description={tBilingual(
            "Review and fix the imported records, then tick the rows to register. Rows with errors are not sent.",
            "የገቡትን መረጃዎች ይገምግሙና ያርሙ፣ ከዚያም የሚመዘገቡትን ረድፎች ይምረጡ። ስህተት ያለባቸው ረድፎች አይላኩም።"
          )}
        >
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedKeys(new Set(rows.map((row) => row.key)))}
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {tBilingual("Select all", "ሁሉንም ምረጥ")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedKeys(new Set(readyRows.map((row) => row.key)))}
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {tBilingual("Select ready only", "ዝግጁ የሆኑትን ብቻ ምረጥ")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedKeys(new Set())}
              className="font-semibold text-slate-500 hover:text-slate-700"
            >
              {tBilingual("Clear selection", "ምርጫን አጽዳ")}
            </button>
          </div>
          <Table
            columns={[
              {
                name: "select",
                className: "w-10",
                label: (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                  />
                ),
              },
              tBilingual("Line", "መስመር"),
              tBilingual("First name", "ስም"),
              tBilingual("Last name", "የአባት ስም"),
              tBilingual("Email", "ኢሜይል"),
              tBilingual("Phone", "ስልክ"),
              tBilingual("TIN", "የግብር መለያ"),
              tBilingual("Role", "ሚና"),
              tBilingual("Password", "የይለፍ ቃል"),
              "",
            ]}
          >
            {pageItems.map((row) => {
              const errors = errorsByKey.get(row.key) ?? [];
              const roleKnown = roleNames.has(row.role);
              return (
                <tr
                  key={row.key}
                  className={
                    errors.length > 0
                      ? "bg-red-50/40"
                      : selectedKeys.has(row.key)
                        ? undefined
                        : "opacity-60"
                  }
                >
                  <Td className="w-10 align-top">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(row.key)}
                      onChange={() => toggleRow(row.key)}
                      aria-label={`Select line ${row.line}`}
                      className="mt-1.5 h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                    />
                  </Td>
                  <Td className="align-top text-xs text-slate-400">{row.line}</Td>
                  <Td className="align-top">
                    <input
                      value={row.firstName}
                      onChange={(event) => patchRow(row.key, { firstName: event.target.value })}
                      className={`w-28 ${cellInputClass}`}
                    />
                    {errors.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {errors.map((error) => (
                          <li key={error} className="whitespace-nowrap text-[10px] text-red-500">
                            {error}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Td>
                  <Td className="align-top">
                    <input
                      value={row.lastName}
                      onChange={(event) => patchRow(row.key, { lastName: event.target.value })}
                      className={`w-28 ${cellInputClass}`}
                    />
                  </Td>
                  <Td className="align-top">
                    <input
                      value={row.email}
                      onChange={(event) => patchRow(row.key, { email: event.target.value })}
                      className={`w-44 ${cellInputClass}`}
                    />
                  </Td>
                  <Td className="align-top">
                    <input
                      value={row.phone}
                      onChange={(event) => patchRow(row.key, { phone: event.target.value })}
                      className={`w-32 ${cellInputClass}`}
                    />
                  </Td>
                  <Td className="align-top">
                    <input
                      value={row.tin}
                      placeholder={tBilingual("optional", "አማራጭ")}
                      onChange={(event) => patchRow(row.key, { tin: event.target.value })}
                      className={`w-28 ${cellInputClass}`}
                    />
                  </Td>
                  <Td className="align-top">
                    <select
                      value={row.role}
                      onChange={(event) => patchRow(row.key, { role: event.target.value })}
                      className={`w-40 py-1.5 ${cellInputClass}`}
                    >
                      {!roleKnown ? (
                        <option value={row.role} disabled>
                          {tBilingual("Unknown:", "ያልታወቀ:")} {row.role}
                        </option>
                      ) : null}
                      {roleOptions.map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td className="align-top">
                    <input
                      value={row.password}
                      placeholder={tBilingual("auto-generate", "በራሱ ይፍጠር")}
                      onChange={(event) => patchRow(row.key, { password: event.target.value })}
                      className={`w-28 ${cellInputClass}`}
                    />
                  </Td>
                  <Td className="text-right align-top">
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

          {rows.length > 10 && (
            <div className="mt-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={rows.length}
                pageSize={10}
              />
            </div>
          )}

          {message && result === "error" ? (
            <div className="rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-2.5 text-sm text-red-700">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {selectedWithErrors > 0 ? (
              <span className="text-xs text-amber-700">
                {tBilingual(
                  `${selectedWithErrors} selected row${selectedWithErrors === 1 ? " has" : "s have"} errors and won't be sent until fixed.`,
                  `${selectedWithErrors} የተመረጡ ረድፎች ስህተት ስላላቸው እስኪስተካከሉ ድረስ አይላኩም።`
                )}
              </span>
            ) : null}
            <Button
              type="button"
              isLoading={saving}
              loadingText={tBilingual("Registering users…", "ተጠቃሚዎችን በመመዝገብ ላይ…")}
              disabled={submitRows.length === 0}
              onClick={handleCreate}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              {tBilingual(
                `Register ${submitRows.length} selected user${submitRows.length === 1 ? "" : "s"}`,
                `${submitRows.length} የተመረጡ ተጠቃሚዎችን መዝግብ`
              )}
            </Button>
          </div>
        </PageSection>
      )}

      {createdRows.length > 0 ? (
        <PageSection
          title={tBilingual("Registration summary", "የምዝገባ ማጠቃለያ")}
          description={message ?? tBilingual("Below is the confirmation of the records created.", "ከዚህ በታች የተፈጠሩት መረጃዎች ማረጋገጫ ቀርቧል።")}
        >
          {createdRows.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-2.5 text-sm text-amber-800">
                <span>
                  {tBilingual(
                    "Passwords are shown only once. Download the credentials now and share them securely with each user.",
                    "የይለፍ ቃሎች የሚታዩት አንድ ጊዜ ብቻ ነው። የመግቢያ መረጃዎችን አሁን አውርደው ለእያንዳንዱ ተጠቃሚ በጥንቃቄ ያጋሩ።"
                  )}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={downloadCredentials}>
                  <Download className="h-3.5 w-3.5" />
                  {tBilingual("Download credentials CSV", "የይለፍ ቃሎችን CSV አውርድ")}
                </Button>
              </div>
              <Table
                columns={[
                  tBilingual("Name", "ስም"),
                  tBilingual("Email", "ኢሜይል"),
                  tBilingual("Phone", "ስልክ"),
                  tBilingual("TIN", "የግብር መለያ"),
                  tBilingual("Role", "ሚና"),
                  tBilingual("Password", "የይለፍ ቃል"),
                ]}
              >
                {createdRows.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <span className="font-medium text-slate-800">
                        {row.firstName} {row.lastName}
                      </span>
                    </Td>
                    <Td>{row.email}</Td>
                    <Td>{row.phone ?? "—"}</Td>
                    <Td>{row.tin ?? "—"}</Td>
                    <Td>
                      <Badge variant="outline">{roleLabel(row.role)}</Badge>
                    </Td>
                    <Td>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{row.password}</code>
                    </Td>
                  </tr>
                ))}
              </Table>
            </>
          ) : null}
          {skippedRows.length > 0 ? (
            <>
              <p className="text-sm font-medium text-amber-700">
                {tBilingual(
                  `${skippedRows.length} row(s) skipped — they are still in the preview above so you can fix and resend them.`,
                  `${skippedRows.length} ረድፍ(ፎች) ታልፈዋል — ከላይ ባለው ቅድመ-ዕይታ ውስጥ ስላሉ አስተካክለው እንደገና መላክ ይችላሉ።`
                )}
              </p>
              <Table
                columns={[
                  tBilingual("Line", "መስመር"),
                  tBilingual("Email", "ኢሜይል"),
                  tBilingual("Reason", "ምክንያት"),
                ]}
              >
                {skippedRows.map((row) => (
                  <tr key={`${row.line}-${row.email}`}>
                    <Td className="text-xs text-slate-400">{row.line}</Td>
                    <Td>{row.email}</Td>
                    <Td className="text-red-600">{row.reason}</Td>
                  </tr>
                ))}
              </Table>
            </>
          ) : null}
        </PageSection>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
        <UploadCloud className="h-4 w-4 shrink-0 text-indigo-500" />
        {tBilingual(
          "Passwords left blank are auto-generated to meet the password policy. On first sign-in, each user receives an emailed code and must set their own password. Up to 500 users per import.",
          "ባዶ የቀሩ የይለፍ ቃሎች የደህንነት ፖሊሲውን እንዲያሟሉ በራሳቸው ይፈጠራሉ። በመጀመሪያው መግቢያ ላይ እያንዳንዱ ተጠቃሚ በኢሜይል ኮድ ይደርሰዋል እንዲሁም የራሱን የይለፍ ቃል ማዘጋጀት አለበት። በአንድ ጊዜ እስከ 500 ተጠቃሚዎች ይቻላል።"
        )}
      </div>
    </PageShell>
  );
}
