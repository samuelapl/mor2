import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** `label` replaces the header text, e.g. with a select-all checkbox. */
export type TableColumn = string | { name: string; label?: ReactNode; className?: string };

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  columns: TableColumn[];
  children: ReactNode;
}

export function Table({ columns, children, className }: TableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs scrollbar-thin scrollbar-thumb-slate-200",
        className,
      )}
    >
      <table className="w-full text-left text-sm min-w-full">
        <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((column, idx) => {
              const name = typeof column === "string" ? column : column.name;
              const colClass = typeof column === "object" ? column.className : undefined;
              const label = typeof column === "object" && column.label !== undefined ? column.label : name;
              const isLast = idx === columns.length - 1;
              const isAction = name.toLowerCase() === "actions" || name === "";
              return (
                <th
                  key={`${name}-${idx}`}
                  className={cn(
                    "px-4 py-3 font-semibold whitespace-nowrap",
                    (isLast && isAction) ? "text-right" : "text-left",
                    colClass,
                  )}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-slate-700 transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-slate-50/60", className)}
      {...props}
    >
      {children}
    </tr>
  );
}