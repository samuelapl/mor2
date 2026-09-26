import { useColorScheme } from 'react-native';

/**
 * Hex tokens for places that can't take Tailwind classes (icons, navigation theme, SVG).
 * Keep in sync with tailwind.config.js and the web app (frontend/tailwind.config.ts).
 */
export const palette = {
  brand50: '#eef2ff',
  brand100: '#e0e7ff',
  brand500: '#6366f1',
  brand600: '#4f46e5',
  brand700: '#4338ca',
  accent600: '#7c3aed',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  white: '#ffffff',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryContrast: string;
  track: string;
  success: string;
  warning: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  background: palette.slate50,
  surface: palette.white,
  border: palette.slate200,
  text: palette.slate900,
  textMuted: palette.slate500,
  primary: palette.brand600,
  primaryContrast: palette.white,
  track: palette.slate200,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
};

export const darkColors: ThemeColors = {
  background: palette.slate900,
  surface: palette.slate800,
  border: palette.slate700,
  text: palette.slate50,
  textMuted: palette.slate400,
  primary: palette.brand500,
  primaryContrast: palette.white,
  track: palette.slate700,
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export function useThemeColors(): ThemeColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
