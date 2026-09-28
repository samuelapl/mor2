import { colorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { getSavedThemePreference } from './theme-store';

/**
 * With `darkMode: 'class'`, web `dark:` styles apply only when <html> has the `dark` class.
 * Mirror the browser's prefers-color-scheme onto NativeWind if no explicit preference is set.
 * No-op on iOS/Android (NativeWind follows the system there by default).
 */
export function useWebColorSchemeSync(): void {
  const system = useColorScheme();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const saved = getSavedThemePreference();
    if (saved === 'system') {
      colorScheme.set(system === 'dark' ? 'dark' : 'light');
    }
  }, [system]);
}
