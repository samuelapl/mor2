'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
interface ThemeCtx { theme: Theme; resolvedTheme: 'light' | 'dark'; setTheme: (t: Theme) => void; isDark: boolean; }

const ThemeContext = createContext<ThemeCtx>({ theme: 'system', resolvedTheme: 'light', setTheme: () => {}, isDark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolved] = useState<'light' | 'dark'>('light');

  const applyTheme = (t: Theme) => {
    const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    setResolved(dark ? 'dark' : 'light');
  };

  useEffect(() => {
    const stored = (localStorage.getItem('mor_theme') as Theme) ?? 'system';
    setThemeState(stored);
    applyTheme(stored);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (stored === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem('mor_theme', t);
    setThemeState(t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, isDark: resolvedTheme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// Injected in <head> to prevent flash — runs before React hydrates
export const themeInitScript = `(function(){try{var t=localStorage.getItem('mor_theme')||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');}catch(e){}})();`;
