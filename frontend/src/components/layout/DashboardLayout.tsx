import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50/70">
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-white">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50/50">{children}</main>
      </div>
    </div>
  );
}