/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' (not 'media'): NativeWind's web runtime throws on 'media' when its stylesheet loads.
  // Native still follows the system theme; on web useWebColorSchemeSync mirrors the OS setting.
  darkMode: 'class',
  theme: {
    extend: {
      // Brand tokens mirror the web app (frontend/tailwind.config.ts): indigo → violet on slate.
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          500: '#a855f7',
          600: '#7c3aed',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          dark: '#0f172a',
          'dark-muted': '#1e293b',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
