const fs = require('fs');

const file = 'C:/Users/HP/Desktop/MoR LMS/MoR LMS/mor2/frontend/src/components/ui/Pagination.tsx';
let content = fs.readFileSync(file, 'utf8');

// Container
content = content.replace(
  `border-slate-200/80 bg-white/95`,
  `border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95`
);

// Text
content = content.replace(
  `text-slate-500`,
  `text-slate-500 dark:text-slate-400`
);
// replace multiple occurrences
content = content.replace(/text-slate-800/g, `text-slate-800 dark:text-slate-200`);
content = content.replace(/text-slate-400/g, `text-slate-400 dark:text-slate-500`);

// Select dropdown
content = content.replace(
  `border-slate-200/90 pl-3`,
  `border-slate-200/90 dark:border-slate-800 pl-3`
);
content = content.replace(
  `border-slate-200/90 bg-slate-50/70 px-2 py-0 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10`,
  `border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-2 py-0 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none transition hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/10`
);

// Button wrappers
content = content.replace(/border-slate-200\/80 bg-white text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-50/g, `border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-50 dark:hover:bg-slate-800`);
content = content.replace(/border-slate-200\/80 bg-white/g, `border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900`);
content = content.replace(/hover:bg-slate-50 hover:text-slate-900/g, `hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white`);
content = content.replace(/hover:bg-slate-50 hover:text-slate-800/g, `hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200`);
content = content.replace(/text-slate-600/g, `text-slate-600 dark:text-slate-300`);

// Ellipsis buttons
content = content.replace(/hover:bg-slate-100 hover:text-slate-600/g, `hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300`);

// Numbered pill buttons
content = content.replace(
  `border border-transparent text-slate-600 dark:text-slate-300 hover:border-slate-200/80 hover:bg-slate-100 hover:text-slate-900 dark:hover:text-white`,
  `border border-transparent text-slate-600 dark:text-slate-300 hover:border-slate-200/80 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white`
);

// Mobile text
content = content.replace(
  `text-slate-700`,
  `text-slate-700 dark:text-slate-300`
);

fs.writeFileSync(file, content);
console.log('Done patch Pagination');
