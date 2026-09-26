import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect } from 'react';

import type { Locale } from '@/core/api/types';
import { useLocaleStore } from '@/core/i18n';
import { useSessionStore } from '@/features/auth';

import { profileApi, type ChangePasswordBody, type UpdateProfileBody } from '../api/profile-api';

export const profileKeys = {
  me: ['users', 'me'] as const,
};

/** GET /users/me — keeps the session's cached user in sync with the server. */
export function useMe() {
  const setUser = useSessionStore((s) => s.setUser);
  const query = useQuery({ queryKey: profileKeys.me, queryFn: profileApi.getMe });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  return query;
}

export function useUpdateProfile() {
  const setUser = useSessionStore((s) => s.setUser);
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => profileApi.updateMe(body),
    onSuccess: setUser,
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: ChangePasswordBody) => profileApi.changePassword(body) });
}

/** Switches the UI language immediately and saves it to the profile (spec §2.7 `locale`). */
export function useChangeLanguage() {
  const setLocale = useLocaleStore((s) => s.setLocale);
  const update = useUpdateProfile();
  return {
    change: (locale: Locale) => {
      setLocale(locale);
      update.mutate({ locale });
    },
    isPending: update.isPending,
  };
}

/** Picks a square photo and uploads it via POST /files/avatar (the backend also saves avatarUrl). */
export function useUploadAvatar() {
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);

  return useMutation({
    mutationFn: async (): Promise<string | null> => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('PHOTO_PERMISSION');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return null;

      const asset = result.assets[0];
      const type = asset.mimeType ?? 'image/jpeg';
      const extension = type.split('/')[1] ?? 'jpg';
      const { avatarUrl } = await profileApi.uploadAvatar({
        uri: asset.uri,
        name: asset.fileName ?? `avatar.${extension}`,
        type,
      });
      return avatarUrl;
    },
    onSuccess: (avatarUrl) => {
      if (avatarUrl && user) setUser({ ...user, avatarUrl });
    },
  });
}
