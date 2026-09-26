import { colorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

/**
 * With `darkMode: 'class'`, web `dark:` styles apply only when <html> has the `dark` class.
 * Mirror the browser's prefers-color-scheme onto NativeWind so web follows the OS like native.
 * No-op on iOS/Android (NativeWind follows the system there by default).
 */
export function useWebColorSchemeSync(): void {
  const system = useColorScheme();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    colorScheme.set(system === 'dark' ? 'dark' : 'light');
  }, [system]);
}
