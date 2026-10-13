'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

import { roleToApi } from '@/lib/api/transform';
import type { BulkCreateUserItem, BulkCreateUsersResult } from '@/lib/api/types';
import {
  assignRole,
  bulkCreateUsers,
  createActor,
  deactivateUser as apiDeactivateUser,
  reactivateUser as apiReactivateUser,
  deleteUser as apiDeleteUser,
  removeRole,
} from '@/lib/api/users';
import type { ActionResult, Role, User } from '@/types';

import { useAuthStore } from './auth-store';
import { reloadAll } from './session-data';
import { errorMessage, hasPermission } from './store-utils';

export interface RegisterActorInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role | string;
  phone?: string;
  primaryVenueId?: string;
  trainerType?: 'ONLINE' | 'IN_PERSON' | 'BOTH';
  mustChangePassword?: boolean;
}

export type BulkUserActionResult = { ok: false; message: string } | { ok: true; succeeded: number; failed: string[] };
export type BulkRegisterUsersResult = { ok: true; result: BulkCreateUsersResult } | { ok: false; message: string };

interface UserState {
  users: User[];
  /** id → full name, built from users, course owners/trainers and enrollments. */
  userNames: Record<string, string>;
}

interface UserActions {
  /** Looks up a name without subscribing — select `userNames` to re-render on changes. */
  userName: (userId: string) => string;
  changeUserRole: (userId: string, role: Role) => Promise<ActionResult>;
  deactivateUser: (userId: string) => Promise<ActionResult>;
  reactivateUser: (userId: string) => Promise<ActionResult>;
  deleteUser: (userId: string) => Promise<ActionResult>;
  /** Suspends or deletes several users, reloading once. Failures are reported per user. */
  bulkUserAction: (action: 'suspend' | 'delete', userIds: string[]) => Promise<BulkUserActionResult>;
  bulkRegisterUsers: (rows: BulkCreateUserItem[]) => Promise<BulkRegisterUsersResult>;
  registerActor: (input: RegisterActorInput) => Promise<ActionResult>;
  /** Drops the user-scoped data on sign-out. */
  reset: () => void;
}

export type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>()((set, get) => ({
  users: [],
  userNames: {},

  userName: (userId) => get().userNames[userId] ?? 'Unknown',

  changeUserRole: async (userId, role) => {
    const admin = useAuthStore.getState().currentUser;
    if (!admin || !hasPermission(admin, 'role.manage')) {
      return {
        ok: false,
        message: 'Only system administrators can change roles.',
      };
    }
    const user = get().users.find((item) => item.id === userId);
    if (!user) return { ok: false, message: 'User not found.' };
    if (user.role === role) return { ok: true };
    try {
      await assignRole(userId, roleToApi(role));
      if (user.role !== role) {
        try {
          await removeRole(userId, roleToApi(user.role));
        } catch {
          // the previous role may already be revoked by the API
        }
      }
      await reloadAll(admin);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to change role.'),
      };
    }
  },

  deactivateUser: async (userId) => {
    const admin = useAuthStore.getState().currentUser;
    if (!admin || !hasPermission(admin, 'user.manage')) {
      return { ok: false, message: 'You are not allowed to manage users.' };
    }
    try {
      await apiDeactivateUser(userId);
      await reloadAll(admin);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to deactivate user.'),
      };
    }
  },

  reactivateUser: async (userId) => {
    const admin = useAuthStore.getState().currentUser;
    if (!admin || !hasPermission(admin, 'user.manage')) {
      return { ok: false, message: 'You are not allowed to manage users.' };
    }
    try {
      await apiReactivateUser(userId);
      await reloadAll(admin);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to reactivate user.'),
      };
    }
  },

  deleteUser: async (userId) => {
    const admin = useAuthStore.getState().currentUser;
    if (!admin || !hasPermission(admin, 'user.manage')) {
      return { ok: false, message: 'You are not allowed to manage users.' };
    }
    try {
      await apiDeleteUser(userId);
      await reloadAll(admin);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to delete user.'),
      };
    }
  },

  bulkUserAction: async (action, userIds) => {
    const admin = useAuthStore.getState().currentUser;
    if (!admin || !hasPermission(admin, 'user.manage')) {
      return { ok: false, message: 'You are not allowed to manage users.' };
    }
    const run = action === 'suspend' ? apiDeactivateUser : apiDeleteUser;
    const failed: string[] = [];
    // A few requests at a time so a large selection doesn't flood the API.
    for (let i = 0; i < userIds.length; i += 5) {
      const batch = userIds.slice(i, i + 5);
      const results = await Promise.allSettled(batch.map((id) => run(id)));
      results.forEach((result, index) => {
        if (result.status === 'rejected') failed.push(batch[index]);
      });
    }
    await reloadAll(admin);
    return { ok: true, succeeded: userIds.length - failed.length, failed };
  },

  bulkRegisterUsers: async (rows) => {
    if (rows.length === 0) {
      return { ok: false, message: 'No users in the file.' };
    }
    try {
      const result = await bulkCreateUsers(
        rows.map((row) => ({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          tin: row.tin || undefined,
          role: row.role || undefined,
          password: row.password || undefined,
        })),
      );
      await reloadAll();
      return { ok: true, result };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to register users.'),
      };
    }
  },

  registerActor: async (input) => {
    try {
      await createActor({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        password: input.password,
        role: roleToApi(input.role),
        phone: input.phone || undefined,
        primaryVenueId: input.primaryVenueId || undefined,
        trainerType: input.trainerType || undefined,
        mustChangePassword: input.mustChangePassword,
      });
      await reloadAll();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: errorMessage(err, 'Failed to register user.'),
      };
    }
  },

  reset: () => set({ users: [], userNames: {} }),
}));

/** Memoized `userName` that re-renders the caller when `userNames` changes. */
export function useUserName(): (userId: string) => string {
  const userNames = useUserStore((s) => s.userNames);
  return useCallback((userId: string) => userNames[userId] ?? 'Unknown', [userNames]);
}
