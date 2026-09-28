import { colorScheme as nwColorScheme, useColorScheme } from 'nativewind';
import { useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { preferencesStorage } from '../storage/kv-storage';

const THEME_KEY = 'theme_preference';

export type ThemePreference = 'light' | 'dark' | 'system';

export function getSavedThemePreference(): ThemePreference {
  const saved = preferencesStorage.getString(THEME_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

/** Initializes the theme preference from storage on app startup. */
export function initTheme(): void {
  const saved = getSavedThemePreference();
  if (saved === 'light' || saved === 'dark') {
    nwColorScheme.set(saved);
  }
}

export function useAppTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const systemScheme = useSystemColorScheme();

  const activeScheme: 'light' | 'dark' = (colorScheme ?? systemScheme ?? 'light') as 'light' | 'dark';
  const isDark = activeScheme === 'dark';

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    preferencesStorage.set(THEME_KEY, next);
    setColorScheme(next);
  }, [isDark, setColorScheme]);

  const setTheme = useCallback(
    (preference: ThemePreference) => {
      preferencesStorage.set(THEME_KEY, preference);
      setColorScheme(preference);
    },
    [setColorScheme],
  );

  return {
    isDark,
    colorScheme: activeScheme,
    toggleTheme,
    setTheme,
  };
}
