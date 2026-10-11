'use client';

import type { User } from '@/types';

import { useAuthStore } from './auth-store';

type DataReloader = (user: User | null) => Promise<void>;

let reloader: DataReloader = async () => {};

/**
 * Registered by `LmsProvider` while the course/enrollment loading still lives there.
 * Phase 4 of ZUSTAND_MIGRATION_PLAN.md moves the loader itself into this file.
 */
export function setDataReloader(fn: DataReloader): void {
  reloader = fn;
}

/** Reloads courses, enrollments, users and names for `user` (defaults to the signed-in user). */
export function reloadAll(user: User | null = useAuthStore.getState().currentUser): Promise<void> {
  return reloader(user);
}
