import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  columns: string[];
  children: ReactNode;
}

export function Table({ columns, children, className }: TableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-soft ring-super-soft",
        className,
      )}
    >
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200/70 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3.5 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/80">{children}</tbody>
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
        "px-4 py-3.5 align-middle text-slate-700 transition-colors",
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
      className={cn("transition-colors hover:bg-indigo-50/30", className)}
      {...props}
    >
      {children}
    </tr>
  );
}