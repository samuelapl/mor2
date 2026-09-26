import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type { Locale } from '@/core/api/types';
import type { ApiUser, MessageResponse } from '@/features/auth';

/** Allowed PATCH /users/me fields (spec §2.7) — nothing else may be sent. */
export interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: Locale;
  tin?: string;
  avatarUrl?: string;
  primaryVenueId?: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export const profileApi = {
  getMe: () => api.get<ApiUser>(endpoints.users.me),
  updateMe: (body: UpdateProfileBody) => api.patch<ApiUser>(endpoints.users.me, body),
  changePassword: (body: ChangePasswordBody) =>
    api.post<MessageResponse>(endpoints.users.changePassword, body),
  uploadAvatar: (file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } file descriptors.
    form.append('file', file as unknown as Blob);
    return api.upload<{ avatarUrl: string }>(endpoints.files.avatar, form);
  },
};
