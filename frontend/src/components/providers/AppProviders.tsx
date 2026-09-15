"use client";

import type { ReactNode } from "react";
import { LmsProvider } from "@/lib/lms-store";

export default function AppProviders({ children }: { children: ReactNode }) {
  return <LmsProvider>{children}</LmsProvider>;
}
