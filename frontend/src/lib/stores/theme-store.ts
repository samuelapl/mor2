'use client';

import { create } from 'zustand';

import { DARK_QUERY, THEME_STORAGE_KEY } from '@/lib/theme-init';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

function parseTheme(value: string | null): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Toggles `dark` on <html>; the CSS variables in globals.css do the rest. */
function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

let hydrated = false;

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
}

interface ThemeActions {
  /** Restores the theme saved on this device and starts following OS and other-tab changes. Runs once per page load. */
  hydrate: () => void;
  /** Switches the theme on this device (saved to localStorage). */
  setTheme: (theme: Theme) => void;
}

export type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()((set, get) => {
  const apply = (theme: Theme) => {
    const resolvedTheme = resolveTheme(theme);
    applyResolvedTheme(resolvedTheme);
    set({ theme, resolvedTheme });
  };

  return {
    theme: 'system',
    resolvedTheme: 'light',

    hydrate: () => {
      if (hydrated || typeof window === 'undefined') return;
      hydrated = true;
      apply(getStoredTheme());

      // Reads the live store state, so picking "System" later still follows the OS.
      window.matchMedia(DARK_QUERY).addEventListener('change', () => {
        if (get().theme === 'system') apply('system');
      });

      // Another tab changed the theme.
      window.addEventListener('storage', (e) => {
        if (e.key === THEME_STORAGE_KEY || e.key === null) apply(getStoredTheme());
      });
    },

    setTheme: (theme) => {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
      apply(theme);
    },
  };
});
