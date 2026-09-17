"use client";

import { useState } from "react";
import { HelpCircle, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import AccountModal from "./AccountModal";
import HelpSupport from "./HelpSupport";

interface AccountMenuProps {
  collapsed?: boolean;
}

export default function AccountMenu({ collapsed = false }: AccountMenuProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAccountOpen(true)}
        title={collapsed ? "Account" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900",
          collapsed && "justify-center px-0",
        )}
      >
        <UserIcon className="h-4 w-4 shrink-0" />
        {!collapsed ? "Account" : null}
      </button>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        title={collapsed ? "Help & Support" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900",
          collapsed && "justify-center px-0",
        )}
      >
        <HelpCircle className="h-4 w-4 shrink-0" />
        {!collapsed ? "Help & Support" : null}
      </button>
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      <HelpSupport open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
