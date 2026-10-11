// Shared by the theme store and the root layout (a server component), so it has no 'use client'.

export const THEME_STORAGE_KEY = 'mor_theme';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

// Injected in <head> to prevent flash — runs before React hydrates
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia('${DARK_QUERY}').matches);if(dark)document.documentElement.classList.add('dark');}catch(e){}})();`;
