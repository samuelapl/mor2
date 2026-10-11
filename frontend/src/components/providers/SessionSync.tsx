'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useLocaleStore } from '@/lib/stores/locale-store';

/**
 * Restores the saved language, starts the auth session (stored-token restore,
 * refresh/401 handlers) and keeps the
 * signed-in user's permissions fresh. Renders nothing.
 */
export function SessionSync() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const refreshPermissions = useAuthStore((s) => s.refreshPermissions);

  useEffect(() => {
    useLocaleStore.getState().hydrate();
    useAuthStore.getState().initAuth();
  }, []);

  // Live permission sync: whenever permissions change or every ~10s, sync current user permissions
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      void refreshPermissions();
    }, 10000);

    const handlePermissionsEvent = () => {
      void refreshPermissions();
    };

    window.addEventListener('mor_permissions_updated', handlePermissionsEvent);
    window.addEventListener('storage', handlePermissionsEvent);
    window.addEventListener('focus', handlePermissionsEvent);

    return () => {
      clearInterval(timer);
      window.removeEventListener('mor_permissions_updated', handlePermissionsEvent);
      window.removeEventListener('storage', handlePermissionsEvent);
      window.removeEventListener('focus', handlePermissionsEvent);
    };
  }, [currentUser, refreshPermissions]);

  return null;
}
