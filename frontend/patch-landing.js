const fs = require('fs');

const file = 'C:/Users/HP/Desktop/MoR LMS/MoR LMS/mor2/frontend/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Header imports
if (!content.includes('ThemeToggle')) {
  content = content.replace(
    `import { LanguageToggle } from '@/components/shared/LanguageToggle';`,
    `import LanguageToggle from '@/components/shared/LanguageToggle';\nimport { ThemeToggle } from '@/components/shared/ThemeToggle';`
  );
}

// lang extraction
content = content.replace(
  `const { tBilingual } = useTranslation();`,
  `const { tBilingual, lang } = useTranslation();`
);

// Toggle insertion
content = content.replace(
  `<LanguageToggle />`,
  `<LanguageToggle />\n            <ThemeToggle isAmharic={lang === 'am'} />`
);

// main wrapper
content = content.replace(
  `bg-white text-slate-600`,
  `bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 transition-colors duration-200`
);
content = content.replace(
  `bg-hero-gradient opacity-70`,
  `bg-hero-gradient opacity-70 dark:opacity-30`
);

// Header
content = content.replace(
  `border-slate-200/80 bg-white/80`,
  `border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80`
);
content = content.replace(
  `text-slate-900`,
  `text-slate-900 dark:text-white`
).replace(
  `text-[10px] text-slate-500`,
  `text-[10px] text-slate-500 dark:text-slate-400`
);
content = content.replace(
  /text-slate-500 transition-colors hover:text-slate-900/g,
  `text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-200`
);
content = content.replace(
  `bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50`,
  `bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700`
);

// Hero
content = content.replace(
  `border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-600`,
  `border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400`
);
content = content.replace(
  `text-slate-900 sm:text-6xl`,
  `text-slate-900 dark:text-white sm:text-6xl`
);
content = content.replace(
  `text-slate-500 sm:text-lg`,
  `text-slate-500 dark:text-slate-400 sm:text-lg`
);
content = content.replace(
  `border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50`,
  `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800`
);
content = content.replace(
  `text-xs text-slate-500`,
  `text-xs text-slate-500 dark:text-slate-400`
);

// Roles Band
content = content.replace(
  `border-y border-slate-200 bg-slate-50 px-6 py-16`,
  `border-y border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 px-6 py-16`
);
content = content.replace(
  `text-slate-900 sm:text-3xl`,
  `text-slate-900 dark:text-white sm:text-3xl`
);
content = content.replace(
  `border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md`,
  `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md`
);
content = content.replace(
  `font-semibold text-slate-900`,
  `font-semibold text-slate-900 dark:text-slate-200`
);
content = content.replace(
  `text-xs leading-relaxed text-slate-500`,
  `text-xs leading-relaxed text-slate-500 dark:text-slate-400`
);

// How it works
content = content.replace(
  `border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md`,
  `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md`
);

// FAQ
content = content.replace(
  `border-y border-slate-200 bg-slate-50 px-6 py-20`,
  `border-y border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 px-6 py-20`
);
content = content.replace(
  `border-slate-200 bg-white hover:bg-slate-50`,
  `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900`
);
content = content.replace(
  `border-indigo-200 bg-indigo-50/50 shadow-md`,
  `border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md`
);

// CTA
content = content.replace(
  `border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50`,
  `border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50 dark:from-indigo-950/40 via-violet-50 dark:via-violet-950/40 to-fuchsia-50 dark:to-fuchsia-950/40`
);
content = content.replace(
  `bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:bg-slate-800`,
  `bg-slate-900 dark:bg-slate-100 px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 transition-all duration-200 hover:bg-slate-800 dark:hover:bg-white`
);
content = content.replace(
  `border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50`,
  `border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800`
);

// Footer
content = content.replace(
  `border-t border-slate-200 px-6 py-10`,
  `border-t border-slate-200 dark:border-slate-800 px-6 py-10`
);

fs.writeFileSync(file, content);
console.log('Done replacing classes');
